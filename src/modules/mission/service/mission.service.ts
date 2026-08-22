import { Injectable } from "@nestjs/common";
import { ContentType, MissionMetric, XpReason } from "@prisma/generated/enums";
import { MissionModel, UserMissionModel } from "@prisma/generated/models";
import { contentLevelFromXp } from "@/modules/xp/service/xp-level.util";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import {
  DerivedMissionMetric,
  XP_REASON_TO_DERIVED_METRICS,
  XP_REASON_TO_MISSION_METRIC,
} from "@/shared/constants/mission";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CreateMissionDto } from "../dto/create-mission.dto";
import { UpdateMissionDto } from "../dto/update-mission.dto";

export type CompletedMission = {
  mission: MissionModel;
  userMission: UserMissionModel;
};

@Injectable()
export class MissionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async advanceForXpReason(
    userId: string,
    reason: XpReason,
    contentType: ContentType | null,
  ): Promise<CompletedMission[]> {
    const completed: CompletedMission[] = [];

    const counterMetric = XP_REASON_TO_MISSION_METRIC[reason];

    if (counterMetric) {
      completed.push(...(await this.incrementCounter(userId, counterMetric, contentType)));
    }

    for (const metric of XP_REASON_TO_DERIVED_METRICS[reason] ?? []) {
      completed.push(...(await this.syncDerived(userId, metric)));
    }

    return completed;
  }

  async advanceLevelReached(userId: string): Promise<CompletedMission[]> {
    return this.syncDerived(userId, MissionMetric.LevelReached);
  }

  private async incrementCounter(
    userId: string,
    metric: MissionMetric,
    contentType: ContentType | null,
  ): Promise<CompletedMission[]> {
    const missions = await this.databaseService.mission.findMany({
      where: {
        metric,
        active: true,
        ...(contentType ? { OR: [{ contentType: null }, { contentType }] } : { contentType: null }),
      },
    });

    const completed: CompletedMission[] = [];

    for (const mission of missions) {
      const userMission = await this.databaseService.userMission.upsert({
        where: { userId_missionId: { userId, missionId: mission.id } },
        create: { userId, missionId: mission.id, progress: 1 },
        update: { progress: { increment: 1 } },
      });

      const closed = await this.closeIfReached(mission, userMission);

      if (closed) completed.push(closed);
    }

    return completed;
  }

  private async syncDerived(userId: string, metric: DerivedMissionMetric): Promise<CompletedMission[]> {
    const missions = await this.databaseService.mission.findMany({ where: { metric, active: true } });

    if (missions.length === 0) return [];

    const completed: CompletedMission[] = [];

    for (const mission of missions) {
      const progress = await this.measureDerived(userId, metric, mission.contentType);

      const userMission = await this.databaseService.userMission.upsert({
        where: { userId_missionId: { userId, missionId: mission.id } },
        create: { userId, missionId: mission.id, progress },
        update: { progress },
      });

      const closed = await this.closeIfReached(mission, userMission);

      if (closed) completed.push(closed);
    }

    return completed;
  }

  private async measureDerived(
    userId: string,
    metric: DerivedMissionMetric,
    contentType: ContentType | null,
  ): Promise<number> {
    if (metric === MissionMetric.ContentTypesReviewed) {
      const reviewed = await this.databaseService.xpLedger.findMany({
        where: { userId, reason: XpReason.ReviewAdded, contentType: { not: null } },
        distinct: ["contentType"],
        select: { contentType: true },
      });

      return reviewed.length;
    }

    if (metric === MissionMetric.StreakReached) {
      const xp = await this.databaseService.userXp.findUnique({ where: { userId } });

      return xp?.longestStreak ?? 0;
    }

    if (contentType) {
      const content = await this.databaseService.userContentXp.findUnique({
        where: { userId_contentType: { userId, contentType } },
      });

      return contentLevelFromXp(content?.xp ?? 0);
    }

    const xp = await this.databaseService.userXp.findUnique({ where: { userId } });

    return xp?.level ?? 1;
  }

  private async closeIfReached(mission: MissionModel, userMission: UserMissionModel): Promise<CompletedMission | null> {
    if (userMission.completedAt || userMission.progress < mission.target) return null;

    const closed = await this.databaseService.userMission.update({
      where: { id: userMission.id },
      data: { completedAt: new Date() },
    });

    return { mission, userMission: closed };
  }

  async getMissionsByUserId(userId: string) {
    const [missions, userMissions] = await Promise.all([
      this.databaseService.mission.findMany({
        where: { active: true },
        orderBy: [{ tier: "asc" }, { position: "asc" }],
        include: { medal: true },
      }),
      this.databaseService.userMission.findMany({ where: { userId } }),
    ]);

    const byMissionId = new Map(userMissions.map((item) => [item.missionId, item]));

    const items = missions.map((mission) => {
      const userMission = byMissionId.get(mission.id);
      const progress = Math.min(userMission?.progress ?? 0, mission.target);
      const completedAt = userMission?.completedAt ?? null;

      if (mission.hidden && !completedAt) {
        return {
          id: mission.id,
          key: mission.key,
          tier: mission.tier,
          hidden: true as const,
          progress: 0,
          target: 0,
          percentage: 0,
          completedAt: null,
        };
      }

      return {
        id: mission.id,
        key: mission.key,
        metric: mission.metric,
        contentType: mission.contentType,
        tier: mission.tier,
        hidden: false as const,
        target: mission.target,
        xpReward: mission.xpReward,
        coinReward: mission.coinReward,
        cosmeticKey: mission.cosmeticKey,
        medal: mission.medal,
        progress,
        percentage: mission.target > 0 ? Math.min(100, Math.round((progress / mission.target) * 100)) : 0,
        completedAt,
      };
    });

    return {
      total: items.length,
      completed: items.filter((item) => item.completedAt !== null).length,
      items,
    };
  }

  async getMissionSummaryByUserId(userId: string, recent = 5) {
    const [total, completed, latest] = await Promise.all([
      this.databaseService.mission.count({ where: { active: true } }),
      this.databaseService.userMission.count({ where: { userId, completedAt: { not: null } } }),
      this.databaseService.userMission.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: recent,
        select: {
          completedAt: true,
          mission: { select: { id: true, key: true, tier: true, hidden: true } },
        },
      }),
    ]);

    return {
      total,
      completed,
      latest: latest.map(({ completedAt, mission }) => ({ ...mission, completedAt })),
    };
  }

  async getCompletedMissionKeys(userId: string): Promise<string[]> {
    const completed = await this.databaseService.userMission.findMany({
      where: { userId, completedAt: { not: null } },
      select: { mission: { select: { key: true } } },
    });

    return completed.map((item) => item.mission.key);
  }

  async listMissions() {
    return this.databaseService.mission.findMany({
      orderBy: [{ tier: "asc" }, { position: "asc" }],
      include: { medal: true },
    });
  }

  async createMission(createMissionDto: CreateMissionDto) {
    const exists = await this.databaseService.mission.findUnique({ where: { key: createMissionDto.key } });

    if (exists) {
      throw new AppException(ERROR_CODES.MISSION_KEY_ALREADY_EXISTS);
    }

    return this.databaseService.mission.create({ data: createMissionDto });
  }

  async updateMission(missionId: string, updateMissionDto: UpdateMissionDto) {
    const mission = await this.databaseService.mission.findUnique({ where: { id: missionId } });

    if (!mission) {
      throw new AppException(ERROR_CODES.MISSION_NOT_FOUND);
    }

    return this.databaseService.mission.update({ where: { id: missionId }, data: updateMissionDto });
  }

  async deleteMission(missionId: string) {
    const mission = await this.databaseService.mission.findUnique({ where: { id: missionId } });

    if (!mission) {
      throw new AppException(ERROR_CODES.MISSION_NOT_FOUND);
    }

    await this.databaseService.mission.delete({ where: { id: missionId } });
  }
}
