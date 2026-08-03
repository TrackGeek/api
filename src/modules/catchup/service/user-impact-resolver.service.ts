import { Injectable } from "@nestjs/common";
import { CatchupMediaType, ProgressStatus, ReleaseEventType } from "@prisma/generated/enums";
import { ReleaseEvent } from "@prisma/generated/models";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CATCHUP_MEDIA_CONFIG } from "../constants/media-config";
import { ImpactedUser } from "../types/catchup.types";
import { CatchupFlagsService } from "./catchup-flags.service";

@Injectable()
export class UserImpactResolverService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly catchupFlagsService: CatchupFlagsService,
  ) {}

  async resolve(releaseEvent: ReleaseEvent): Promise<ImpactedUser[]> {
    if (releaseEvent.type === ReleaseEventType.SequelAdded) {
      return this.resolveSequelAudience(releaseEvent);
    }

    const config = CATCHUP_MEDIA_CONFIG[releaseEvent.mediaType];
    const titleId = releaseEvent[config.eventForeignKey];

    if (!titleId) {
      return [];
    }

    const statuses = this.statusesFor(releaseEvent.mediaType);

    const progresses = await this.progressModel(releaseEvent.mediaType).findMany({
      where: { [config.progressForeignKey]: titleId, status: { in: statuses } },
      select: { id: true, userId: true, status: true },
    });

    const impacted = new Map<string, ImpactedUser>();

    for (const progress of progresses) {
      impacted.set(progress.userId, { userId: progress.userId, progressId: progress.id, status: progress.status });
    }

    if (releaseEvent.mediaType === CatchupMediaType.Game) {
      const favorites = await this.databaseService.favorite.findMany({
        where: { gameId: titleId },
        select: { userId: true },
      });

      for (const favorite of favorites) {
        if (!impacted.has(favorite.userId)) {
          impacted.set(favorite.userId, { userId: favorite.userId, progressId: null, status: null });
        }
      }
    }

    return [...impacted.values()];
  }

  private async resolveSequelAudience(releaseEvent: ReleaseEvent): Promise<ImpactedUser[]> {
    const payload = (releaseEvent.rawPayload ?? {}) as Record<string, unknown>;
    const prequelAnimeId = typeof payload.prequelAnimeId === "string" ? payload.prequelAnimeId : null;

    if (!prequelAnimeId) {
      return [];
    }

    const progresses = await this.databaseService.animeProgress.findMany({
      where: { animeId: prequelAnimeId, status: ProgressStatus.Completed },
      select: { id: true, userId: true, status: true },
    });

    return progresses.map((progress) => ({
      userId: progress.userId,
      progressId: progress.id,
      status: progress.status,
    }));
  }

  private statusesFor(mediaType: CatchupMediaType): ProgressStatus[] {
    const config = CATCHUP_MEDIA_CONFIG[mediaType];
    const { notifyPlanToWatchReleases, notifyOnHoldUsers } = this.catchupFlagsService.flags;

    const statuses = new Set<ProgressStatus>(config.interestStatuses);

    if (notifyPlanToWatchReleases || mediaType === CatchupMediaType.Game) {
      for (const status of config.planningStatuses) {
        statuses.add(status);
      }
    }

    if (notifyOnHoldUsers) {
      for (const status of config.onHoldStatuses) {
        statuses.add(status);
      }
    }

    return [...statuses];
  }

  private progressModel(mediaType: CatchupMediaType) {
    return this.databaseService[CATCHUP_MEDIA_CONFIG[mediaType].progressModel] as any;
  }
}
