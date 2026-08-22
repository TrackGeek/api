import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { v7 as uuid } from "uuid";

import { ContentType, MissionMetric, MissionTier, PrismaClient, UserRole } from "./generated/client";

const nodeEnv = process.env.NODE_ENV;

const isDev = nodeEnv === "development";

if (!nodeEnv || ["development", "production"].indexOf(nodeEnv) === -1) {
  console.log(
    "NODE_ENV is not defined.\n\nPlease set it to 'development' or 'production'.\n\nExample: NODE_ENV=development bun run db:seed",
  );

  process.exit(1);
}

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await populateMedals(prisma);
  await populateMissions(prisma);

  if (isDev) {
    await createFirstUser(prisma);
  }
}

export async function populateMedals(prisma: PrismaClient) {
  const medals = await prisma.medal.createMany({
    data: [
      {
        name: "contributor",
        imageUrl: "https://i.ibb.co/99PS2x8m/logo.png",
      },
      {
        name: "staff",
        imageUrl: "https://i.ibb.co/99PS2x8m/logo.png",
      },
      // Marcos de level, concedidos automaticamente pelo XpProcessor.
      {
        name: "level-10",
        imageUrl: "https://i.ibb.co/99PS2x8m/logo.png",
      },
      {
        name: "level-25",
        imageUrl: "https://i.ibb.co/99PS2x8m/logo.png",
      },
      {
        name: "level-50",
        imageUrl: "https://i.ibb.co/99PS2x8m/logo.png",
      },
      {
        name: "level-100",
        imageUrl: "https://i.ibb.co/99PS2x8m/logo.png",
      },
    ],
    skipDuplicates: true,
  });

  if (medals.count > 0) {
    console.log(`Inserted ${medals.count} medals.`);
  }
}

// Recompensa por tier. Manter em tabela evita valores soltos linha a linha.
const MISSION_TIER_REWARD: Record<MissionTier, { xpReward: number; coinReward: number }> = {
  [MissionTier.Bronze]: { xpReward: 50, coinReward: 5 },
  [MissionTier.Silver]: { xpReward: 150, coinReward: 15 },
  [MissionTier.Gold]: { xpReward: 400, coinReward: 40 },
  [MissionTier.Platinum]: { xpReward: 1000, coinReward: 100 },
};

type MissionSeed = {
  key: string;
  metric: MissionMetric;
  target: number;
  tier: MissionTier;
  contentType?: ContentType;
  cosmeticKey?: string;
  hidden?: boolean;
};

// Catálogo inicial. Depois daqui, o CRUD admin (/admin/missions) é a fonte da
// verdade — o seed usa skipDuplicates para nunca sobrescrever ajuste manual.
const MISSION_CATALOG: MissionSeed[] = [
  { key: "watch_10_episodes", metric: MissionMetric.EpisodesWatched, target: 10, tier: MissionTier.Bronze },
  { key: "watch_100_episodes", metric: MissionMetric.EpisodesWatched, target: 100, tier: MissionTier.Silver },
  { key: "watch_500_episodes", metric: MissionMetric.EpisodesWatched, target: 500, tier: MissionTier.Gold },
  {
    key: "watch_1000_episodes",
    metric: MissionMetric.EpisodesWatched,
    target: 1000,
    tier: MissionTier.Platinum,
    cosmeticKey: "otaku",
  },

  { key: "complete_1_title", metric: MissionMetric.ProgressCompleted, target: 1, tier: MissionTier.Bronze },
  { key: "complete_25_titles", metric: MissionMetric.ProgressCompleted, target: 25, tier: MissionTier.Silver },
  { key: "complete_100_titles", metric: MissionMetric.ProgressCompleted, target: 100, tier: MissionTier.Gold },
  { key: "complete_500_titles", metric: MissionMetric.ProgressCompleted, target: 500, tier: MissionTier.Platinum },
  {
    key: "complete_50_animes",
    metric: MissionMetric.ProgressCompleted,
    target: 50,
    tier: MissionTier.Silver,
    contentType: ContentType.Anime,
  },
  {
    key: "complete_50_games",
    metric: MissionMetric.ProgressCompleted,
    target: 50,
    tier: MissionTier.Silver,
    contentType: ContentType.Game,
  },

  { key: "write_1_review", metric: MissionMetric.ReviewsWritten, target: 1, tier: MissionTier.Bronze },
  { key: "write_10_reviews", metric: MissionMetric.ReviewsWritten, target: 10, tier: MissionTier.Silver },
  { key: "write_50_reviews", metric: MissionMetric.ReviewsWritten, target: 50, tier: MissionTier.Gold },
  {
    key: "write_100_reviews",
    metric: MissionMetric.ReviewsWritten,
    target: 100,
    tier: MissionTier.Platinum,
    cosmeticKey: "critic",
  },
  {
    key: "review_every_content_type",
    metric: MissionMetric.ContentTypesReviewed,
    target: 6,
    tier: MissionTier.Gold,
    cosmeticKey: "omnivore",
  },

  { key: "favorite_5_titles", metric: MissionMetric.FavoritesAdded, target: 5, tier: MissionTier.Bronze },
  { key: "favorite_25_titles", metric: MissionMetric.FavoritesAdded, target: 25, tier: MissionTier.Silver },

  { key: "create_1_list", metric: MissionMetric.ListsCreated, target: 1, tier: MissionTier.Bronze },
  { key: "create_10_lists", metric: MissionMetric.ListsCreated, target: 10, tier: MissionTier.Silver },
  { key: "add_50_list_items", metric: MissionMetric.ListItemsAdded, target: 50, tier: MissionTier.Bronze },
  { key: "add_500_list_items", metric: MissionMetric.ListItemsAdded, target: 500, tier: MissionTier.Gold },

  { key: "follow_1_user", metric: MissionMetric.UsersFollowed, target: 1, tier: MissionTier.Bronze },
  { key: "follow_10_users", metric: MissionMetric.UsersFollowed, target: 10, tier: MissionTier.Silver },
  { key: "write_1_comment", metric: MissionMetric.CommentsWritten, target: 1, tier: MissionTier.Bronze },
  { key: "write_50_comments", metric: MissionMetric.CommentsWritten, target: 50, tier: MissionTier.Silver },

  { key: "reach_level_10", metric: MissionMetric.LevelReached, target: 10, tier: MissionTier.Bronze },
  { key: "reach_level_25", metric: MissionMetric.LevelReached, target: 25, tier: MissionTier.Silver },
  { key: "reach_level_50", metric: MissionMetric.LevelReached, target: 50, tier: MissionTier.Gold },
  { key: "reach_level_100", metric: MissionMetric.LevelReached, target: 100, tier: MissionTier.Platinum },

  { key: "streak_7_days", metric: MissionMetric.StreakReached, target: 7, tier: MissionTier.Bronze },
  {
    key: "streak_30_days",
    metric: MissionMetric.StreakReached,
    target: 30,
    tier: MissionTier.Silver,
    cosmeticKey: "devoted",
  },
  { key: "streak_100_days", metric: MissionMetric.StreakReached, target: 100, tier: MissionTier.Gold },
  {
    key: "streak_365_days",
    metric: MissionMetric.StreakReached,
    target: 365,
    tier: MissionTier.Platinum,
    hidden: true,
  },
];

export async function populateMissions(prisma: PrismaClient) {
  const missions = await prisma.mission.createMany({
    data: MISSION_CATALOG.map((mission, index) => ({
      key: mission.key,
      metric: mission.metric,
      target: mission.target,
      tier: mission.tier,
      contentType: mission.contentType ?? null,
      cosmeticKey: mission.cosmeticKey ?? null,
      hidden: mission.hidden ?? false,
      position: index,
      ...MISSION_TIER_REWARD[mission.tier],
    })),
    skipDuplicates: true,
  });

  if (missions.count > 0) {
    console.log(`Inserted ${missions.count} missions.`);
  }
}

async function createFirstUser(prisma: PrismaClient) {
  const password = "$2a$12$VFoLlPVUMw.kcjR4L8Cdx.A4UrkBt4CWFZRLIrD1KOohG19Mc3XzC"; // "super-secure-password"

  const users = [
    {
      id: uuid(),
      name: "Jhon Doe",
      username: "jhondoe",
      email: "jhondoe@example.com",
    },
    {
      id: uuid(),
      name: "Jane Doe",
      username: "janedoe",
      email: "janedoe@example.com",
    },
  ];

  let insertedCount = 0;

  for (const userData of users) {
    const userExists = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!userExists) {
      await prisma.user.create({
        data: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          username: userData.username,
          emailVerified: true,
          role: UserRole.User,
          profile: {
            create: {
              id: uuid(),
            },
          },
          accounts: {
            create: {
              id: uuid(),
              accountId: userData.id,
              providerId: "credential",
              password,
            },
          },
        },
      });

      insertedCount++;
    }
  }

  if (insertedCount > 0) {
    console.log(`Inserted ${insertedCount} users.`);
  }
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
