import { Injectable } from "@nestjs/common";
import { CommentType, NotificationType, ReactionType } from "@prisma/generated/enums";
import { NotificationFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { GetNotificationsByUserDto } from "../dto/get-notifications.dto";
import {
  CreateCommentNotificationDto,
  CreateReactionNotificationDto,
  CreateSystemNotificationDto,
} from "../dto/notification.dto";

const REACTION_TARGETS = {
  [ReactionType.Comment]: { type: NotificationType.ReactionOnComment, relation: "comment", sourceField: "commentId" },
  [ReactionType.Activity]: {
    type: NotificationType.ReactionOnActivity,
    relation: "activity",
    sourceField: "activityId",
  },
  [ReactionType.AnimeReview]: {
    type: NotificationType.ReactionOnAnimeReview,
    relation: "animeReview",
    sourceField: "animeReviewId",
  },
  [ReactionType.MangaReview]: {
    type: NotificationType.ReactionOnMangaReview,
    relation: "mangaReview",
    sourceField: "mangaReviewId",
  },
  [ReactionType.TvShowReview]: {
    type: NotificationType.ReactionOnTvShowReview,
    relation: "tvShowReview",
    sourceField: "tvShowReviewId",
  },
  [ReactionType.MovieReview]: {
    type: NotificationType.ReactionOnMovieReview,
    relation: "movieReview",
    sourceField: "movieReviewId",
  },
  [ReactionType.GameReview]: {
    type: NotificationType.ReactionOnGameReview,
    relation: "gameReview",
    sourceField: "gameReviewId",
  },
  [ReactionType.BookReview]: {
    type: NotificationType.ReactionOnBookReview,
    relation: "bookReview",
    sourceField: "bookReviewId",
  },
} as const;

const OWNER_SELECT = { select: { userId: true } };

const ACTOR_SELECT = {
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
};

@Injectable()
export class NotificationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createSystemNotification({ recipientIds, metadata }: CreateSystemNotificationDto) {
    await this.databaseService.notification.createMany({
      data: recipientIds.map((recipientId) => ({
        type: NotificationType.System,
        recipientId,
        metadata: { ...metadata },
      })),
    });
  }

  async createFromComment({ commentId }: CreateCommentNotificationDto) {
    const comment = await this.databaseService.comment.findUnique({
      where: { id: commentId },
      include: { profile: OWNER_SELECT },
    });

    if (!comment || comment.type !== CommentType.Profile || !comment.profile) {
      return;
    }

    const recipientId = comment.profile.userId;

    if (recipientId === comment.userId) {
      return;
    }

    await this.databaseService.notification.create({
      data: {
        type: NotificationType.CommentOnProfile,
        recipientId,
        actorId: comment.userId,
        commentId: comment.id,
        profileId: comment.profileId,
      },
    });
  }

  async createFromReaction({ reactionId }: CreateReactionNotificationDto) {
    const reaction = await this.databaseService.reaction.findUnique({
      where: { id: reactionId },
      include: {
        comment: OWNER_SELECT,
        activity: OWNER_SELECT,
        animeReview: OWNER_SELECT,
        mangaReview: OWNER_SELECT,
        tvShowReview: OWNER_SELECT,
        movieReview: OWNER_SELECT,
        gameReview: OWNER_SELECT,
        bookReview: OWNER_SELECT,
      },
    });

    if (!reaction) {
      return;
    }

    const target = REACTION_TARGETS[reaction.type];
    const owner = reaction[target.relation];
    const sourceId = reaction[target.sourceField];

    if (!owner || !sourceId || owner.userId === reaction.userId) {
      return;
    }

    await this.databaseService.notification.create({
      data: {
        type: target.type,
        recipientId: owner.userId,
        actorId: reaction.userId,
        reactionId: reaction.id,
        [target.sourceField]: sourceId,
      },
    });
  }

  async getNotifications({ userId, read, page, itemsPerPage }: GetNotificationsByUserDto) {
    const pagination = await this.databaseService.offsetPagination<NotificationFindManyArgs>({
      model: "notification",
      where: {
        recipientId: userId,
        ...(read !== undefined && { readAt: read ? { not: null } : null }),
      },
      page,
      itemsPerPage,
      orderBy: { createdAt: "desc" },
      include: {
        actor: ACTOR_SELECT,
        comment: {
          select: {
            id: true,
            type: true,
            content: true,
          },
        },
        reaction: {
          select: {
            id: true,
            type: true,
            emoji: true,
          },
        },
      },
    });

    return pagination;
  }

  async getUnreadCount(userId: string) {
    const count = await this.databaseService.notification.count({
      where: { recipientId: userId, readAt: null },
    });

    return count;
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.updateReadAt(userId, notificationId, new Date());
  }

  async markAsUnread(userId: string, notificationId: string) {
    await this.updateReadAt(userId, notificationId, null);
  }

  async markAllAsRead(userId: string) {
    await this.databaseService.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllAsUnread(userId: string) {
    await this.databaseService.notification.updateMany({
      where: { recipientId: userId, readAt: { not: null } },
      data: { readAt: null },
    });
  }

  async deleteNotification(userId: string, notificationId: string) {
    const { count } = await this.databaseService.notification.deleteMany({
      where: { id: notificationId, recipientId: userId },
    });

    if (count === 0) {
      throw new AppException(ERROR_CODES.NOTIFICATION_NOT_FOUND);
    }
  }

  async deleteAllNotifications(userId: string) {
    await this.databaseService.notification.deleteMany({
      where: { recipientId: userId },
    });
  }

  private async updateReadAt(userId: string, notificationId: string, readAt: Date | null) {
    const { count } = await this.databaseService.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { readAt },
    });

    if (count === 0) {
      throw new AppException(ERROR_CODES.NOTIFICATION_NOT_FOUND);
    }
  }
}
