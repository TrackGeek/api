import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateMangaProgressDto } from "./dtos/create-or-update-manga-progress.dto";
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { GetMangaProgressesByUserIdDto } from './dtos/get-manga-progresses-by-user-id.dto';
import { MangaProgressFindManyArgs } from '@prisma/generated/models';

@Injectable()
export class MangaProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateMangaProgress(createOrUpdateMangaProgressDto: CreateOrUpdateMangaProgressDto) {
    const { mangaId, userId, status, chaptersRead, completedAt, startedAt } = createOrUpdateMangaProgressDto;
    
    const manga = await this.databaseService.manga.findUnique({
      where: { id: mangaId },
    });
    
    if (!manga) {
      throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    }
    
    if (chaptersRead && manga.numberOfChapters && chaptersRead > manga.numberOfChapters) {
      throw new AppException(ERROR_CODES.INVALID_CHAPTERS_READ);
    }

    await this.databaseService.mangaProgress.upsert({
      where: {
        userId_mangaId: {
          userId,
          mangaId,
        },
      },
      update: {
        status,
        chaptersRead,
        completedAt,
        startedAt
      },
      create: {
        mangaId,
        userId,
        status,
        chaptersRead,
        completedAt,
        startedAt
      },
    });
  }
  
  async getMangaProgressById(mangaProgressId: string) {
    const mangaProgress = await this.databaseService.mangaProgress.findUnique({
      where: { id: mangaProgressId },
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
    
    if (!mangaProgress) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    return mangaProgress;
  }
  
  async getMangaProgressesByUserId(getMangaProgressesByUserIdDto: GetMangaProgressesByUserIdDto) {
    const mangaProgresses = await this.databaseService.offsetPagination<MangaProgressFindManyArgs>({
      model: "mangaProgress",
      itemsPerPage: getMangaProgressesByUserIdDto.itemsPerPage,
      page: getMangaProgressesByUserIdDto.page,
      where: {
        userId: getMangaProgressesByUserIdDto.userId,
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

    return mangaProgresses;
  }
}
