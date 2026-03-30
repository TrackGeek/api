import { Injectable } from "@nestjs/common";
import { FeedEventFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { FeedEventDto } from "../dto/feed-event.dto";
import { GetFeedEventsDto } from "../dto/get-feed-events.dto";
import { GetFeedEventsByUserDto } from "../dto/get-feed-events-by-user.dto";

@Injectable()
export class FeedEventService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createFeedEvent(feedEventDto: FeedEventDto) {
    const { type, userId, metadata } = feedEventDto;

    await this.databaseService.feedEvent.create({
      data: {
        type,
        userId,
        metadata: { ...metadata },
      },
    });
  }

  async getFeedEventsByUserId(getFeedEventsByUserIdDto: GetFeedEventsByUserDto) {
    const userExists = await this.databaseService.user.findUnique({
      where: { id: getFeedEventsByUserIdDto.userId },
    });

    if (!userExists) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    const following = await this.databaseService.following.findMany({
      where: { followerId: getFeedEventsByUserIdDto.userId },
      select: { followingId: true },
    });

    const friendIds = following.map((item) => item.followingId);

    const pagination = await this.databaseService.offsetPagination<FeedEventFindManyArgs>({
      model: "feedEvent",
      page: getFeedEventsByUserIdDto.page,
      itemsPerPage: getFeedEventsByUserIdDto.itemsPerPage,
      where: {
        userId: {
          in: [...friendIds, getFeedEventsByUserIdDto.userId],
        },
      },
      include: {
        _count: {
          select: {
            reactions: true,
          },
        },
        reactions: {
          take: 3,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            emoji: true,
            createdAt: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return pagination;
  }

  async getFeedEvents(getFeedEventsDto: GetFeedEventsDto) {
    const pagination = await this.databaseService.offsetPagination({
      model: "feedEvent",
      orderBy: { createdAt: "desc" },
      page: getFeedEventsDto.page,
      itemsPerPage: getFeedEventsDto.itemsPerPage,
      include: {
        _count: {
          select: {
            reactions: true,
          },
        },
        reactions: {
          take: 3,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            emoji: true,
            createdAt: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    return pagination;
  }
}
