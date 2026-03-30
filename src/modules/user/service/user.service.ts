import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { extractNameFromEmail } from "@/shared/utils/email";
import { GetFollowersDto } from "../dto/get-followers.dto";
import { FollowingFindManyArgs, UserFindManyArgs } from "@prisma/generated/models";
import { SearchUserDto } from "../dto/search-user.dto";

@Injectable()
export class UserService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

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
    const user = this.databaseService.user.findUnique({
      where: { username },
      include: {
        profile: true,
        _count: {
          select: {
            followers: true,
            following: true,
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

    return user;
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

    await this.queueService.toFeedEventJob({
      type: FeedEventType.NewFollower,
      userId,
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
