import { Injectable } from "@nestjs/common";
import { ActivityType, ProgressStatus } from "@prisma/generated/enums";
import { FollowingFindManyArgs, UserFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { extractNameFromEmail } from "@/shared/utils/email";
import { GetFollowersDto } from "../dto/get-followers.dto";
import { SearchUserDto } from "../dto/search-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";

type ProgressGroup = {
  status: ProgressStatus;
  _count: { status: number };
};

@Injectable()
export class UserService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async updateUser(updateUserDto: UpdateUserDto) {
    const existingUserWithUsername = await this.databaseService.user.findUnique({
      where: { username: updateUserDto.username },
    });

    if (existingUserWithUsername && existingUserWithUsername.id !== updateUserDto.userId) {
      throw new AppException(ERROR_CODES.USER_USERNAME_ALREADY_EXISTS);
    }

    await this.databaseService.user.update({
      where: { id: updateUserDto.userId },
      data: {
        name: updateUserDto.name,
        username: updateUserDto.username,
        displayUsername: updateUserDto.username,
      },
    });
  }

  async searchUser(searchUserDto: SearchUserDto) {
    const users = await this.databaseService.offsetPagination<UserFindManyArgs>({
      model: "user",
      itemsPerPage: searchUserDto.itemsPerPage,
      page: searchUserDto.page,
      where: {
        OR: [
          { name: { contains: searchUserDto.query, mode: "insensitive" } },
          { username: { contains: searchUserDto.query, mode: "insensitive" } },
        ],
      },
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
    });

    return users;
  }

  async getUserById(id: string) {
    const user = this.databaseService.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
      omit: {
        stripeCustomerId: true,
        accumulatedMoney: true,
        image: true,
      },
    });

    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    return user;
  }

  async getUserByUsername(username: string) {
    const user = await this.databaseService.user.findUnique({
      where: { username },
      include: {
        profile: true,
        _count: {
          select: {
            followers: true,
            following: true,
            lists: true,
            favorites: true,
            animeReviews: true,
            mangaReviews: true,
            tvshowReviews: true,
            movieReviews: true,
            gameReviews: true,
            bookReviews: true,
            gameScreenshots: true,
          },
        },
        userMedals: {
          select: {
            medal: true,
          },
        },
      },
      omit: {
        stripeCustomerId: true,
        accumulatedMoney: true,
        image: true,
      },
    });

    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    // Each bucket is keyed by its first status; repeat statuses fold into the
    // active bucket so a rewatcher still counts as watching.
    const buildStats = (groups: ProgressGroup[], buckets: ProgressStatus[][]) => {
      const total = groups.reduce((sum, g) => sum + g._count.status, 0);

      const getStat = (statuses: ProgressStatus[]) => {
        const count = groups.filter((g) => statuses.includes(g.status)).reduce((sum, g) => sum + g._count.status, 0);

        return { count, percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0 };
      };

      return Object.fromEntries([
        ["total", total],
        ...buckets.map((statuses) => [statuses[0].toLowerCase(), getStat(statuses)]),
      ]);
    };

    const watchingStatuses = [
      [ProgressStatus.Watching, ProgressStatus.Rewatching],
      [ProgressStatus.Completed],
      [ProgressStatus.Paused],
      [ProgressStatus.Dropped],
      [ProgressStatus.Planning],
    ];

    const readingStatuses = [
      [ProgressStatus.Reading, ProgressStatus.Rereading],
      [ProgressStatus.Completed],
      [ProgressStatus.Paused],
      [ProgressStatus.Dropped],
      [ProgressStatus.Planning],
    ];

    const playingStatuses = [
      [ProgressStatus.Playing, ProgressStatus.Replaying],
      [ProgressStatus.Completed],
      [ProgressStatus.Paused],
      [ProgressStatus.Dropped],
      [ProgressStatus.Planning],
    ];

    const [animeGroups, mangaGroups, tvShowGroups, movieGroups, gameGroups, bookGroups] = await Promise.all([
      this.databaseService.animeProgress.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { status: true },
      }),
      this.databaseService.mangaProgress.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { status: true },
      }),
      this.databaseService.tvShowProgress.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { status: true },
      }),
      this.databaseService.movieProgress.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { status: true },
      }),
      this.databaseService.gameProgress.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { status: true },
      }),
      this.databaseService.bookProgress.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { status: true },
      }),
    ]);

    const progressStats = {
      anime: buildStats(animeGroups, watchingStatuses),
      manga: buildStats(mangaGroups, readingStatuses),
      tvShow: buildStats(tvShowGroups, watchingStatuses),
      movie: buildStats(movieGroups, watchingStatuses),
      game: buildStats(gameGroups, playingStatuses),
      book: buildStats(bookGroups, readingStatuses),
    };

    const counts = {
      lists: user._count.lists,
      favorites: user._count.favorites,
      screenshots: user._count.gameScreenshots,
      reviews:
        user._count.animeReviews +
        user._count.mangaReviews +
        user._count.tvshowReviews +
        user._count.movieReviews +
        user._count.gameReviews +
        user._count.bookReviews,
    };

    const reviewModels = [
      { type: "movie", model: this.databaseService.movieReview },
      { type: "tv", model: this.databaseService.tvShowReview },
      { type: "anime", model: this.databaseService.animeReview },
      { type: "game", model: this.databaseService.gameReview },
      { type: "book", model: this.databaseService.bookReview },
      { type: "manga", model: this.databaseService.mangaReview },
    ] as const;

    const latestReviews = await Promise.all(
      reviewModels.map(({ model }) =>
        (model as { findFirst: (args: unknown) => Promise<{ createdAt: Date } | null> }).findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ),
    );

    let latestReviewType: string | null = null;
    let latestReviewDate = 0;

    reviewModels.forEach(({ type }, index) => {
      const createdAt = latestReviews[index]?.createdAt;

      if (createdAt && createdAt.getTime() > latestReviewDate) {
        latestReviewDate = createdAt.getTime();
        latestReviewType = type;
      }
    });

    const progressModels = [
      { type: "movie", model: this.databaseService.movieProgress },
      { type: "tv", model: this.databaseService.tvShowProgress },
      { type: "anime", model: this.databaseService.animeProgress },
      { type: "game", model: this.databaseService.gameProgress },
      { type: "book", model: this.databaseService.bookProgress },
      { type: "manga", model: this.databaseService.mangaProgress },
    ] as const;

    const latestProgresses = await Promise.all(
      progressModels.map(({ model }) =>
        (model as { findFirst: (args: unknown) => Promise<{ updatedAt: Date } | null> }).findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
      ),
    );

    let latestProgressType: string | null = null;
    let latestProgressDate = 0;

    progressModels.forEach(({ type }, index) => {
      const updatedAt = latestProgresses[index]?.updatedAt;

      if (updatedAt && updatedAt.getTime() > latestProgressDate) {
        latestProgressDate = updatedAt.getTime();
        latestProgressType = type;
      }
    });

    const latestFavorite = await this.databaseService.favorite.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { type: true },
    });

    const latestFavoriteType = latestFavorite?.type ?? null;

    return { ...user, progressStats, counts, latestReviewType, latestProgressType, latestFavoriteType };
  }

  getName(name: string | null | undefined, email: string) {
    return name && name?.length > 0 ? name : extractNameFromEmail(email);
  }

  async getUsername(email: string) {
    const emailPrefix = email.split("@")[0];

    const baseUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, "");

    const usernameExists = await this.databaseService.user.findUnique({
      where: { username: baseUsername },
    });

    const username = usernameExists ? `${baseUsername}${Math.floor(Math.random() * 10000)}` : baseUsername;

    return username;
  }

  async followUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new AppException(ERROR_CODES.USER_CANNOT_FOLLOW_SELF);
    }

    const existingFollow = await this.databaseService.following.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      throw new AppException(ERROR_CODES.USER_ALREADY_FOLLOWING);
    }

    const following = await this.databaseService.following.create({
      data: {
        followerId: userId,
        followingId: targetUserId,
      },
      include: {
        follower: {
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
        following: {
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

    await this.queueService.toActivityJob({
      type: ActivityType.Followed,
      userId,
      followingId: following.id,
      metadata: { ...following },
    });
  }

  async unfollowUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new AppException(ERROR_CODES.USER_CANNOT_UNFOLLOW_SELF);
    }

    const existingFollow = await this.databaseService.following.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (!existingFollow) {
      throw new AppException(ERROR_CODES.USER_NOT_FOLLOWING);
    }

    await this.databaseService.following.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });
  }

  async getFollowStatus(currentUserId: string, username: string) {
    const targetUser = await this.databaseService.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!targetUser) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    const [isFollowing, followsYou] = await Promise.all([
      this.databaseService.following.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUser.id,
          },
        },
      }),
      this.databaseService.following.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUser.id,
            followingId: currentUserId,
          },
        },
      }),
    ]);

    return {
      isFollowing: Boolean(isFollowing),
      followsYou: Boolean(followsYou),
    };
  }

  async getFollowers(getFollowersDto: GetFollowersDto) {
    const followers = await this.databaseService.offsetPagination<FollowingFindManyArgs>({
      model: "following",
      itemsPerPage: getFollowersDto.itemsPerPage,
      page: getFollowersDto.page,
      where: { followingId: getFollowersDto.userId },
      include: {
        follower: {
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

    return followers;
  }

  async getFollowing(getFollowingDto: GetFollowersDto) {
    const following = await this.databaseService.offsetPagination<FollowingFindManyArgs>({
      model: "following",
      itemsPerPage: getFollowingDto.itemsPerPage,
      page: getFollowingDto.page,
      where: { followerId: getFollowingDto.userId },
      include: {
        following: {
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

    return following;
  }
}
