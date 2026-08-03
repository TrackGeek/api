import { Injectable, Logger } from "@nestjs/common";
import { CATCHUP_AUDIT_ACTIONS } from "../constants/catchup.constants";
import { createEmptyRunStats, CatchupRunStats, NormalizedRelease } from "../types/catchup.types";
import { CatchupAuditService } from "./catchup-audit.service";
import { CatchupNotificationService } from "./catchup-notification.service";
import { CatchupRunService } from "./catchup-run.service";
import { DailyReleaseIngestorService } from "./daily-release-ingestor.service";
import { ReleaseEventService } from "./release-event.service";
import { ReleaseMatcherService } from "./release-matcher.service";
import { ReleaseNormalizerService } from "./release-normalizer.service";
import { StatusTransitionService } from "./status-transition.service";
import { UserImpactResolverService } from "./user-impact-resolver.service";

@Injectable()
export class CatchupService {
  private readonly logger = new Logger(CatchupService.name);

  constructor(
    private readonly catchupRunService: CatchupRunService,
    private readonly dailyReleaseIngestorService: DailyReleaseIngestorService,
    private readonly releaseNormalizerService: ReleaseNormalizerService,
    private readonly releaseMatcherService: ReleaseMatcherService,
    private readonly releaseEventService: ReleaseEventService,
    private readonly userImpactResolverService: UserImpactResolverService,
    private readonly statusTransitionService: StatusTransitionService,
    private readonly catchupNotificationService: CatchupNotificationService,
    private readonly catchupAuditService: CatchupAuditService,
  ) {}

  async runDailyCatchup(runDate: Date = new Date()): Promise<CatchupRunStats> {
    const run = await this.catchupRunService.start(runDate);
    const stats = createEmptyRunStats();

    try {
      const externalReleases = await this.dailyReleaseIngestorService.fetchReleases(runDate, run.id);
      stats.externalReceived = externalReleases.length;

      const { normalized, discarded } = this.releaseNormalizerService.normalizeMany(externalReleases, runDate);
      stats.normalized = normalized.length;
      stats.discarded += discarded.length;

      for (const item of discarded) {
        await this.catchupAuditService.record(
          CATCHUP_AUDIT_ACTIONS.INVALID_PAYLOAD_DISCARDED,
          { item: item as unknown as Record<string, unknown> },
          run.id,
        );
      }

      for (const release of normalized) {
        await this.processRelease(release, run.id, stats);
      }

      await this.catchupRunService.finishSuccess(run.id, stats);

      this.logger.log(
        `Catch-up run finished | run=${run.id} received=${stats.externalReceived} events=${stats.eventsCreated} ` +
          `users=${stats.usersImpacted} reopened=${stats.reopened} notifications=${stats.notificationsCreated}`,
      );

      return stats;
    } catch (error) {
      await this.catchupRunService.finishFailure(run.id, error, stats);

      throw error;
    }
  }

  private async processRelease(release: NormalizedRelease, runId: string, stats: CatchupRunStats) {
    try {
      const outcome = await this.releaseMatcherService.findInternalTitle(release);

      if (outcome.status !== "matched") {
        stats.discarded += 1;

        await this.catchupAuditService.record(
          outcome.status === "ambiguous"
            ? CATCHUP_AUDIT_ACTIONS.AMBIGUOUS_MATCH_IGNORED
            : CATCHUP_AUDIT_ACTIONS.UNMATCHED_RELEASE_IGNORED,
          { release: release as unknown as Record<string, unknown> },
          runId,
        );

        return;
      }

      stats.matched += 1;

      const { event, created } = await this.releaseEventService.findOrCreate({
        release,
        match: outcome.match,
        runId,
      });

      if (created) {
        stats.eventsCreated += 1;
      }

      await this.catchupAuditService.record(
        created ? CATCHUP_AUDIT_ACTIONS.RELEASE_EVENT_CREATED : CATCHUP_AUDIT_ACTIONS.RELEASE_EVENT_UPDATED,
        { releaseEventId: event.id, idempotencyKey: event.idempotencyKey },
        runId,
      );

      const impactedUsers = await this.userImpactResolverService.resolve(event);
      stats.usersImpacted += impactedUsers.length;

      const reopenedUserIds: string[] = [];

      for (const user of impactedUsers) {
        const reopened = await this.statusTransitionService.autoReopenCompletedIfNeeded(user, event);

        if (reopened) {
          reopenedUserIds.push(user.userId);
          stats.reopened += 1;

          await this.catchupAuditService.record(
            CATCHUP_AUDIT_ACTIONS.STATUS_AUTO_REOPENED,
            { userId: user.userId, releaseEventId: event.id, progressId: user.progressId },
            runId,
          );
        }
      }

      const notificationsCreated = await this.catchupNotificationService.dispatch({
        releaseEvent: event,
        userIds: impactedUsers.map((user) => user.userId),
        reopenedUserIds,
      });

      stats.notificationsCreated += notificationsCreated;
    } catch (error: any) {
      stats.notificationsFailed += 1;

      this.logger.error(`Failed to process release during catch-up | error=${error.message}`);

      await this.catchupAuditService.record(
        CATCHUP_AUDIT_ACTIONS.RELEASE_PROCESSING_FAILED,
        { release: release as unknown as Record<string, unknown>, error: error.message },
        runId,
      );
    }
  }
}
