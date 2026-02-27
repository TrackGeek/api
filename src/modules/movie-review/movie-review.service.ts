import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateMovieReviewDto } from "./dtos/create-movie-review.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { MovieReviewFindManyArgs } from "@prisma/generated/models";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { FeedEventType } from "@prisma/generated/enums";
import { GetMovieReviewsDto } from "./dtos/get-movie-reviews.dto";
import { UpdateMovieReviewDto } from "./dtos/update-movie-review.dto";
import { DeleteMovieReviewDto } from "./dtos/delete-movie-review.dto";

@Injectable()
export class MovieReviewService {
	constructor(
		private readonly databaseService: DatabaseService,
		private readonly queueService: QueueService,
	) {}

	async createMovieReview(createMovieReviewDto: CreateMovieReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.movieReview.findFirst({
				where: {
					movieId: createMovieReviewDto.movieId,
					userId: createMovieReviewDto.userId,
				},
			});

		if (reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_ALREADY_EXISTS);
		}

		const movieReview = await this.databaseService.movieReview.create({
			data: {
				overall: createMovieReviewDto.overall,
				direction: createMovieReviewDto.direction,
				production: createMovieReviewDto.production,
				acting: createMovieReviewDto.acting,
				summary: createMovieReviewDto.summary,
				notes: createMovieReviewDto.notes,
				story: createMovieReviewDto.story,
				recommended: createMovieReviewDto.recommended,
				movieId: createMovieReviewDto.movieId,
				userId: createMovieReviewDto.userId,
			},
			include: {
				movie: true,
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
			userId: createMovieReviewDto.userId,
			metadata: { movieReview },
		});
	}

	async getMovieReviewById(reviewId: string) {
		const review = await this.databaseService.movieReview.findUnique({
			where: { id: reviewId },
			include: {
				movie: true,
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

	async getMovieReviews(getMovieReviewsDto: GetMovieReviewsDto) {
		const movieReviews =
			await this.databaseService.offsetPagination<MovieReviewFindManyArgs>({
				model: "movieReview",
				itemsPerPage: getMovieReviewsDto.itemsPerPage,
				page: getMovieReviewsDto.page,
				where: {
					movieId: getMovieReviewsDto.movieId,
					userId: getMovieReviewsDto.userId,
				},
				include: {
					movie: true,
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

		return movieReviews;
	}

	async updateMovieReview(updateMovieReviewDto: UpdateMovieReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.movieReview.findFirst({
				where: {
					id: updateMovieReviewDto.movieReviewId,
					userId: updateMovieReviewDto.userId,
				},
			});

		if (!reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.movieReview.update({
			where: { id: reviewAlreadyExists.id },
			data: {
				overall: updateMovieReviewDto.overall,
				direction: updateMovieReviewDto.direction,
				production: updateMovieReviewDto.production,
				acting: updateMovieReviewDto.acting,
				summary: updateMovieReviewDto.summary,
				notes: updateMovieReviewDto.notes,
				story: updateMovieReviewDto.story,
				recommended: updateMovieReviewDto.recommended,
			},
		});
	}

	async deleteMovieReview(deleteMovieReviewDto: DeleteMovieReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.movieReview.findFirst({
				where: {
					id: deleteMovieReviewDto.movieReviewId,
					userId: deleteMovieReviewDto.userId,
				},
			});

		if (!reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.movieReview.delete({
			where: { id: reviewAlreadyExists.id },
		});
	}
}
