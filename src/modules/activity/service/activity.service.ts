import { Injectable } from "@nestjs/common";
import { ActivityType } from "@prisma/generated/enums";
import { ActivityFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CreateActivityDto } from "../dto/activity.dto";
import { GetActivitiesDto } from "../dto/get-activities.dto";
import { GetActivitiesByUserDto } from "../dto/get-activities-by-user.dto";
import { GetActivitiesByUserFollowingDto } from "../dto/get-activities-by-user-following.dto";
import { SyncWatchedActivityDto } from "../dto/sync-watched-activity.dto";

const TRENDING_WINDOW_DAYS = 7;

const SOURCE_FIELDS = [
  "listId",
  "listItemId",
  "favoriteId",
  "animeReviewId",
  "mangaReviewId",
  "tvShowReviewId",
  "movieReviewId",
  "gameReviewId",
  "bookReviewId",
  "animeProgressId",
  "mangaProgressId",
  "tvShowProgressId",
  "movieProgressId",
  "gameProgressId",
  "bookProgressId",
  "animeEpisodeWatchId",
  "tvShowEpisodeWatchId",
  "followingId",
  "userMedalId",
  "gameScreenshotId",
  "postId",
] as const;

const ANIME_SELECT = { select: { id: true, malId: true, title: true, imageUrl: true } };
const MANGA_SELECT = { select: { id: true, anilistId: true, malId: true, title: true, imageUrl: true } };
const TVSHOW_SELECT = { select: { id: true, tmdbId: true, name: true, posterUrl: true } };
const MOVIE_SELECT = { select: { id: true, tmdbId: true, title: true, posterUrl: true } };
const GAME_SELECT = { select: { id: true, igdbId: true, name: true, coverUrl: true } };
const BOOK_SELECT = { select: { id: true, hardcoverId: true, title: true, imageUrl: true } };

const PERSON_SELECT = { select: { id: true, slug: true, name: true, imageUrl: true } };

const POLY_MEDIA = {
  anime: ANIME_SELECT,
  manga: MANGA_SELECT,
  tvShow: TVSHOW_SELECT,
  movie: MOVIE_SELECT,
  game: GAME_SELECT,
  book: BOOK_SELECT,
};

const USER_SELECT = {
  select: {
    id: true,
    name: true,
    username: true,
    profile: { select: { avatarUrl: true } },
  },
};

const INCLUDE = {
  _count: {
    select: {
      reactions: true,
    },
  },
  reactions: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      emoji: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  },
  user: USER_SELECT,
  animeReview: {
    select: {
      id: true,
      overall: true,
      story: true,
      characters: true,
      animation: true,
      sound: true,
      enjoyment: true,
      summary: true,
      anime: ANIME_SELECT,
    },
  },
  mangaReview: {
    select: {
      id: true,
      overall: true,
      art: true,
      worldbuilding: true,
      story: true,
      characters: true,
      summary: true,
      manga: MANGA_SELECT,
    },
  },
  tvShowReview: {
    select: {
      id: true,
      overall: true,
      direction: true,
      production: true,
      acting: true,
      story: true,
      summary: true,
      tvShow: TVSHOW_SELECT,
    },
  },
  movieReview: {
    select: {
      id: true,
      overall: true,
      direction: true,
      production: true,
      acting: true,
      story: true,
      summary: true,
      movie: MOVIE_SELECT,
    },
  },
  gameReview: {
    select: {
      id: true,
      overall: true,
      graphics: true,
      sound: true,
      story: true,
      gameplay: true,
      summary: true,
      game: GAME_SELECT,
    },
  },
  bookReview: {
    select: {
      id: true,
      overall: true,
      characters: true,
      language: true,
      theme: true,
      summary: true,
      book: BOOK_SELECT,
    },
  },
  animeProgress: { select: { id: true, status: true, anime: ANIME_SELECT } },
  mangaProgress: { select: { id: true, status: true, manga: MANGA_SELECT } },
  tvShowProgress: { select: { id: true, status: true, tvShow: TVSHOW_SELECT } },
  movieProgress: { select: { id: true, status: true, movie: MOVIE_SELECT } },
  gameProgress: { select: { id: true, status: true, game: GAME_SELECT } },
  bookProgress: { select: { id: true, status: true, book: BOOK_SELECT } },
  anime: ANIME_SELECT,
  tvShow: TVSHOW_SELECT,
  list: { select: { id: true, name: true } },
  listItem: { select: { id: true, ...POLY_MEDIA } },
  favorite: { select: { id: true, type: true, ...POLY_MEDIA, person: PERSON_SELECT } },
  gameScreenshot: {
    select: {
      id: true,
      url: true,
      type: true,
      provider: true,
      description: true,
      isSpoiler: true,
      game: GAME_SELECT,
    },
  },
  post: {
    select: {
      id: true,
      content: true,
      isSpoiler: true,
      createdAt: true,
      updatedAt: true,
      ...POLY_MEDIA,
    },
  },
  following: { select: { id: true, following: USER_SELECT } },
  userMedal: { select: { id: true, medal: { select: { id: true, name: true, imageUrl: true } } } },
};

@Injectable()
export class ActivityService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createActivity(createActivityDto: CreateActivityDto) {
    const { type, userId, metadata } = createActivityDto;

    const source = SOURCE_FIELDS.reduce<Record<string, string>>((acc, field) => {
      const value = createActivityDto[field];

      if (value) {
        acc[field] = value;
      }

      return acc;
    }, {});

    if (Object.keys(source).length > 0) {
      await this.databaseService.activity.deleteMany({ where: source });
    }

    await this.databaseService.activity.create({
      data: {
        type,
        userId,
        ...source,
        ...(metadata && { metadata: { ...metadata } }),
      },
    });
  }

  async syncWatchedActivity(syncWatchedActivityDto: SyncWatchedActivityDto) {
    const WINDOW_MS = 60 * 60 * 1000;
    const { userId, animeId, tvShowId, episodes } = syncWatchedActivityDto;

    if (episodes.length === 0) return;

    const min = Math.min(...episodes);
    const max = Math.max(...episodes);
    const seriesWhere = animeId ? { animeId } : { tvShowId };

    const recent = await this.databaseService.activity.findFirst({
      where: { userId, type: ActivityType.Watched, ...seriesWhere },
      orderBy: { createdAt: "desc" },
    });

    if (recent && Date.now() - recent.createdAt.getTime() <= WINDOW_MS) {
      const meta = (recent.metadata ?? {}) as { from?: number; to?: number; count?: number };

      await this.databaseService.activity.update({
        where: { id: recent.id },
        data: {
          metadata: {
            from: Math.min(meta.from ?? min, min),
            to: Math.max(meta.to ?? max, max),
            count: (meta.count ?? 0) + episodes.length,
          },
        },
      });

      return;
    }

    await this.databaseService.activity.create({
      data: {
        type: ActivityType.Watched,
        userId,
        ...seriesWhere,
        metadata: { from: min, to: max, count: episodes.length },
      },
    });
  }

  async getActivitiesByUserId(getActivitiesByUserIdDto: GetActivitiesByUserDto, friendIds: string[] = []) {
    const userExists = await this.databaseService.user.findUnique({
      where: { id: getActivitiesByUserIdDto.userId },
    });

    if (!userExists) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    const pagination = await this.databaseService.offsetPagination<ActivityFindManyArgs>({
      model: "activity",
      page: getActivitiesByUserIdDto.page,
      itemsPerPage: getActivitiesByUserIdDto.itemsPerPage,
      where: {
        userId: {
          in: [...friendIds, getActivitiesByUserIdDto.userId],
        },
      },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return { ...pagination, items: this.groupActivities(pagination.items) };
  }

  async getActivitiesByUserFollowing(getActivitiesByUserIdDto: GetActivitiesByUserFollowingDto) {
    const following = await this.databaseService.following.findMany({
      where: { followerId: getActivitiesByUserIdDto.userId },
      select: { followingId: true },
    });

    const friendIds = following.map((item) => item.followingId);

    return this.getActivitiesByUserId(
      { ...getActivitiesByUserIdDto, userId: getActivitiesByUserIdDto.userId },
      friendIds,
    );
  }

  async getActivities(getActivitiesDto: GetActivitiesDto) {
    const pagination = await this.databaseService.offsetPagination<ActivityFindManyArgs>({
      model: "activity",
      orderBy: { createdAt: "desc" },
      page: getActivitiesDto.page,
      itemsPerPage: getActivitiesDto.itemsPerPage,
      include: INCLUDE,
    });

    return { ...pagination, items: this.groupActivities(pagination.items) };
  }

  async getTrendingActivities(getActivitiesDto: GetActivitiesDto) {
    const since = new Date();
    since.setDate(since.getDate() - TRENDING_WINDOW_DAYS);

    const pagination = await this.databaseService.offsetPagination<ActivityFindManyArgs>({
      model: "activity",
      orderBy: [{ reactions: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }],
      where: {
        createdAt: { gte: since },
        reactions: { some: {} },
      },
      page: getActivitiesDto.page,
      itemsPerPage: getActivitiesDto.itemsPerPage,
      include: INCLUDE,
    });

    const items = pagination.items.map((item: any) => ({
      type: item.type,
      userId: item.userId,
      createdAt: item.createdAt,
      count: 1,
      items: [item],
    }));

    return { ...pagination, items };
  }

  private groupActivities(items: any[]) {
    const WINDOW_MS = 60 * 60 * 1000;
    const groups: any[] = [];

    for (const item of items) {
      const last = groups[groups.length - 1];
      const sameGroup =
        last &&
        item.type !== ActivityType.Watched &&
        item.type !== ActivityType.PostCreated &&
        last.type === item.type &&
        last.userId === item.userId &&
        (item.type !== ActivityType.ScreenshotAdded ||
          last.items[0]?.gameScreenshot?.game?.id === item.gameScreenshot?.game?.id) &&
        new Date(last.createdAt).getTime() - new Date(item.createdAt).getTime() <= WINDOW_MS;

      if (sameGroup) {
        last.items.push(item);
        last.count += 1;
      } else {
        groups.push({
          type: item.type,
          userId: item.userId,
          createdAt: item.createdAt,
          count: 1,
          items: [item],
        });
      }
    }

    return groups;
  }

  async getUserActivityCalendarById(userId: string) {
    const userExists = await this.databaseService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 364);

    const activities = await this.databaseService.activity.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const groupedByDate = new Map<string, number>();

    for (const { createdAt } of activities) {
      const date = createdAt.toISOString().split("T")[0];
      const currentCount = groupedByDate.get(date) ?? 0;

      groupedByDate.set(date, currentCount + 1);
    }

    return {
      total: activities.length,
      items: [...groupedByDate.entries()].map(([date, count]) => ({
        date,
        count,
      })),
    };
  }
}
