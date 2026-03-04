import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import { BookReviewFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateBookReviewDto } from "./dtos/create-book-review.dto";
import { DeleteBookReviewDto } from "./dtos/delete-book-review.dto";
import { GetBookReviewsDto } from "./dtos/get-book-reviews.dto";
import { UpdateBookReviewDto } from "./dtos/update-book-review.dto";

@Injectable()
export class BookReviewService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createBookReview(createBookReviewDto: CreateBookReviewDto) {
    const bookReview = await this.databaseService.bookReview.create({
      data: {
        overall: createBookReviewDto.overall,
        characters: createBookReviewDto.characters,
        language: createBookReviewDto.language,
        theme: createBookReviewDto.theme,
        summary: createBookReviewDto.summary,
        notes: createBookReviewDto.notes,
        recommended: createBookReviewDto.recommended,
        bookId: createBookReviewDto.bookId,
        userId: createBookReviewDto.userId,
      },
      include: {
        book: true,
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

    await this.queueService.toFeedEventJob({
      type: FeedEventType.NewReview,
      userId: createBookReviewDto.userId,
      metadata: { ...bookReview },
    });
  }

  async getBookReviewById(bookReviewId: string) {
    const bookReview = await this.databaseService.bookReview.findUnique({
      where: { id: bookReviewId },
      include: {
        book: true,
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

    if (!bookReview) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    return bookReview;
  }

  async getBookReviews(getBookReviewsDto: GetBookReviewsDto) {
    const bookReviews = await this.databaseService.offsetPagination<BookReviewFindManyArgs>({
      model: "bookReview",
      itemsPerPage: getBookReviewsDto.itemsPerPage,
      page: getBookReviewsDto.page,
      where: {
        bookId: getBookReviewsDto.bookId,
        userId: getBookReviewsDto.userId,
      },
      include: {
        book: true,
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

    return bookReviews;
  }

  async updateBookReview(updateBookReviewDto: UpdateBookReviewDto) {
    const bookReview = await this.databaseService.bookReview.findUnique({
      where: {
        id: updateBookReviewDto.bookReviewId,
      },
    });

    if (!bookReview || bookReview.userId !== updateBookReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.bookReview.update({
      where: {
        id: bookReview.id,
      },
      data: {
        overall: updateBookReviewDto.overall,
        characters: updateBookReviewDto.characters,
        language: updateBookReviewDto.language,
        theme: updateBookReviewDto.theme,
        summary: updateBookReviewDto.summary,
        notes: updateBookReviewDto.notes,
        recommended: updateBookReviewDto.recommended,
      },
    });
  }

  async deleteBookReview(deleteBookReviewDto: DeleteBookReviewDto) {
    const bookReview = await this.databaseService.bookReview.findUnique({
      where: {
        id: deleteBookReviewDto.bookReviewId,
      },
    });

    if (!bookReview || bookReview.userId !== deleteBookReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.bookReview.delete({
      where: {
        id: bookReview.id,
      },
    });
  }
}
