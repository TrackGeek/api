import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/generated/client";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { REWIND_END, REWIND_START, REWIND_TYPES, REWIND_YEAR, TRACKGEEK_LAUNCH } from "../rewind.constants";
import {
  type RewindGlobalRow,
  type RewindProgressRow,
  type RewindReviewRow,
  rewindProgressCte,
  rewindReviewsQuery,
} from "../rewind.queries";
import { summarizeRewind } from "../rewind.utils";

@Injectable()
export class RewindService {
  constructor(
    private readonly database: DatabaseService,
    private readonly cache: CacheService,
  ) {}

  async getPersonal(userId: string) {
    const now = new Date();
    const cutoff = new Date(Math.min(now.getTime(), REWIND_END.getTime()));
    const [rows, reviews] = await Promise.all([
      this.database.$queryRaw<RewindProgressRow[]>(Prisma.sql`
        ${rewindProgressCte(cutoff, userId)}
        SELECT type, id, title, image, slug, "recordedAt", completed FROM eligible
      `),
      this.database.$queryRaw<RewindReviewRow[]>(rewindReviewsQuery(cutoff, userId)),
    ]);

    return {
      year: REWIND_YEAR,
      startsAt: REWIND_START.toISOString(),
      endsAt: REWIND_END.toISOString(),
      launchAt: TRACKGEEK_LAUNCH.toISOString(),
      generatedAt: now.toISOString(),
      isPreview: now < REWIND_END,
      ...summarizeRewind(rows, reviews),
    };
  }

  async getGlobal() {
    const key = CACHE_KEYS.REWIND_GLOBAL;
    const cached = await this.cache.get<Awaited<ReturnType<RewindService["buildGlobal"]>>>(key.prefix);
    if (cached) return cached;

    const result = await this.buildGlobal();
    await this.cache.set(key.prefix, result, key.expiration);
    return result;
  }

  private async buildGlobal() {
    const now = new Date();
    const cutoff = new Date(Math.min(now.getTime(), REWIND_END.getTime()));
    const [categories, people] = await Promise.all([
      this.database.$queryRaw<RewindGlobalRow[]>(Prisma.sql`
        ${rewindProgressCte(cutoff)}
        SELECT type, COUNT(*)::int AS tracked,
          COUNT(*) FILTER (WHERE completed)::int AS completed,
          COUNT(DISTINCT "userId")::int AS people
        FROM eligible GROUP BY type
      `),
      this.database.user.count({ where: { createdAt: { gte: TRACKGEEK_LAUNCH, lt: cutoff } } }),
    ]);

    return {
      year: REWIND_YEAR,
      launchAt: TRACKGEEK_LAUNCH.toISOString(),
      generatedAt: now.toISOString(),
      isPreview: now < REWIND_END,
      people,
      tracked: categories.reduce((sum, category) => sum + category.tracked, 0),
      completed: categories.reduce((sum, category) => sum + category.completed, 0),
      categories: REWIND_TYPES.map((type) => categories.find((category) => category.type === type)).filter(
        (category): category is RewindGlobalRow => category !== undefined,
      ),
    };
  }
}
