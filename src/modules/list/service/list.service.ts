import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import { ListFindManyArgs, ListItemFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { AddItemToListDto } from "../dto/add-item-to-list.dto";
import { CreateListDto } from "../dto/create-list.dto";
import { DeleteListDto } from "../dto/delete-list.dto";
import { GetItemsByListIdDto } from "../dto/get-items-by-list-id.dto";
import { GetListsContainingItemDto } from "../dto/get-lists-containing-item.dto";
import { GetListStatusDto } from "../dto/get-list-status.dto";
import { GetListsByUserIdDto } from "../dto/get-lists-by-user-id.dto";
import { RemoveItemFromListDto } from "../dto/remove-item-from-list.dto";
import { UpdateListDto } from "../dto/update-list.dto";

@Injectable()
export class ListService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createList(createListDto: CreateListDto) {
    const { name, type, userId, description } = createListDto;

    const list = await this.databaseService.list.create({
      data: {
        name,
        type,
        userId,
        description,
      },
      select: {
        id: true,
        name: true,
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
      type: FeedEventType.NewList,
      userId,
      metadata: { ...list },
    });
  }

  async addItemToList(addItemToListDto: AddItemToListDto) {
    const { listId, userId, position, type: _, ...entityIds } = addItemToListDto;

    const listAlreadyExists = await this.databaseService.list.findFirst({
      where: {
        id: listId,
        userId,
      },
    });

    if (!listAlreadyExists) {
      throw new AppException(ERROR_CODES.LIST_NOT_FOUND);
    }

    const listItemAlreadyExists = await this.databaseService.listItem.findFirst({
      where: {
        listId,
        ...entityIds,
      },
    });

    if (listItemAlreadyExists) {
      throw new AppException(ERROR_CODES.LIST_ITEM_ALREADY_EXISTS);
    }

    const listItem = await this.databaseService.listItem.create({
      data: {
        listId,
        position,
        ...entityIds,
      },
      include: {
        anime: {
          select: {
            id: true,
            malId: true,
            imageUrl: true,
            title: true,
          },
        },
        manga: {
          select: {
            id: true,
            malId: true,
            imageUrl: true,
            title: true,
          },
        },
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            backdropUrl: true,
            name: true,
          },
        },
        book: {
          select: {
            id: true,
            hardcoverId: true,
            imageUrl: true,
            title: true,
          },
        },
        game: {
          select: {
            id: true,
            igdbId: true,
            coverUrl: true,
            name: true,
          },
        },
        movie: {
          select: {
            id: true,
            tmdbId: true,
            backdropUrl: true,
            title: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
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
        },
      },
    });

    await this.queueService.toFeedEventJob({
      type: FeedEventType.NewListItem,
      userId,
      metadata: { ...listItem },
    });
  }

  async getListById(listId: string) {
    const list = await this.databaseService.list.findFirst({
      where: {
        id: listId,
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
      },
    });

    if (!list) {
      throw new AppException(ERROR_CODES.LIST_NOT_FOUND);
    }

    return list;
  }

  async getListsByUserId(getListsByUserIdDto: GetListsByUserIdDto) {
    const lists = await this.databaseService.offsetPagination<ListFindManyArgs>({
      model: "list",
      itemsPerPage: getListsByUserIdDto.itemsPerPage,
      page: getListsByUserIdDto.page,
      where: {
        userId: getListsByUserIdDto.userId,
        type: getListsByUserIdDto.type,
        ...(getListsByUserIdDto.query && {
          OR: [
            { name: { contains: getListsByUserIdDto.query, mode: "insensitive" as const } },
            {
              listItems: {
                some: {
                  OR: [
                    { anime: { title: { contains: getListsByUserIdDto.query, mode: "insensitive" as const } } },
                    { manga: { title: { contains: getListsByUserIdDto.query, mode: "insensitive" as const } } },
                    { tvShow: { name: { contains: getListsByUserIdDto.query, mode: "insensitive" as const } } },
                    { movie: { title: { contains: getListsByUserIdDto.query, mode: "insensitive" as const } } },
                    { game: { name: { contains: getListsByUserIdDto.query, mode: "insensitive" as const } } },
                    { book: { title: { contains: getListsByUserIdDto.query, mode: "insensitive" as const } } },
                  ],
                },
              },
            },
          ],
        }),
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
        _count: {
          select: { listItems: true },
        },
        listItems: {
          take: 4,
          include: {
            anime: {
              select: {
                id: true,
                malId: true,
                imageUrl: true,
                title: true,
              },
            },
            manga: {
              select: {
                id: true,
                malId: true,
                imageUrl: true,
                title: true,
              },
            },
            tvShow: {
              select: {
                id: true,
                tmdbId: true,
                backdropUrl: true,
                name: true,
              },
            },
            book: {
              select: {
                id: true,
                hardcoverId: true,
                imageUrl: true,
                title: true,
              },
            },
            game: {
              select: {
                id: true,
                igdbId: true,
                coverUrl: true,
                name: true,
              },
            },
            movie: {
              select: {
                id: true,
                tmdbId: true,
                backdropUrl: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return lists;
  }

  async getListStatus(getListStatusDto: GetListStatusDto & { userId: string }) {
    const { type, userId, ...entityIds } = getListStatusDto;

    const listItems = await this.databaseService.listItem.findMany({
      where: {
        ...entityIds,
        list: { userId, type },
      },
      select: { listId: true },
    });

    return listItems.map((listItem) => listItem.listId);
  }

  async getItemsByListId(getItemsByListIdDto: GetItemsByListIdDto) {
    const listAlreadyExists = await this.databaseService.list.findUnique({
      where: { id: getItemsByListIdDto.listId },
    });

    if (!listAlreadyExists) {
      throw new AppException(ERROR_CODES.LIST_NOT_FOUND);
    }

    const listItems = await this.databaseService.offsetPagination<ListItemFindManyArgs>({
      model: "listItem",
      itemsPerPage: getItemsByListIdDto.itemsPerPage,
      page: getItemsByListIdDto.page,
      where: { listId: getItemsByListIdDto.listId },
      include: {
        anime: {
          select: {
            id: true,
            malId: true,
            imageUrl: true,
            title: true,
          },
        },
        manga: {
          select: {
            id: true,
            malId: true,
            imageUrl: true,
            title: true,
          },
        },
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            backdropUrl: true,
            name: true,
          },
        },
        book: {
          select: {
            id: true,
            hardcoverId: true,
            imageUrl: true,
            title: true,
          },
        },
        game: {
          select: {
            id: true,
            igdbId: true,
            coverUrl: true,
            name: true,
          },
        },
        movie: {
          select: {
            id: true,
            tmdbId: true,
            backdropUrl: true,
            title: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
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
        },
      },
    });

    return listItems;
  }

  async getListsContainingItem(getListsContainingItemDto: GetListsContainingItemDto) {
    const { type, page, itemsPerPage, ...entityIds } = getListsContainingItemDto;

    const lists = await this.databaseService.offsetPagination<ListFindManyArgs>({
      model: "list",
      itemsPerPage,
      page,
      where: {
        type,
        listItems: { some: { ...entityIds } },
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
        _count: {
          select: { listItems: true },
        },
        listItems: {
          take: 4,
          include: {
            anime: {
              select: {
                id: true,
                malId: true,
                imageUrl: true,
                title: true,
              },
            },
            manga: {
              select: {
                id: true,
                malId: true,
                imageUrl: true,
                title: true,
              },
            },
            tvShow: {
              select: {
                id: true,
                tmdbId: true,
                backdropUrl: true,
                name: true,
              },
            },
            book: {
              select: {
                id: true,
                hardcoverId: true,
                imageUrl: true,
                title: true,
              },
            },
            game: {
              select: {
                id: true,
                igdbId: true,
                coverUrl: true,
                name: true,
              },
            },
            movie: {
              select: {
                id: true,
                tmdbId: true,
                backdropUrl: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return lists;
  }

  async removeItemFromList(removeItemFromListDto: RemoveItemFromListDto) {
    const { listId, userId, type: _, ...entityIds } = removeItemFromListDto;

    const list = await this.databaseService.list.findFirst({
      where: {
        id: listId,
        userId,
      },
    });

    if (!list) {
      throw new AppException(ERROR_CODES.LIST_NOT_FOUND);
    }

    const listItem = await this.databaseService.listItem.findFirst({
      where: {
        listId,
        ...entityIds,
      },
    });

    if (!listItem) {
      throw new AppException(ERROR_CODES.LIST_ITEM_NOT_FOUND);
    }

    await this.databaseService.listItem.delete({
      where: {
        id: listItem.id,
      },
    });
  }

  async deleteList(deleteListDto: DeleteListDto) {
    const { listId, userId } = deleteListDto;

    const list = await this.databaseService.list.findFirst({
      where: {
        id: listId,
        userId,
      },
    });

    if (!list) {
      throw new AppException(ERROR_CODES.LIST_NOT_FOUND);
    }

    await this.databaseService.list.delete({
      where: {
        id: listId,
      },
    });
  }

  async updateList(updateListDto: UpdateListDto) {
    const { listId, userId, name, description } = updateListDto;

    const list = await this.databaseService.list.findFirst({
      where: {
        id: listId,
        userId,
      },
    });

    if (!list) {
      throw new AppException(ERROR_CODES.LIST_NOT_FOUND);
    }

    await this.databaseService.list.update({
      where: {
        id: listId,
      },
      data: {
        name,
        description,
      },
    });
  }
}
