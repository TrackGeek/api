import { Injectable } from "@nestjs/common";
import { ContentType } from "@prisma/generated/enums";
import { GameProgressFindManyArgs } from "@prisma/generated/models";
import { activityTypeFromProgressStatus, xpReasonFromProgressStatus } from "@/modules/activity/activity.utils";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { XP_SOURCE_KEYS } from "@/shared/constants/xp";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { MediaFilterService } from "@/shared/media-filter/media-filter.service";
import { buildMediaWhere, buildProgressOrderBy } from "@/shared/media-filter/media-filter.util";
import { CreateOrUpdateGameProgressDto } from "../dto/create-or-update-game-progress.dto";
import { GetGameProgressDto } from "../dto/get-game-progress.dto";

@Injectable()
export class GameProgressService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly mediaFilterService: MediaFilterService,
  ) {}

  async createOrUpdateGameProgress(createOrUpdateGameProgressDto: CreateOrUpdateGameProgressDto) {
    const { gameId, userId, status, playCount, completion, hoursPlayed, platforms, notes, completedAt, startedAt } =
      createOrUpdateGameProgressDto;

    const playedPlatforms = platforms && (await this.resolveGamePlatforms(gameId, platforms));

    const gameProgress = await this.databaseService.gameProgress.upsert({
      where: {
        userId_gameId: {
          userId,
          gameId,
        },
      },
      update: {
        status,
        playCount,
        completion,
        hoursPlayed,
        ...(playedPlatforms && { platforms: playedPlatforms }),
        notes,
        completedAt,
        startedAt,
      },
      create: {
        gameId,
        userId,
        playCount,
        completion,
        hoursPlayed,
        platforms: playedPlatforms ?? [],
        notes,
        status,
        completedAt,
        startedAt,
      },
      include: {
        game: {
          select: {
            id: true,
            igdbId: true,
            coverUrl: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            profile: {
              select: {
                id: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const activityType = activityTypeFromProgressStatus(status);

    if (activityType) {
      await this.queueService.toActivityJob({
        type: activityType,
        userId,
        gameProgressId: gameProgress.id,
        metadata: { ...gameProgress },
      });
    }

    const xpReason = xpReasonFromProgressStatus(status);

    if (xpReason) {
      await this.queueService.toXpJob({
        userId,
        reason: xpReason,
        contentType: ContentType.Game,
        sourceKey: XP_SOURCE_KEYS.progress(xpReason, ContentType.Game, gameId),
      });
    }
  }

  private async resolveGamePlatforms(gameId: string, platforms: string[]) {
    const game = await this.databaseService.game.findUnique({
      where: { id: gameId },
      select: { platforms: true },
    });

    if (!game) {
      throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
    }

    const available = (game.platforms ?? []) as unknown as { name?: string | null; slug?: string | null }[];

    const slugByToken = new Map<string, string>();

    for (const platform of available) {
      if (!platform?.slug) continue;

      slugByToken.set(platform.slug.toLowerCase(), platform.slug);

      if (platform.name) {
        slugByToken.set(platform.name.toLowerCase(), platform.slug);
      }
    }

    const resolved = new Set<string>();

    for (const platform of platforms) {
      const slug = slugByToken.get(platform.trim().toLowerCase());

      if (!slug) {
        throw new AppException(ERROR_CODES.INVALID_GAME_PLATFORMS);
      }

      resolved.add(slug);
    }

    return [...resolved];
  }

  async deleteGameProgress(gameProgressId: string, userId: string) {
    const gameProgress = await this.databaseService.gameProgress.findUnique({
      where: { id: gameProgressId },
      select: { userId: true },
    });

    if (!gameProgress || gameProgress.userId !== userId) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await this.databaseService.gameProgress.delete({
      where: { id: gameProgressId },
    });
  }

  async getGameProgress(getGameProgressDto: GetGameProgressDto) {
    const mediaWhere = buildMediaWhere("game", getGameProgressDto);

    const where = {
      ...(getGameProgressDto.gameId && { gameId: getGameProgressDto.gameId }),
      ...(getGameProgressDto.userId && { userId: getGameProgressDto.userId }),
      ...(mediaWhere && { game: mediaWhere }),
    };

    const [gameProgresses, statusCounts] = await Promise.all([
      this.databaseService.offsetPagination<GameProgressFindManyArgs>({
        model: "gameProgress",
        itemsPerPage: getGameProgressDto.itemsPerPage,
        page: getGameProgressDto.page,
        where: {
          ...where,
          ...(getGameProgressDto.status && { status: getGameProgressDto.status }),
        },
        orderBy: buildProgressOrderBy("game", getGameProgressDto),
        include: {
          game: {
            select: {
              id: true,
              igdbId: true,
              coverUrl: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              profile: {
                select: {
                  id: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.mediaFilterService.countProgressByStatus("gameProgress", where),
    ]);

    return { gameProgresses, statusCounts };
  }

  async getGameProgressFilters(userId: string) {
    return this.mediaFilterService.getFilterOptions("game", userId);
  }
}
