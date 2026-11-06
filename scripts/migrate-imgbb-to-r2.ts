import "dotenv/config";

import { parseArgs } from "node:util";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../prisma/generated/client";
import { R2Service } from "../src/shared/infra/integrations/r2.service";
import { ImgbbR2Migration } from "./lib/imgbb-r2-migration";

function integerOption(value: string | boolean | undefined, name: string, minimum: number, maximum: number): number {
  if (typeof value !== "string") throw new Error(`${name} must be a number`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      "max-images": { type: "string", default: process.env.IMGBB_R2_MIGRATION_MAX_IMAGES ?? "100" },
      "max-bytes": {
        type: "string",
        default: process.env.IMGBB_R2_MIGRATION_MAX_BYTES ?? String(250 * 1024 * 1024),
      },
      "delay-ms": { type: "string", default: process.env.IMGBB_R2_MIGRATION_DELAY_MS ?? "2000" },
      "batch-size": { type: "string", default: "100" },
      "download-timeout-ms": { type: "string", default: "30000" },
      "max-download-bytes": { type: "string", default: String(32 * 1024 * 1024) },
      "download-attempts": { type: "string", default: "5" },
      "webp-quality": { type: "string", default: "82" },
    },
    allowPositionals: false,
  });

  const dryRun = values["dry-run"] === true;
  const options = {
    dryRun,
    maxImages: integerOption(values["max-images"], "max-images", 1, 100_000),
    maxBytes: integerOption(values["max-bytes"], "max-bytes", 1, Number.MAX_SAFE_INTEGER),
    delayMs: integerOption(values["delay-ms"], "delay-ms", 0, 3_600_000),
    batchSize: integerOption(values["batch-size"], "batch-size", 1, 1_000),
    downloadTimeoutMs: integerOption(values["download-timeout-ms"], "download-timeout-ms", 1_000, 300_000),
    maxDownloadBytes: integerOption(values["max-download-bytes"], "max-download-bytes", 1, 100 * 1024 * 1024),
    downloadAttempts: integerOption(values["download-attempts"], "download-attempts", 1, 10),
    webpQuality: integerOption(values["webp-quality"], "webp-quality", 1, 100),
  };

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const r2 = new R2Service(new ConfigService());
  if (!dryRun) r2.getObjectUrl("configuration-check");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });
  const database = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const migration = new ImgbbR2Migration(database, r2, options);
    const stats = await migration.run();
    console.log(JSON.stringify({ dryRun, ...stats }, null, 2));
    if (stats.failedUrls > 0) process.exitCode = 1;
  } finally {
    await database.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
