import { Injectable } from "@nestjs/common";
import { ContentType, XpReason } from "@prisma/generated/enums";
import { MedalModel, UserMedalModel, XpLedgerFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import {
  CONTENT_XP_BASE,
  LEVEL_MILESTONE_MEDAL_NAMES,
  LEVEL_MILESTONES,
  STREAK_BASE_XP,
  STREAK_MAX_MULTIPLIER,
  STREAK_STEP_XP,
  XP_RULES,
} from "@/shared/constants/xp";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { diffUtcDays, startOfUtcDay, utcDayKey } from "@/shared/utils/date";
import { GetXpHistoryDto } from "../dto/get-xp-history.dto";
import { GrantXpDto } from "../dto/grant-xp.dto";
import { contentLevelFromXp, contentLevelProgress, levelFromXp, levelProgress } from "./xp-level.util";

const UNIQUE_VIOLATION = "P2002";

export type XpGrantResult = {
  amount: number;
  reason: XpReason;
  totalXp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  contentType: ContentType | null;
  contentLevel: number | null;
  contentLeveledUp: boolean;
};

export type StreakTouchResult = {
  dayKey: string;
  currentStreak: number;
  longestStreak: number;
  bonusXp: number;
};

@Injectable()
export class XpService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Retorna null quando nada foi concedido: sourceKey repetido (idempotência) ou
  // teto diário já esgotado. Quem chama usa isso para não disparar efeito nenhum.
  async grantXp(grantXpDto: GrantXpDto): Promise<XpGrantResult | null> {
    const { userId, reason, sourceKey, contentType = null, metadata, skipDailyCap = false } = grantXpDto;

    const rule = XP_RULES[reason];
    const requested = grantXpDto.amount ?? rule.amount;

    if (requested <= 0) return null;

    return this.databaseService
      .$transaction(async (tx) => {
        const amount = skipDailyCap ? requested : await this.applyDailyCap(tx, userId, reason, requested);

        if (amount <= 0) return null;

        await tx.xpLedger.create({
          data: {
            userId,
            reason,
            sourceKey,
            amount,
            ...(contentType && { contentType }),
            ...(metadata && { metadata: { ...metadata } }),
          },
        });

        const xp = await tx.userXp.upsert({
          where: { userId },
          create: { userId, totalXp: amount, level: levelFromXp(amount) },
          update: { totalXp: { increment: amount } },
        });

        // O upsert de create já devolve o total final; o de update devolve o
        // valor pós-incremento, então em ambos os casos totalXp está correto.
        const previousLevel = levelFromXp(xp.totalXp - amount);
        const level = levelFromXp(xp.totalXp);

        if (level !== xp.level) {
          await tx.userXp.update({ where: { userId }, data: { level } });
        }

        let contentLevel: number | null = null;
        let contentLeveledUp = false;

        if (contentType) {
          const content = await tx.userContentXp.upsert({
            where: { userId_contentType: { userId, contentType } },
            create: { userId, contentType, xp: amount, level: contentLevelFromXp(amount) },
            update: { xp: { increment: amount } },
          });

          contentLevel = contentLevelFromXp(content.xp);
          contentLeveledUp = contentLevel > contentLevelFromXp(content.xp - amount);

          if (contentLevel !== content.level) {
            await tx.userContentXp.update({
              where: { userId_contentType: { userId, contentType } },
              data: { level: contentLevel },
            });
          }
        }

        return {
          amount,
          reason,
          totalXp: xp.totalXp,
          level,
          previousLevel,
          leveledUp: level > previousLevel,
          contentType,
          contentLevel,
          contentLeveledUp,
        } satisfies XpGrantResult;
      })
      .catch((error: { code?: string }) => {
        // sourceKey repetido: esse evento já foi pago alguma vez. Silencioso de propósito.
        if (error?.code === UNIQUE_VIOLATION) return null;

        throw error;
      });
  }

  // Soma o que já foi concedido hoje naquele reason e corta o excedente.
  private async applyDailyCap(
    tx: Pick<DatabaseService, "xpLedger">,
    userId: string,
    reason: XpReason,
    requested: number,
  ): Promise<number> {
    const cap = XP_RULES[reason].dailyCap;

    if (cap === null) return requested;

    const today = await tx.xpLedger.aggregate({
      where: { userId, reason, createdAt: { gte: startOfUtcDay(new Date()) } },
      _sum: { amount: true },
    });

    const used = today._sum.amount ?? 0;

    return Math.max(0, Math.min(requested, cap - used));
  }

  // Avança o streak no primeiro evento de cada dia UTC. Sem cron: a quebra é
  // detectada preguiçosamente quando o usuário volta. Retorna null se o dia já
  // foi contabilizado.
  async touchStreak(userId: string): Promise<StreakTouchResult | null> {
    const now = new Date();
    const today = startOfUtcDay(now);

    const current = await this.databaseService.userXp.findUnique({ where: { userId } });

    if (current?.lastActiveDate && diffUtcDays(current.lastActiveDate, today) === 0) return null;

    const continued = current?.lastActiveDate ? diffUtcDays(current.lastActiveDate, today) === 1 : false;
    const currentStreak = continued ? (current?.currentStreak ?? 0) + 1 : 1;
    const longestStreak = Math.max(currentStreak, current?.longestStreak ?? 0);

    await this.databaseService.userXp.upsert({
      where: { userId },
      create: { userId, currentStreak, longestStreak, lastActiveDate: today },
      update: { currentStreak, longestStreak, lastActiveDate: today },
    });

    return {
      dayKey: utcDayKey(now),
      currentStreak,
      longestStreak,
      bonusXp: STREAK_BASE_XP + Math.min(currentStreak, STREAK_MAX_MULTIPLIER) * STREAK_STEP_XP,
    };
  }

  // Medalhas de marco de level. Devolve só as concedidas agora, para o chamador
  // enfileirar as activities correspondentes.
  async grantMilestoneMedals(userId: string, previousLevel: number, level: number) {
    const crossed = LEVEL_MILESTONES.filter((milestone) => milestone > previousLevel && milestone <= level);

    if (crossed.length === 0) return [];

    const names = crossed.map((milestone) => LEVEL_MILESTONE_MEDAL_NAMES[milestone]);
    const medals = await this.databaseService.medal.findMany({ where: { name: { in: names } } });

    const granted: { userMedal: UserMedalModel; medal: MedalModel }[] = [];

    for (const medal of medals) {
      const userMedal = await this.grantMedal(userId, medal.id);

      if (userMedal) {
        granted.push({ userMedal, medal });
      }
    }

    return granted;
  }

  // Concede uma medalha ignorando quem já tem. Retorna null nesse caso, para o
  // chamador não emitir activity duplicada.
  async grantMedal(userId: string, medalId: string) {
    return this.databaseService.userMedal.create({ data: { userId, medalId } }).catch((error: { code?: string }) => {
      if (error?.code === UNIQUE_VIOLATION) return null;

      throw error;
    });
  }

  async getXpByUserId(userId: string) {
    const [xp, contentXp] = await Promise.all([
      this.databaseService.userXp.findUnique({ where: { userId } }),
      this.databaseService.userContentXp.findMany({ where: { userId } }),
    ]);

    const totalXp = xp?.totalXp ?? 0;

    // Streak parado em um dia anterior a ontem já está quebrado — só ainda não
    // foi zerado no banco, porque a atualização é preguiçosa.
    const stale = xp?.lastActiveDate ? diffUtcDays(xp.lastActiveDate, new Date()) > 1 : true;

    return {
      ...levelProgress(totalXp),
      currentStreak: stale ? 0 : (xp?.currentStreak ?? 0),
      longestStreak: xp?.longestStreak ?? 0,
      lastActiveDate: xp?.lastActiveDate ?? null,
      contentTypes: Object.values(ContentType).map((contentType) => {
        const entry = contentXp.find((item) => item.contentType === contentType);

        return { contentType, base: CONTENT_XP_BASE, ...contentLevelProgress(entry?.xp ?? 0) };
      }),
    };
  }

  async getXpByUsername(username: string) {
    const user = await this.databaseService.user.findUnique({ where: { username }, select: { id: true } });

    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    return this.getXpByUserId(user.id);
  }

  async getXpHistory(userId: string, getXpHistoryDto: GetXpHistoryDto) {
    return this.databaseService.offsetPagination<XpLedgerFindManyArgs>({
      model: "xpLedger",
      page: getXpHistoryDto.page,
      itemsPerPage: getXpHistoryDto.itemsPerPage,
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
