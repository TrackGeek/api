import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateBookProgressDto } from "./dtos/create-or-update-book-progress.dto";
import { GetBookProgressDto } from './dtos/get-book-progress.dto';
import { BookProgressFindManyArgs } from '@prisma/generated/models';

@Injectable()
export class BookProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateBookProgress(createOrUpdateBookProgressDto: CreateOrUpdateBookProgressDto) {
    const { bookId, userId, status, readCount,chaptersRead, completedAt, startedAt } = createOrUpdateBookProgressDto;

    await this.databaseService.bookProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      update: {
        status,
        chaptersRead,
        readCount,
        completedAt,
        startedAt
      },
      create: {
        bookId,
        userId,
        status,
        readCount,
        chaptersRead,
        completedAt,
        startedAt
      },
    });
  }
  
  async getBookProgress(getBookProgressDto: GetBookProgressDto) {
    const bookProgress = await this.databaseService.offsetPagination<BookProgressFindManyArgs>({
      model: "bookProgress",
      itemsPerPage: getBookProgressDto.itemsPerPage,
      page: getBookProgressDto.page,
      where: {
        userId: getBookProgressDto.userId,
        bookId: getBookProgressDto.bookId
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

    return bookProgress;
  }
}
