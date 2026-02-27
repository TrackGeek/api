import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateMangaReviewDto } from "./dtos/create-manga-review.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { MangaReviewFindManyArgs } from "@prisma/generated/models";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { FeedEventType } from "@prisma/generated/enums";
import { GetMangaReviewsDto } from "./dtos/get-manga-reviews.dto";
import { UpdateMangaReviewDto } from "./dtos/update-manga-review.dto";
import { DeleteMangaReviewDto } from "./dtos/delete-manga-review.dto";

@Injectable()
export class MangaReviewService {
	constructor(
		private readonly databaseService: DatabaseService,
		private readonly queueService: QueueService,
	) {}

	async createMangaReview(createMangaReviewDto: CreateMangaReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.mangaReview.findFirst({
				where: {
					mangaId: createMangaReviewDto.mangaId,
					userId: createMangaReviewDto.userId,
				},
			});

		if (reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_ALREADY_EXISTS);
		}

		const mangaReview = await this.databaseService.mangaReview.create({
			data: {
				overall: createMangaReviewDto.overall,
				art: createMangaReviewDto.art,
				worldbuilding: createMangaReviewDto.worldbuilding,
				summary: createMangaReviewDto.summary,
				notes: createMangaReviewDto.notes,
				story: createMangaReviewDto.story,
				characters: createMangaReviewDto.characters,
				recommended: createMangaReviewDto.recommended,
				mangaId: createMangaReviewDto.mangaId,
				userId: createMangaReviewDto.userId,
			},
			include: {
				manga: true,
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
			userId: createMangaReviewDto.userId,
			metadata: { mangaReview },
		});
	}

	async getMangaReviewById(reviewId: string) {
		const review = await this.databaseService.mangaReview.findUnique({
			where: { id: reviewId },
			include: {
				manga: true,
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

	async getMangaReviews(getMangaReviewsDto: GetMangaReviewsDto) {
		const mangaReviews =
			await this.databaseService.offsetPagination<MangaReviewFindManyArgs>({
				model: "mangaReview",
				itemsPerPage: getMangaReviewsDto.itemsPerPage,
				page: getMangaReviewsDto.page,
				where: {
					mangaId: getMangaReviewsDto.mangaId,
					userId: getMangaReviewsDto.userId,
				},
				include: {
					manga: true,
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

		return mangaReviews;
	}

	async updateMangaReview(updateMangaReviewDto: UpdateMangaReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.mangaReview.findFirst({
				where: {
					id: updateMangaReviewDto.mangaReviewId,
					userId: updateMangaReviewDto.userId,
				},
			});

		if (!reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.mangaReview.update({
			where: { id: reviewAlreadyExists.id },
			data: {
				overall: updateMangaReviewDto.overall,
				art: updateMangaReviewDto.art,
				worldbuilding: updateMangaReviewDto.worldbuilding,
				summary: updateMangaReviewDto.summary,
				notes: updateMangaReviewDto.notes,
				story: updateMangaReviewDto.story,
				characters: updateMangaReviewDto.characters,
				recommended: updateMangaReviewDto.recommended,
			},
		});
	}

	async deleteMangaReview(deleteMangaReviewDto: DeleteMangaReviewDto) {
		const reviewAlreadyExists =
			await this.databaseService.mangaReview.findFirst({
				where: {
					id: deleteMangaReviewDto.mangaReviewId,
					userId: deleteMangaReviewDto.userId,
				},
			});

		if (!reviewAlreadyExists) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.mangaReview.delete({
			where: { id: reviewAlreadyExists.id },
		});
	}
}
