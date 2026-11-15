import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import type { Prisma } from "@prisma/generated/client";
import { AnimeService } from "@/modules/anime/service/anime.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { mappingForEpisode, type TmdbMediaType } from "./anime-mapping-index";
import { AnimeMappingService } from "./anime-mapping.service";

@Injectable()
export class AnimeMigrationService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AnimeMigrationService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly mappings: AnimeMappingService,
    private readonly animeService: AnimeService,
  ) {}

  onApplicationBootstrap() {
    void this.run();
    this.timer = setInterval(() => void this.run(), 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.mappings.initialize();
      await this.mappings.refreshIfDue();
      for (const type of ["movie", "tv"] as const) {
        const model = type === "movie" ? "movie" : "tvShow";
        const where =
          type === "movie"
            ? ({
                OR: [
                  { movieProgresses: { some: {} } },
                  { movieReviews: { some: {} } },
                  { favorites: { some: {} } },
                  { listItems: { some: {} } },
                  { comments: { some: {} } },
                  { posts: { some: {} } },
                ],
              } satisfies Prisma.MovieWhereInput)
            : ({
                OR: [
                  { tvshowProgresses: { some: {} } },
                  { tvshowReviews: { some: {} } },
                  { tvshowEpisodesWatch: { some: {} } },
                  { favorites: { some: {} } },
                  { listItems: { some: {} } },
                  { comments: { some: {} } },
                  { posts: { some: {} } },
                ],
              } satisfies Prisma.TvShowWhereInput);
        let cursor: string | undefined;
        do {
          const sources: { id: string; tmdbId: number }[] = await (this.database[model] as any).findMany({
            where,
            select: { id: true, tmdbId: true },
            orderBy: { id: "asc" },
            take: 100,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });
          for (const source of sources) {
            try {
              await this.migrate(type, source.id, source.tmdbId);
            } catch (error) {
              this.logger.warn(`Anime migration deferred for ${type}:${source.tmdbId}: ${String(error)}`);
            }
          }
          cursor = sources.length === 100 ? sources[sources.length - 1].id : undefined;
        } while (cursor);
      }
    } catch (error) {
      this.logger.warn(`Anime migration deferred: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }

  private async animeId(malId: number) {
    const existing = await this.database.anime.findUnique({ where: { malId }, select: { id: true } });
    return existing?.id ?? (await this.animeService.getAnimeByMalId(malId)).id;
  }

  async migrate(type: TmdbMediaType, sourceId: string, tmdbId: number) {
    const mappings = await this.mappings.mappings(type, tmdbId);
    if (!mappings.length) return;
    const primaryId = await this.animeId(mappings[0].malId);
    const episodeTargets = new Map<number, string>();
    if (type === "tv") {
      const seasons = await this.database.tvShowEpisodeWatch.findMany({
        where: { tvShowId: sourceId },
        distinct: ["season"],
        select: { season: true },
      });
      for (const { season } of seasons) {
        for (const mapping of mappings.filter((entry) => entry.season === season)) {
          episodeTargets.set(mapping.malId, await this.animeId(mapping.malId));
        }
      }
    }
    await this.database.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`anime-migration:${type}:${sourceId}`}))`;
        const sourceField = type === "movie" ? "movieId" : "tvShowId";
        const progressModel = type === "movie" ? "movieProgress" : "tvShowProgress";
        const reviewModel = type === "movie" ? "movieReview" : "tvShowReview";
        const progressField = `${progressModel}Id`;
        const reviewField = `${reviewModel}Id`;
        const client = tx as any;
        const progressRows = await client[progressModel].findMany({ where: { [sourceField]: sourceId } });
        for (const source of progressRows) {
          await this.archive(tx, progressModel, source, primaryId);
          const target = await tx.animeProgress.upsert({
            where: { userId_animeId: { userId: source.userId, animeId: primaryId } },
            update: {},
            create: {
              userId: source.userId,
              animeId: primaryId,
              status: source.status,
              watchCount: source.watchCount,
              startedAt: source.startedAt,
              completedAt: source.completedAt,
              createdAt: source.createdAt,
              updatedAt: source.updatedAt,
            },
          });
          await tx.activity.updateMany({
            where: { [progressField]: source.id },
            data: { [progressField]: null, animeProgressId: target.id },
          });
          await client[progressModel].delete({ where: { id: source.id } });
        }
        const reviewRows = await client[reviewModel].findMany({ where: { [sourceField]: sourceId } });
        for (const source of reviewRows) {
          await this.archive(tx, reviewModel, source, primaryId);
          const target = await tx.animeReview.upsert({
            where: { userId_animeId: { userId: source.userId, animeId: primaryId } },
            update: {},
            create: {
              userId: source.userId,
              animeId: primaryId,
              overall: source.overall,
              summary: source.summary,
              notes: [source.notes, source.story].filter(Boolean).join("\n\n") || null,
              recommended: source.recommended,
              createdAt: source.createdAt,
              updatedAt: source.updatedAt,
            },
          });
          for (const reaction of await tx.reaction.findMany({ where: { [reviewField]: source.id } })) {
            const duplicate = await tx.reaction.findUnique({
              where: { userId_animeReviewId: { userId: reaction.userId, animeReviewId: target.id } },
            });
            if (duplicate) {
              await this.archive(tx, "reaction", reaction, primaryId);
              await tx.notification.updateMany({
                where: { reactionId: reaction.id },
                data: { reactionId: duplicate.id },
              });
              await tx.reaction.delete({ where: { id: reaction.id } });
            } else {
              await tx.reaction.update({
                where: { id: reaction.id },
                data: { [reviewField]: null, animeReviewId: target.id, type: "AnimeReview" },
              });
            }
          }
          await tx.activity.updateMany({
            where: { [reviewField]: source.id },
            data: { [reviewField]: null, animeReviewId: target.id },
          });
          await tx.notification.updateMany({
            where: { [reviewField]: source.id },
            data: { [reviewField]: null, animeReviewId: target.id },
          });
          await client[reviewModel].delete({ where: { id: source.id } });
        }
        for (const favorite of await tx.favorite.findMany({ where: { [sourceField]: sourceId } })) {
          await this.archive(tx, "favorite", favorite, primaryId);
          const existing = await tx.favorite.findUnique({
            where: { userId_animeId: { userId: favorite.userId, animeId: primaryId } },
          });
          if (existing) {
            await tx.activity.updateMany({ where: { favoriteId: favorite.id }, data: { favoriteId: existing.id } });
            await tx.favorite.delete({ where: { id: favorite.id } });
          } else {
            await tx.favorite.update({
              where: { id: favorite.id },
              data: { [sourceField]: null, animeId: primaryId, type: "Anime" },
            });
          }
        }
        await tx.comment.updateMany({
          where: { [sourceField]: sourceId },
          data: { [sourceField]: null, animeId: primaryId, type: "Anime" },
        });
        await tx.post.updateMany({
          where: { [sourceField]: sourceId },
          data: { [sourceField]: null, animeId: primaryId },
        });
        if (type === "tv")
          await tx.activity.updateMany({ where: { tvShowId: sourceId }, data: { tvShowId: null, animeId: primaryId } });
        await this.migrateLists(tx, sourceField, sourceId, primaryId);
        if (type === "tv") {
          for (const source of await tx.tvShowEpisodeWatch.findMany({ where: { tvShowId: sourceId } })) {
            const mapping = mappingForEpisode(mappings, source.season, source.episode);
            const animeId = mapping ? episodeTargets.get(mapping.malId) : undefined;
            const episode = source.episode - (mapping?.episodeOffset ?? 0);
            if (!animeId || episode < 1) continue;
            await this.archive(tx, "tvShowEpisodeWatch", source, animeId);
            const target = await tx.animeEpisodeWatch.upsert({
              where: { userId_animeId_episode: { userId: source.userId, animeId, episode } },
              update: {},
              create: {
                userId: source.userId,
                animeId,
                episode,
                status: source.status,
                createdAt: source.createdAt,
                updatedAt: source.updatedAt,
              },
            });
            await tx.animeProgress.upsert({
              where: { userId_animeId: { userId: source.userId, animeId } },
              update: {},
              create: {
                userId: source.userId,
                animeId,
                status: progressRows.find((row: any) => row.userId === source.userId)?.status ?? "Watching",
              },
            });
            await tx.activity.updateMany({
              where: { tvShowEpisodeWatchId: source.id },
              data: { tvShowEpisodeWatchId: null, animeEpisodeWatchId: target.id },
            });
            await tx.tvShowEpisodeWatch.delete({ where: { id: source.id } });
          }
        }
      },
      { timeout: 60000 },
    );
  }

  private async archive(tx: any, sourceType: string, source: any, animeId: string) {
    await tx.animeMigrationArchive.upsert({
      where: { sourceType_sourceId: { sourceType, sourceId: source.id } },
      update: {},
      create: {
        sourceType,
        sourceId: source.id,
        animeId,
        userId: source.userId ?? source.list.userId,
        payload: JSON.parse(JSON.stringify(source)),
      },
    });
  }

  private async migrateLists(tx: any, sourceField: string, sourceId: string, animeId: string) {
    for (const item of await tx.listItem.findMany({ where: { [sourceField]: sourceId }, include: { list: true } })) {
      await this.archive(tx, "listItem", item, animeId);
      let list = item.list;
      if (list.type !== "Anime") {
        const baseName = `${list.name} (Anime)`;
        let name = baseName;
        let suffix = 2;
        while (true) {
          const existing = await tx.list.findUnique({ where: { userId_name: { userId: list.userId, name } } });
          if (!existing || existing.type === "Anime") {
            list =
              existing ??
              (await tx.list.create({
                data: { userId: list.userId, name, type: "Anime", description: list.description },
              }));
            break;
          }
          name = `${baseName} ${suffix++}`;
        }
      }
      const duplicate = await tx.listItem.findUnique({ where: { listId_animeId: { listId: list.id, animeId } } });
      if (duplicate) {
        await tx.activity.updateMany({ where: { listItemId: item.id }, data: { listItemId: duplicate.id } });
        await tx.listItem.delete({ where: { id: item.id } });
      } else {
        await tx.listItem.update({ where: { id: item.id }, data: { listId: list.id, [sourceField]: null, animeId } });
      }
    }
  }
}
