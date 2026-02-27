import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateTVShowReviewDto } from "./dtos/create-tv-show-review.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { TVShowReviewFindManyArgs } from "@prisma/generated/models";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { FeedEventType } from "@prisma/generated/enums";
import { GetTVShowReviewsDto } from "./dtos/get-tv-show-reviews.dto";
import { UpdateTVShowReviewDto } from "./dtos/update-tv-show-review.dto";
import { DeleteTVShowReviewDto } from "./dtos/delete-tv-show-review.dto";

@Injectable()
export class TVShowReviewService {
	constructor(
		private readonly databaseService: DatabaseService,
		private readonly queueService: QueueService,
	) {}

	async createTVShowReview(createTVShowReviewDto: CreateTVShowReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.tVShowReview.findFirst({
				where: {
					tvShowId: createTVShowReviewDto.tvShowId,
					userId: createTVShowReviewDto.userId,
				},
			});

		if (reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_ALREADY_EXISTS);
		}

		const tvShowReview = await this.databaseService.tVShowReview.create({
			data: {
				overall: createTVShowReviewDto.overall,
				direction: createTVShowReviewDto.direction,
				production: createTVShowReviewDto.production,
				acting: createTVShowReviewDto.acting,
				summary: createTVShowReviewDto.summary,
				notes: createTVShowReviewDto.notes,
				story: createTVShowReviewDto.story,
				recommended: createTVShowReviewDto.recommended,
				tvShowId: createTVShowReviewDto.tvShowId,
				userId: createTVShowReviewDto.userId,
			},
			include: {
				tvShow: true,
				user: {
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

		await this.queueService.toFeedEventQueue({
			type: FeedEventType.NewReview,
			userId: createTVShowReviewDto.userId,
			metadata: { tvShowReview },
		});
	}

	async getTVShowReviewById(reviewId: string) {
		const review = await this.databaseService.tVShowReview.findUnique({
			where: { id: reviewId },
			include: {
				tvShow: true,
				user: {
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

		if (!review) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		return review;
	}

	async getTVShowReviews(getTVShowReviewsDto: GetTVShowReviewsDto) {
		const tvShowReviews =
			await this.databaseService.offsetPagination<TVShowReviewFindManyArgs>({
				model: "tVShowReview",
				itemsPerPage: getTVShowReviewsDto.itemsPerPage,
				page: getTVShowReviewsDto.page,
				where: {
					tvShowId: getTVShowReviewsDto.tvShowId,
					userId: getTVShowReviewsDto.userId,
				},
				include: {
					tvShow: true,
					user: {
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

		return tvShowReviews;
	}

	async updateTVShowReview(updateTVShowReviewDto: UpdateTVShowReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.tVShowReview.findFirst({
				where: {
					id: updateTVShowReviewDto.tvShowReviewId,
					userId: updateTVShowReviewDto.userId,
				},
			});

		if (!reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.tVShowReview.update({
			where: { id: reviewAlreadyExists.id },
			data: {
				overall: updateTVShowReviewDto.overall,
				direction: updateTVShowReviewDto.direction,
				production: updateTVShowReviewDto.production,
				acting: updateTVShowReviewDto.acting,
				summary: updateTVShowReviewDto.summary,
				notes: updateTVShowReviewDto.notes,
				story: updateTVShowReviewDto.story,
				recommended: updateTVShowReviewDto.recommended,
			},
		});
	}

	async deleteTVShowReview(deleteTVShowReviewDto: DeleteTVShowReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.tVShowReview.findFirst({
				where: {
					id: deleteTVShowReviewDto.tvShowReviewId,
					userId: deleteTVShowReviewDto.userId,
				},
			});

		if (!reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.tVShowReview.delete({
			where: { id: reviewAlreadyExists.id },
		});
	}
}
