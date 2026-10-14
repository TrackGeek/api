import "dotenv/config";

import { HttpService } from "@nestjs/axios";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createClient, type RedisClientType } from "redis";
import { Prisma, PrismaClient } from "../prisma/generated/client";
import type { AnimeUpdateInput } from "../prisma/generated/models";
import { CACHE_KEYS } from "../src/shared/constants/cache";
import { CacheService } from "../src/shared/infra/cache/cache.service";
import { TenraiService } from "../src/shared/infra/integrations/tenrai.service";

const malId = Number(process.argv[2]);

if (process.argv.length !== 3 || !Number.isSafeInteger(malId) || malId <= 0) {
  console.error("Usage: bun run scripts/refresh-anime.ts <malId>");
  process.exit(1);
}

if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
  console.error("DATABASE_URL and REDIS_URL are required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const redis = createClient({
  url: process.env.REDIS_URL,
  socket: { connectTimeout: 10_000, reconnectStrategy: false },
});
redis.on("error", (error) => console.error(error.message));

async function main() {
  const anime = await database.anime.findUnique({
    where: { malId },
    select: { title: true, status: true, episodes: true },
  });

  if (!anime) {
    throw new Error(`Anime not found: ${malId}`);
  }

  await redis.connect();
  const tenrai = new TenraiService(new HttpService(), new CacheService(redis as RedisClientType));
  const details = await tenrai.getAnimeById(malId, true);

  const pages = new Set(["1", ...Object.keys(anime.episodes ?? {})]);
  for (const page of pages) {
    await redis.del(CACHE_KEYS.TENRAI_ANIME_EPISODES_BY_ID.prefix({ malId, page: Number(page) }));
  }

  const refreshed = await database.anime.update({
    where: { malId },
    data: {
      ...details,
      episodes: Prisma.JsonNull,
      lastRefreshedAt: new Date(),
    } as unknown as AnimeUpdateInput,
    select: { malId: true, title: true, status: true, numberOfEpisodes: true, lastRefreshedAt: true },
  });

  console.log(JSON.stringify({ previousStatus: anime.status, ...refreshed }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.$disconnect();
    await pool.end();
    if (redis.isOpen) await redis.quit();
  });
