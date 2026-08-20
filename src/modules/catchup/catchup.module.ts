import { Module } from "@nestjs/common";
import { CatchupController } from "./controller/catchup.controller";
import { CatchupService } from "./service/catchup.service";
import { CatchupAuditService } from "./service/catchup-audit.service";
import { CatchupFeedService } from "./service/catchup-feed.service";
import { CatchupFlagsService } from "./service/catchup-flags.service";
import { CatchupNotificationService } from "./service/catchup-notification.service";
import { CatchupRunService } from "./service/catchup-run.service";
import { DailyReleaseIngestorService } from "./service/daily-release-ingestor.service";
import { ReleaseEventService } from "./service/release-event.service";
import { ReleaseMatcherService } from "./service/release-matcher.service";
import { ReleaseNormalizerService } from "./service/release-normalizer.service";
import { StatusTransitionService } from "./service/status-transition.service";
import { UserImpactResolverService } from "./service/user-impact-resolver.service";

@Module({
  imports: [],
  controllers: [CatchupController],
  providers: [
    CatchupService,
    CatchupFlagsService,
    CatchupRunService,
    CatchupAuditService,
    CatchupFeedService,
    CatchupNotificationService,
    DailyReleaseIngestorService,
    ReleaseEventService,
    ReleaseMatcherService,
    ReleaseNormalizerService,
    StatusTransitionService,
    UserImpactResolverService,
  ],
  exports: [CatchupService, CatchupFeedService],
})
export class CatchupModule {}
