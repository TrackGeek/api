import { Injectable } from "@nestjs/common";
import { NotificationType, ReleaseEventType } from "@prisma/generated/enums";
import { ReleaseEvent } from "@prisma/generated/models";
import { NotificationPreferences } from "@/modules/notification/dto/notification-preference.dto";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CATCHUP_MEDIA_CONFIG } from "../constants/media-config";

interface ReleaseNotificationTarget {
  readonly type: NotificationType;
  readonly category: keyof NotificationPreferences;
}

const RELEASE_NOTIFICATION_TARGETS: Record<ReleaseEventType, ReleaseNotificationTarget> = {
  [ReleaseEventType.NewEpisodeReleased]: { type: NotificationType.NewEpisodeReleased, category: "newEpisode" },
  [ReleaseEventType.NewChapterReleased]: { type: NotificationType.NewChapterReleased, category: "newChapter" },
  [ReleaseEventType.NewGameReleased]: { type: NotificationType.NewGameReleased, category: "gameRelease" },
  [ReleaseEventType.SequelAdded]: { type: NotificationType.SequelAdded, category: "sequelAdded" },
};

const DEFAULT_PREFERENCES: Pick<
  NotificationPreferences,
  "newEpisode" | "newChapter" | "gameRelease" | "sequelAdded" | "reopenedCompleted"
> = {
  newEpisode: true,
  newChapter: true,
  gameRelease: true,
  sequelAdded: true,
  reopenedCompleted: true,
};

export interface DispatchReleaseNotificationsParams {
  readonly releaseEvent: ReleaseEvent;
  readonly userIds: string[];
  readonly reopenedUserIds?: string[];
}

@Injectable()
export class CatchupNotificationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async dispatch({
    releaseEvent,
    userIds,
    reopenedUserIds = [],
  }: DispatchReleaseNotificationsParams): Promise<number> {
    if (userIds.length === 0) {
      return 0;
    }

    const target = RELEASE_NOTIFICATION_TARGETS[releaseEvent.type];
    const reopened = new Set(reopenedUserIds);

    const preferences = await this.databaseService.notificationPreference.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        newEpisode: true,
        newChapter: true,
        gameRelease: true,
        sequelAdded: true,
        reopenedCompleted: true,
      },
    });

    const preferenceByUser = new Map(preferences.map((preference) => [preference.userId, preference]));

    const recipients = userIds.filter((userId) => {
      const preference = preferenceByUser.get(userId) ?? DEFAULT_PREFERENCES;

      if (!preference[target.category]) {
        return false;
      }

      return !(reopened.has(userId) && !preference.reopenedCompleted);
    });

    if (recipients.length === 0) {
      return 0;
    }

    const { count } = await this.databaseService.notification.createMany({
      data: recipients.map((recipientId) => ({
        type: target.type,
        recipientId,
        releaseEventId: releaseEvent.id,
        metadata: this.buildMetadata(releaseEvent, reopened.has(recipientId)),
      })),
      skipDuplicates: true,
    });

    return count;
  }

  private buildMetadata(releaseEvent: ReleaseEvent, reopened: boolean) {
    const config = CATCHUP_MEDIA_CONFIG[releaseEvent.mediaType];

    return {
      mediaType: releaseEvent.mediaType,
      eventType: releaseEvent.type,
      title: releaseEvent.title,
      unitTitle: releaseEvent.unitTitle,
      unitNumber: releaseEvent.unitNumber,
      containerNumber: releaseEvent.containerNumber,
      externalId: releaseEvent.externalId,
      releaseAt: releaseEvent.releaseAt.toISOString(),
      titleId: releaseEvent[config.eventForeignKey],
      reopened,
    };
  }
}

export { RELEASE_NOTIFICATION_TARGETS };
