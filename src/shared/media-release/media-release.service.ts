import { Injectable } from "@nestjs/common";
import { ProgressStatus, WatchEpisodeStatus } from "@prisma/generated/enums";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { type MediaType, unreleasedRawStatuses } from "@/shared/media-filter/media-filter.constants";

const ALLOWED_PROGRESS_STATUS = ProgressStatus.Planning;

const ALLOWED_EPISODE_STATUS = WatchEpisodeStatus.Planning;

@Injectable()
export class MediaReleaseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async isUnreleased(mediaType: MediaType, mediaId: string): Promise<boolean> {
    if (mediaType === "book") return this.isBookUnreleased(mediaId);

    const status = await this.findRawStatus(mediaType, mediaId);

    return !status || unreleasedRawStatuses(mediaType).includes(status);
  }

  async assertProgressStatusAllowed(mediaType: MediaType, mediaId: string, status: ProgressStatus): Promise<void> {
    if (status === ALLOWED_PROGRESS_STATUS) return;

    if (await this.isUnreleased(mediaType, mediaId)) {
      throw new AppException(ERROR_CODES.MEDIA_NOT_RELEASED);
    }
  }

  async assertEpisodeStatusesAllowed(
    mediaType: MediaType,
    mediaId: string,
    statuses: WatchEpisodeStatus[],
  ): Promise<void> {
    if (statuses.every((status) => status === ALLOWED_EPISODE_STATUS)) return;

    if (await this.isUnreleased(mediaType, mediaId)) {
      throw new AppException(ERROR_CODES.MEDIA_NOT_RELEASED);
    }
  }

  private async findRawStatus(mediaType: Exclude<MediaType, "book">, mediaId: string): Promise<string | null> {
    switch (mediaType) {
      case "anime": {
        const anime = await this.databaseService.anime.findUnique({
          where: { id: mediaId },
          select: { status: true },
        });

        return anime?.status ?? null;
      }
      case "manga": {
        const manga = await this.databaseService.manga.findUnique({
          where: { id: mediaId },
          select: { status: true },
        });

        return manga?.status ?? null;
      }
      case "tv": {
        const tvShow = await this.databaseService.tvShow.findUnique({
          where: { id: mediaId },
          select: { status: true },
        });

        return tvShow?.status ?? null;
      }
      case "movie": {
        const movie = await this.databaseService.movie.findUnique({
          where: { id: mediaId },
          select: { status: true },
        });

        return movie?.status ?? null;
      }
      case "game": {
        const game = await this.databaseService.game.findUnique({
          where: { id: mediaId },
          select: { gameStatus: true },
        });

        return game?.gameStatus ?? null;
      }
    }
  }

  private async isBookUnreleased(bookId: string): Promise<boolean> {
    const book = await this.databaseService.book.findUnique({
      where: { id: bookId },
      select: { releaseDate: true, releaseYear: true },
    });

    if (!book) return false;

    if (book.releaseDate) return book.releaseDate.getTime() > Date.now();
    if (book.releaseYear != null) return book.releaseYear > new Date().getUTCFullYear();

    return false;
  }
}
