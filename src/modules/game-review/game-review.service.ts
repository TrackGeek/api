import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateGameReviewDto } from "./dtos/create-game-review.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { GameReviewFindManyArgs } from "@prisma/generated/models";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { FeedEventType } from "@prisma/generated/enums";
import { GetGameReviewsDto } from "./dtos/get-game-reviews.dto";
import { UpdateGameReviewDto } from "./dtos/update-game-review.dto";
import { DeleteGameReviewDto } from "./dtos/delete-game-review.dto";

@Injectable()
export class GameReviewService {
	constructor(
		private readonly databaseService: DatabaseService,
		private readonly queueService: QueueService,
	) {}

	async createGameReview(createGameReviewDto: CreateGameReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.gameReview.findFirst({
				where: {
					gameId: createGameReviewDto.gameId,
					userId: createGameReviewDto.userId,
				},
			});

		if (reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_ALREADY_EXISTS);
		}

		const gameReview = await this.databaseService.gameReview.create({
			data: {
				overall: createGameReviewDto.overall,
				graphics: createGameReviewDto.graphics,
				sound: createGameReviewDto.sound,
				story: createGameReviewDto.story,
				gameplay: createGameReviewDto.gameplay,
				platform: createGameReviewDto.platform,
				summary: createGameReviewDto.summary,
				notes: createGameReviewDto.notes,
				recommended: createGameReviewDto.recommended,
				gameId: createGameReviewDto.gameId,
				userId: createGameReviewDto.userId,
			},
			include: {
				game: true,
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
			userId: createGameReviewDto.userId,
			metadata: { gameReview },
		});
	}

	async getGameReviewById(reviewId: string) {
		const review = await this.databaseService.gameReview.findUnique({
			where: { id: reviewId },
			include: {
				game: true,
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

	async getGameReviews(getGameReviewsDto: GetGameReviewsDto) {
		const gameReviews =
			await this.databaseService.offsetPagination<GameReviewFindManyArgs>({
				model: "gameReview",
				itemsPerPage: getGameReviewsDto.itemsPerPage,
				page: getGameReviewsDto.page,
				where: {
					gameId: getGameReviewsDto.gameId,
					userId: getGameReviewsDto.userId,
				},
				include: {
					game: true,
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

		return gameReviews;
	}

	async updateGameReview(updateGameReviewDto: UpdateGameReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.gameReview.findFirst({
				where: {
					id: updateGameReviewDto.gameReviewId,
					userId: updateGameReviewDto.userId,
				},
			});

		if (!reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.gameReview.update({
			where: { id: reviewAlreadyExists.id },
			data: {
				overall: updateGameReviewDto.overall,
				graphics: updateGameReviewDto.graphics,
				sound: updateGameReviewDto.sound,
				story: updateGameReviewDto.story,
				gameplay: updateGameReviewDto.gameplay,
				platform: updateGameReviewDto.platform,
				summary: updateGameReviewDto.summary,
				notes: updateGameReviewDto.notes,
				recommended: updateGameReviewDto.recommended,
			},
		});
	}

	async deleteGameReview(deleteGameReviewDto: DeleteGameReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.gameReview.findFirst({
				where: {
					id: deleteGameReviewDto.gameReviewId,
					userId: deleteGameReviewDto.userId,
				},
			});

		if (!reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.gameReview.delete({
			where: { id: reviewAlreadyExists.id },
		});
	}
}
