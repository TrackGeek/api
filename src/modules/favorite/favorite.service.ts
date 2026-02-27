import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import { FavoriteFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { AddFavoriteDto } from "./dtos/add-favorite.dto";
import { GetFavoritesByUserIdDto } from "./dtos/get-favorites-by-user-id.dto";
import { RemoveFavoriteDto } from "./dtos/remove-favorite.dto";

@Injectable()
export class FavoriteService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async addFavorite(addFavoriteDto: AddFavoriteDto) {
    const { type, userId, item } = addFavoriteDto;

    const entityId = { ...item } as Record<string, any>;

    const favoriteAlreadyExists = await this.databaseService.favorite.findFirst({
      where: {
        type,
        userId,
        ...entityId,
      },
    });

    if (favoriteAlreadyExists) {
      throw new AppException(ERROR_CODES.FAVORITE_ALREADY_EXISTS);
    }

    const favorite = await this.databaseService.favorite.create({
      data: {
        type,
        userId,
        ...entityId,
      },
      include: {
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
        anime: {
          select: {
            id: true,
            malId: true,
            title: true,
            imageUrl: true,
          },
        },
        manga: {
          select: {
            id: true,
            malId: true,
            title: true,
            imageUrl: true,
          },
        },
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            name: true,
            posterUrl: true,
          },
        },
        movie: {
          select: {
            id: true,
            tmdbId: true,
            title: true,
            posterUrl: true,
          },
        },
        game: {
          select: {
            id: true,
            igdbId: true,
            name: true,
            coverUrl: true,
          },
        },
        book: {
          select: {
            id: true,
            hardcoverId: true,
            title: true,
            imageUrl: true,
          },
        },
      },
    });

    await this.queueService.toFeedEventQueue({
      type: FeedEventType.NewFavorite,
      userId,
      metadata: { favorite },
    });
  }

  async getFavoritesByUserId(getFavoritesByUserIdDto: GetFavoritesByUserIdDto) {
    const userAlreadyExists = await this.databaseService.user.findUnique({
      where: { id: getFavoritesByUserIdDto.userId },
    });

    if (!userAlreadyExists) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    const favorites = await this.databaseService.offsetPagination<FavoriteFindManyArgs>({
      model: "favorite",
      itemsPerPage: getFavoritesByUserIdDto.itemsPerPage,
      page: getFavoritesByUserIdDto.page,
      where: { userId: getFavoritesByUserIdDto.userId },
      select: {
        id: true,
        type: true,
        createdAt: true,
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
        anime: {
          select: {
            id: true,
            malId: true,
            title: true,
            imageUrl: true,
          },
        },
        manga: {
          select: {
            id: true,
            malId: true,
            title: true,
            imageUrl: true,
          },
        },
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            name: true,
            posterUrl: true,
          },
        },
        movie: {
          select: {
            id: true,
            tmdbId: true,
            title: true,
            posterUrl: true,
          },
        },
        game: {
          select: {
            id: true,
            igdbId: true,
            name: true,
            coverUrl: true,
          },
        },
        book: {
          select: {
            id: true,
            hardcoverId: true,
            title: true,
            imageUrl: true,
          },
        },
      },
    });

    return favorites;
  }

  async removeFavorite(removeFavoriteDto: RemoveFavoriteDto) {
    const { type, userId, item } = removeFavoriteDto;

    const entityId = { ...item } as Record<string, any>;

    const favorite = await this.databaseService.favorite.findFirst({
      where: {
        type,
        userId,
        ...entityId,
      },
    });

    if (!favorite) {
      throw new AppException(ERROR_CODES.FAVORITE_NOT_FOUND);
    }

    await this.databaseService.favorite.delete({
      where: { id: favorite.id },
    });
  }
}
