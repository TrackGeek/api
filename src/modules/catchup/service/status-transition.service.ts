import { Injectable } from "@nestjs/common";
import { ProgressStatus, ReleaseEventType } from "@prisma/generated/enums";
import { ReleaseEvent } from "@prisma/generated/models";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { STATUS_TRANSITION_REASONS } from "../constants/catchup.constants";
import { CATCHUP_MEDIA_CONFIG } from "../constants/media-config";
import { ImpactedUser } from "../types/catchup.types";
import { CatchupFlagsService } from "./catchup-flags.service";

const REOPEN_EVENT_REASONS: Partial<Record<ReleaseEventType, string>> = {
  [ReleaseEventType.NewEpisodeReleased]: STATUS_TRANSITION_REASONS.NEW_EPISODE_RELEASED,
  [ReleaseEventType.NewChapterReleased]: STATUS_TRANSITION_REASONS.NEW_CHAPTER_RELEASED,
};

@Injectable()
export class StatusTransitionService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly catchupFlagsService: CatchupFlagsService,
  ) {}

  async autoReopenCompletedIfNeeded(user: ImpactedUser, releaseEvent: ReleaseEvent): Promise<boolean> {
    const flags = this.catchupFlagsService.flags;
    const config = CATCHUP_MEDIA_CONFIG[releaseEvent.mediaType];
    const reason = REOPEN_EVENT_REASONS[releaseEvent.type];

    if (!flags.autoReopenCompletedOnNewContent || !config.supportsAutoReopen || !reason) {
      return false;
    }

    if (flags.ignoreSpecialContentForReopen && releaseEvent.isAccessory) {
      return false;
    }

    if (!user.progressId || user.status !== ProgressStatus.Completed) {
      return false;
    }

    const { count } = await this.progressModel(releaseEvent).updateMany({
      where: { id: user.progressId, status: ProgressStatus.Completed },
      data: { status: config.activeStatus },
    });

    if (count === 0) {
      return false;
    }

    await this.databaseService.statusTransitionLog.createMany({
      data: [
        {
          userId: user.userId,
          mediaType: releaseEvent.mediaType,
          fromStatus: ProgressStatus.Completed,
          toStatus: config.activeStatus,
          reason,
          releaseEventId: releaseEvent.id,
        },
      ],
      skipDuplicates: true,
    });

    return true;
  }

  private progressModel(releaseEvent: ReleaseEvent) {
    return this.databaseService[CATCHUP_MEDIA_CONFIG[releaseEvent.mediaType].progressModel] as any;
  }
}
