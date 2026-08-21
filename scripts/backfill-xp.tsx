import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import {
  CoinReason,
  ContentType,
  MissionMetric,
  PrismaClient,
  ProgressStatus,
  WatchEpisodeStatus,
  XpReason,
} from "../prisma/generated/client";
import { contentLevelFromXp, levelFromXp } from "../src/modules/xp/service/xp-level.util";
import { XP_REASON_TO_MISSION_METRIC } from "../src/shared/constants/mission";
import {
  COINS_PER_LEVEL,
  LEVEL_MILESTONE_MEDAL_NAMES,
  LEVEL_MILESTONES,
  XP_RULES,
  XP_SOURCE_KEYS,
} from "../src/shared/constants/xp";

// Reconstrói o histórico de progressão a partir das tabelas de origem, com os
// MESMOS sourceKeys do runtime — @@unique([userId, sourceKey]) torna o script
// idempotente por construção: rodar duas vezes não paga nada duas vezes.
//
// Ignora teto diário de propósito (é backfill, não farming) e não gera
// activities nem notificações — nada de spam retroativo no feed.
//
// Usage: bun run scripts/backfill-xp.tsx

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 1000;

type LedgerRow = {
  userId: string;
  reason: XpReason;
  contentType: ContentType | null;
  amount: number;
  sourceKey: string;
  createdAt: Date;
};

const WATCHED_STATUSES: WatchEpisodeStatus[] = [WatchEpisodeStatus.Watching, WatchEpisodeStatus.Completed];

const STARTED_STATUSES: ProgressStatus[] = [
  ProgressStatus.Watching,
  ProgressStatus.Playing,
  ProgressStatus.Reading,
  ProgressStatus.Rewatching,
  ProgressStatus.Replaying,
  ProgressStatus.Rereading,
  ProgressStatus.Paused,
  ProgressStatus.Dropped,
];

function row(
  userId: string,
  reason: XpReason,
  contentType: ContentType | null,
  sourceKey: string,
  createdAt: Date,
  amount = XP_RULES[reason].amount,
): LedgerRow {
  return { userId, reason, contentType, amount, sourceKey, createdAt };
}

async function insertLedger(rows: LedgerRow[]) {
  let inserted = 0;

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const result = await prisma.xpLedger.createMany({
      data: rows.slice(index, index + BATCH_SIZE),
      skipDuplicates: true,
    });

    inserted += result.count;
  }

  return inserted;
}

async function collectEpisodeRows(): Promise<LedgerRow[]> {
  const [animeWatches, tvShowWatches] = await Promise.all([
    prisma.animeEpisodeWatch.findMany({
      where: { status: { in: WATCHED_STATUSES } },
      select: { userId: true, animeId: true, episode: true, createdAt: true },
    }),
    prisma.tvShowEpisodeWatch.findMany({
      where: { status: { in: WATCHED_STATUSES } },
      select: { userId: true, tvShowId: true, season: true, episode: true, createdAt: true },
    }),
  ]);

  return [
    ...animeWatches.map((watch) =>
      row(
        watch.userId,
        XpReason.EpisodeWatched,
        ContentType.Anime,
        XP_SOURCE_KEYS.episode(ContentType.Anime, watch.animeId, watch.episode),
        watch.createdAt,
      ),
    ),
    ...tvShowWatches.map((watch) =>
      row(
        watch.userId,
        XpReason.EpisodeWatched,
        ContentType.TVShow,
        XP_SOURCE_KEYS.episode(ContentType.TVShow, watch.tvShowId, watch.episode),
        watch.createdAt,
      ),
    ),
  ];
}

const PROGRESS_SOURCES = [
  { model: "animeProgress", idField: "animeId", contentType: ContentType.Anime },
  { model: "mangaProgress", idField: "mangaId", contentType: ContentType.Manga },
  { model: "tvShowProgress", idField: "tvShowId", contentType: ContentType.TVShow },
  { model: "movieProgress", idField: "movieId", contentType: ContentType.Movie },
  { model: "gameProgress", idField: "gameId", contentType: ContentType.Game },
  { model: "bookProgress", idField: "bookId", contentType: ContentType.Book },
] as const;

async function collectProgressRows(): Promise<LedgerRow[]> {
  const rows: LedgerRow[] = [];

  for (const source of PROGRESS_SOURCES) {
    const delegate = prisma[source.model] as {
      findMany(args: object): Promise<Record<string, unknown>[]>;
    };

    const entries = await delegate.findMany({
      where: { status: { in: [...STARTED_STATUSES, ProgressStatus.Completed] } },
      select: { userId: true, status: true, createdAt: true, [source.idField]: true },
    });

    for (const entry of entries) {
      const userId = entry.userId as string;
      const mediaId = entry[source.idField] as string;
      const createdAt = entry.createdAt as Date;

      // Título completado quase sempre passou por "started" antes; o estado
      // intermediário se perdeu, então o backfill paga as duas linhas.
      rows.push(
        row(
          userId,
          XpReason.ProgressStarted,
          source.contentType,
          XP_SOURCE_KEYS.progressStarted(source.contentType, mediaId),
          createdAt,
        ),
      );

      if (entry.status === ProgressStatus.Completed) {
        rows.push(
          row(
            userId,
            XpReason.ProgressCompleted,
            source.contentType,
            XP_SOURCE_KEYS.progressCompleted(source.contentType, mediaId),
            createdAt,
          ),
        );
      }
    }
  }

  return rows;
}

const REVIEW_SOURCES = [
  { model: "animeReview", idField: "animeId", contentType: ContentType.Anime },
  { model: "mangaReview", idField: "mangaId", contentType: ContentType.Manga },
  { model: "tvShowReview", idField: "tvShowId", contentType: ContentType.TVShow },
  { model: "movieReview", idField: "movieId", contentType: ContentType.Movie },
  { model: "gameReview", idField: "gameId", contentType: ContentType.Game },
  { model: "bookReview", idField: "bookId", contentType: ContentType.Book },
] as const;

async function collectReviewRows(): Promise<LedgerRow[]> {
  const rows: LedgerRow[] = [];

  for (const source of REVIEW_SOURCES) {
    const delegate = prisma[source.model] as {
      findMany(args: object): Promise<Record<string, unknown>[]>;
    };

    const entries = await delegate.findMany({
      select: { userId: true, createdAt: true, [source.idField]: true },
    });

    for (const entry of entries) {
      rows.push(
        row(
          entry.userId as string,
          XpReason.ReviewAdded,
          source.contentType,
          XP_SOURCE_KEYS.review(source.contentType, entry[source.idField] as string),
          entry.createdAt as Date,
        ),
      );
    }
  }

  return rows;
}

async function collectSocialRows(): Promise<LedgerRow[]> {
  const [favorites, lists, listItems, followings, comments, reactions] = await Promise.all([
    prisma.favorite.findMany(),
    prisma.list.findMany({ select: { id: true, userId: true, type: true, createdAt: true } }),
    prisma.listItem.findMany({ include: { list: { select: { userId: true, createdAt: true } } } }),
    prisma.following.findMany({ select: { followerId: true, followingId: true, createdAt: true } }),
    prisma.comment.findMany({ select: { id: true, userId: true, createdAt: true } }),
    prisma.reaction.findMany({ select: { id: true, userId: true, createdAt: true } }),
  ]);

  const rows: LedgerRow[] = [];

  type MediaRefs = {
    animeId: string | null;
    mangaId: string | null;
    tvShowId: string | null;
    movieId: string | null;
    gameId: string | null;
    bookId: string | null;
  };

  const mediaIdOf = (entity: MediaRefs) =>
    entity.animeId ?? entity.mangaId ?? entity.tvShowId ?? entity.movieId ?? entity.gameId ?? entity.bookId;

  const contentTypeOf = (entity: MediaRefs): ContentType | null => {
    if (entity.animeId) return ContentType.Anime;
    if (entity.mangaId) return ContentType.Manga;
    if (entity.tvShowId) return ContentType.TVShow;
    if (entity.movieId) return ContentType.Movie;
    if (entity.gameId) return ContentType.Game;
    if (entity.bookId) return ContentType.Book;
    return null;
  };

  for (const favorite of favorites) {
    const mediaId = mediaIdOf(favorite) ?? favorite.personId;

    if (!mediaId) continue;

    rows.push(
      row(
        favorite.userId,
        XpReason.FavoriteAdded,
        contentTypeOf(favorite),
        XP_SOURCE_KEYS.favorite(favorite.type, mediaId),
        favorite.createdAt,
      ),
    );
  }

  for (const list of lists) {
    rows.push(
      row(
        list.userId,
        XpReason.ListCreated,
        list.type as unknown as ContentType,
        XP_SOURCE_KEYS.list(list.id),
        list.createdAt,
      ),
    );
  }

  for (const item of listItems) {
    const mediaId = mediaIdOf(item);

    if (!mediaId) continue;

    // ListItem não tem createdAt próprio; a data da lista é o melhor proxy.
    rows.push(
      row(
        item.list.userId,
        XpReason.ListItemAdded,
        contentTypeOf(item),
        XP_SOURCE_KEYS.listItem(item.listId, mediaId),
        item.list.createdAt,
      ),
    );
  }

  for (const following of followings) {
    rows.push(
      row(
        following.followerId,
        XpReason.Followed,
        null,
        XP_SOURCE_KEYS.follow(following.followingId),
        following.createdAt,
      ),
    );
  }

  for (const comment of comments) {
    rows.push(row(comment.userId, XpReason.CommentAdded, null, XP_SOURCE_KEYS.comment(comment.id), comment.createdAt));
  }

  for (const reaction of reactions) {
    rows.push(
      row(reaction.userId, XpReason.ReactionAdded, null, XP_SOURCE_KEYS.reaction(reaction.id), reaction.createdAt),
    );
  }

  return rows;
}

// Recalcula UserXp/UserContentXp inteiros a partir do ledger. Streak fica
// intocado: histórico de streak não é reconstruível.
async function recomputeTotals() {
  const [globalSums, contentSums] = await Promise.all([
    prisma.xpLedger.groupBy({ by: ["userId"], _sum: { amount: true } }),
    prisma.xpLedger.groupBy({
      by: ["userId", "contentType"],
      where: { contentType: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  for (const entry of globalSums) {
    const totalXp = entry._sum.amount ?? 0;
    const level = levelFromXp(totalXp);

    await prisma.userXp.upsert({
      where: { userId: entry.userId },
      create: { userId: entry.userId, totalXp, level },
      update: { totalXp, level },
    });
  }

  for (const entry of contentSums) {
    if (!entry.contentType) continue;

    const xp = entry._sum.amount ?? 0;
    const level = contentLevelFromXp(xp);

    await prisma.userContentXp.upsert({
      where: { userId_contentType: { userId: entry.userId, contentType: entry.contentType } },
      create: { userId: entry.userId, contentType: entry.contentType, xp, level },
      update: { xp, level },
    });
  }

  return globalSums.length;
}

const METRIC_TO_XP_REASON = Object.fromEntries(
  Object.entries(XP_REASON_TO_MISSION_METRIC).map(([reason, metric]) => [metric, reason as XpReason]),
) as Partial<Record<MissionMetric, XpReason>>;

// Mede o progresso de uma missão para todos os usuários de uma vez.
async function measureMission(mission: {
  metric: MissionMetric;
  contentType: ContentType | null;
}): Promise<Map<string, number>> {
  const progressByUser = new Map<string, number>();

  const counterReason = METRIC_TO_XP_REASON[mission.metric];

  if (counterReason) {
    const counts = await prisma.xpLedger.groupBy({
      by: ["userId"],
      where: { reason: counterReason, ...(mission.contentType && { contentType: mission.contentType }) },
      _count: { _all: true },
    });

    for (const entry of counts) {
      progressByUser.set(entry.userId, entry._count._all);
    }

    return progressByUser;
  }

  if (mission.metric === MissionMetric.ContentTypesReviewed) {
    const reviewed = await prisma.xpLedger.findMany({
      where: { reason: XpReason.ReviewAdded, contentType: { not: null } },
      distinct: ["userId", "contentType"],
      select: { userId: true },
    });

    for (const entry of reviewed) {
      progressByUser.set(entry.userId, (progressByUser.get(entry.userId) ?? 0) + 1);
    }

    return progressByUser;
  }

  if (mission.metric === MissionMetric.LevelReached) {
    if (mission.contentType) {
      const levels = await prisma.userContentXp.findMany({
        where: { contentType: mission.contentType },
        select: { userId: true, level: true },
      });

      for (const entry of levels) {
        progressByUser.set(entry.userId, entry.level);
      }
    } else {
      const levels = await prisma.userXp.findMany({ select: { userId: true, level: true } });

      for (const entry of levels) {
        progressByUser.set(entry.userId, entry.level);
      }
    }

    return progressByUser;
  }

  // StreakReached: histórico de streak não existe no backfill.
  return progressByUser;
}

// Sincroniza progresso e fecha missões batidas. Retorna as recém-fechadas para
// o chamador pagar XP/coins/medalha. Loop no chamador: fechar missão paga XP,
// que pode subir level, que pode fechar missão de LevelReached.
async function syncMissions() {
  const missions = await prisma.mission.findMany({ where: { active: true } });

  const closed: { userId: string; missionId: string; xpReward: number; coinReward: number; medalId: string | null }[] =
    [];

  for (const mission of missions) {
    const progressByUser = await measureMission(mission);

    for (const [userId, progress] of progressByUser) {
      const userMission = await prisma.userMission.upsert({
        where: { userId_missionId: { userId, missionId: mission.id } },
        create: { userId, missionId: mission.id, progress },
        update: { progress },
      });

      if (progress >= mission.target && !userMission.completedAt) {
        await prisma.userMission.update({
          where: { id: userMission.id },
          data: { completedAt: new Date() },
        });

        closed.push({
          userId,
          missionId: mission.id,
          xpReward: mission.xpReward,
          coinReward: mission.coinReward,
          medalId: mission.medalId,
        });
      }
    }
  }

  return closed;
}

async function grantMissionRewards(
  closed: { userId: string; missionId: string; xpReward: number; medalId: string | null }[],
) {
  const xpRows = closed
    .filter((entry) => entry.xpReward > 0)
    .map((entry) =>
      row(
        entry.userId,
        XpReason.MissionCompleted,
        null,
        XP_SOURCE_KEYS.mission(entry.missionId),
        new Date(),
        entry.xpReward,
      ),
    );

  await insertLedger(xpRows);

  const medalRows = closed
    .filter((entry): entry is typeof entry & { medalId: string } => Boolean(entry.medalId))
    .map((entry) => ({ userId: entry.userId, medalId: entry.medalId }));

  if (medalRows.length > 0) {
    await prisma.userMedal.createMany({ data: medalRows, skipDuplicates: true });
  }
}

async function grantMilestoneMedals() {
  const medals = await prisma.medal.findMany({
    where: { name: { in: Object.values(LEVEL_MILESTONE_MEDAL_NAMES) } },
  });

  const medalByName = new Map(medals.map((medal) => [medal.name, medal]));
  const users = await prisma.userXp.findMany({ select: { userId: true, level: true } });

  const rows: { userId: string; medalId: string }[] = [];

  for (const user of users) {
    for (const milestone of LEVEL_MILESTONES) {
      const medal = medalByName.get(LEVEL_MILESTONE_MEDAL_NAMES[milestone]);

      if (medal && user.level >= milestone) {
        rows.push({ userId: user.userId, medalId: medal.id });
      }
    }
  }

  if (rows.length > 0) {
    await prisma.userMedal.createMany({ data: rows, skipDuplicates: true });
  }
}

async function backfillCoins() {
  const users = await prisma.userXp.findMany({ select: { userId: true, level: true } });

  const coinRows: {
    userId: string;
    reason: CoinReason;
    amount: number;
    sourceKey: string;
  }[] = [];

  for (const user of users) {
    for (let level = 2; level <= user.level; level++) {
      coinRows.push({
        userId: user.userId,
        reason: CoinReason.LevelUp,
        amount: COINS_PER_LEVEL * level,
        sourceKey: XP_SOURCE_KEYS.levelUp(level),
      });
    }
  }

  const completedMissions = await prisma.userMission.findMany({
    where: { completedAt: { not: null } },
    select: { userId: true, missionId: true, mission: { select: { coinReward: true } } },
  });

  for (const entry of completedMissions) {
    if (entry.mission.coinReward > 0) {
      coinRows.push({
        userId: entry.userId,
        reason: CoinReason.MissionCompleted,
        amount: entry.mission.coinReward,
        sourceKey: XP_SOURCE_KEYS.mission(entry.missionId),
      });
    }
  }

  let inserted = 0;

  for (let index = 0; index < coinRows.length; index += BATCH_SIZE) {
    const result = await prisma.coinLedger.createMany({
      data: coinRows.slice(index, index + BATCH_SIZE),
      skipDuplicates: true,
    });

    inserted += result.count;
  }

  // Carteira derivada do ledger, nunca escrita por fora.
  const sums = await prisma.coinLedger.groupBy({ by: ["userId"], _sum: { amount: true } });

  for (const entry of sums) {
    const earned = await prisma.coinLedger.aggregate({
      where: { userId: entry.userId, amount: { gt: 0 } },
      _sum: { amount: true },
    });

    const spent = await prisma.coinLedger.aggregate({
      where: { userId: entry.userId, amount: { lt: 0 } },
      _sum: { amount: true },
    });

    const lifetimeEarned = earned._sum.amount ?? 0;
    const lifetimeSpent = Math.abs(spent._sum.amount ?? 0);

    await prisma.userWallet.upsert({
      where: { userId: entry.userId },
      create: { userId: entry.userId, balance: lifetimeEarned - lifetimeSpent, lifetimeEarned, lifetimeSpent },
      update: { balance: lifetimeEarned - lifetimeSpent, lifetimeEarned, lifetimeSpent },
    });
  }

  return inserted;
}

async function main() {
  console.log("Collecting historical sources...");

  const [episodeRows, progressRows, reviewRows, socialRows] = await Promise.all([
    collectEpisodeRows(),
    collectProgressRows(),
    collectReviewRows(),
    collectSocialRows(),
  ]);

  const allRows = [...episodeRows, ...progressRows, ...reviewRows, ...socialRows];

  console.log(`Candidate ledger rows: ${allRows.length}`);

  const inserted = await insertLedger(allRows);

  console.log(`Inserted ${inserted} new xp ledger rows (${allRows.length - inserted} already present).`);

  let users = await recomputeTotals();

  console.log(`Recomputed totals for ${users} users.`);

  // Fechar missão paga XP, que pode subir level, que fecha missão de
  // LevelReached — itera até estabilizar (na prática 2-3 voltas).
  let totalClosed = 0;

  for (let pass = 1; pass <= 5; pass++) {
    const closed = await syncMissions();

    if (closed.length === 0) break;

    totalClosed += closed.length;

    console.log(`Pass ${pass}: closed ${closed.length} missions.`);

    await grantMissionRewards(closed);

    users = await recomputeTotals();
  }

  console.log(`Total missions closed: ${totalClosed}`);

  await grantMilestoneMedals();

  const coins = await backfillCoins();

  console.log(`Inserted ${coins} new coin ledger rows.`);
  console.log("Backfill done.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err);

    await prisma.$disconnect();
    await pool.end();

    process.exit(1);
  });
