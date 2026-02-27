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

	async getMangaReviewById(mangaReviewId: string) {
		const mangaReview = await this.databaseService.mangaReview.findUnique({
			where: { id: mangaReviewId },
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

		if (!mangaReview) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		return mangaReview;
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
		const mangaReview = await this.databaseService.mangaReview.findUnique({
      where: {
        id: updateMangaReviewDto.mangaReviewId,
      },
    });

		if (!mangaReview || mangaReview.userId !== updateMangaReviewDto.userId) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.mangaReview.update({
			where: { id: mangaReview.id },
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
		const mangaReview = await this.databaseService.mangaReview.findUnique({
      where: {
        id: deleteMangaReviewDto.mangaReviewId,
      },
    });

		if (!mangaReview || mangaReview.userId !== deleteMangaReviewDto.userId) {
			throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
		}

		await this.databaseService.mangaReview.delete({
			where: { id: mangaReview.id },
		});
	}
}
