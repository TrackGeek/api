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
import { GetListsByUserIdDto } from "../dto/get-lists-by-user-id.dto";
import { RemoveItemFromListDto } from "../dto/remove-item-from-list.dto";

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
    const { listId, userId, item } = addItemToListDto;

    const listAlreadyExists = await this.databaseService.list.findFirst({
      where: {
        id: listId,
        userId,
      },
    });

    if (!listAlreadyExists) {
      throw new AppException(ERROR_CODES.LIST_NOT_FOUND);
    }

    const entityId = { ...item } as Record<string, any>;

    const listItemAlreadyExists = await this.databaseService.listItem.findFirst({
      where: {
        listId,
        ...entityId,
      },
    });

    if (listItemAlreadyExists) {
      throw new AppException(ERROR_CODES.LIST_ITEM_ALREADY_EXISTS);
    }

    const listItem = await this.databaseService.listItem.create({
      data: {
        listId,
        ...entityId,
      },
      include: {
        anime: {
          omit: {
            episodes: true,
          },
        },
        manga: true,
        tvShow: {
          omit: {
            seasons: true,
          },
        },
        book: true,
        game: true,
        movie: true,
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
      where: { userId: getListsByUserIdDto.userId },
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

    return lists;
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
          omit: {
            episodes: true,
          },
        },
        manga: true,
        tvShow: {
          omit: {
            seasons: true,
          },
        },
        book: true,
        game: true,
        movie: true,
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

  async removeItemFromList(removeItemFromListDto: RemoveItemFromListDto) {
    const { listId, userId, item } = removeItemFromListDto;

    const list = await this.databaseService.list.findFirst({
      where: {
        id: listId,
        userId,
      },
    });

    if (!list) {
      throw new AppException(ERROR_CODES.LIST_NOT_FOUND);
    }

    const entityId = { ...item } as Record<string, any>;

    const listItem = await this.databaseService.listItem.findFirst({
      where: {
        listId,
        ...entityId,
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
}
