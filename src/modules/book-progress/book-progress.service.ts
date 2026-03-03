import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateBookProgressDto } from "./dtos/create-or-update-book-progress.dto";
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { GetBookProgressesByUserIdDto } from './dtos/get-book-progresses-by-user-id.dto';
import { BookProgressFindManyArgs } from '@prisma/generated/models';

@Injectable()
export class BookProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateBookProgress(createOrUpdateBookProgressDto: CreateOrUpdateBookProgressDto) {
    const { bookId, userId, status } = createOrUpdateBookProgressDto;

    await this.databaseService.bookProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      update: {
        status,
      },
      create: {
        bookId,
        userId,
        status,
      },
    });
  }
  
  async getBookProgressById(bookProgressId: string) {
    const bookProgress = await this.databaseService.bookProgress.findUnique({
      where: { id: bookProgressId },
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
    
    if (!bookProgress) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    return bookProgress;
  }
  
  async getBookProgressesByUserId(getBookProgressesByUserIdDto: GetBookProgressesByUserIdDto) {
    const bookProgresses = await this.databaseService.offsetPagination<BookProgressFindManyArgs>({
      model: "bookProgress",
      itemsPerPage: getBookProgressesByUserIdDto.itemsPerPage,
      page: getBookProgressesByUserIdDto.page,
      where: {
        userId: getBookProgressesByUserIdDto.userId,
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

    return bookProgresses;
  }
}
