import { Module } from "@nestjs/common";

import { TVShowReviewController } from "./tv-show-review.controller";
import { TVShowReviewService } from "./tv-show-review.service";

@Module({
	imports: [],
	controllers: [TVShowReviewController],
	providers: [TVShowReviewService],
	exports: [TVShowReviewService],
})
export class TVShowReviewModule {}
