import { Injectable } from "@nestjs/common";
import { ActivityType, ContentType, XpReason } from "@prisma/generated/enums";
import { ListFindManyArgs, ListItemFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { XP_SOURCE_KEYS } from "@/shared/constants/xp";
import { AppException } from "@/shared/exceptions/app.exceptions";
import {
  DatabaseService,
  DEFAULT_PAGINATION_ITEMS_PER_PAGE,
  DEFAULT_PAGINATION_PAGE,
} from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { stripListTypeSuffix } from "@/shared/utils/list-name";
import { AddItemToListDto } from "../dto/add-item-to-list.dto";
import { CreateListDto } from "../dto/create-list.dto";
import { DeleteListDto } from "../dto/delete-list.dto";
import { GetItemsByListIdDto } from "../dto/get-items-by-list-id.dto";
import { GetListStatusDto } from "../dto/get-list-status.dto";
import { GetListsByUserIdDto } from "../dto/get-lists-by-user-id.dto";
import { GetListsContainingItemDto } from "../dto/get-lists-containing-item.dto";
import { RemoveItemFromListDto } from "../dto/remove-item-from-list.dto";
import { UpdateListDto } from "../dto/update-list.dto";

const LIST_PREVIEW_INCLUDE = {
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
          anilistId: true,
          malId: true,
          imageUrl: true,
          title: true,
        },
      },
      tvShow: {
        select: {
          id: true,
          tmdbId: true,
          posterUrl: true,
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
          posterUrl: true,
          title: true,
        },
      },
    },
  },
} as const;

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

    await this.queueService.toActivityJob({
      type: ActivityType.ListCreated,
      userId,
      listId: list.id,
      metadata: { ...list },
    });

    await this.queueService.toXpJob({
      userId,
      reason: XpReason.ListCreated,
      contentType: type as unknown as ContentType,
      sourceKey: XP_SOURCE_KEYS.list(list.id),
    });
  }

  async addItemToList(addItemToListDto: AddItemToListDto) {
    const { listId, userId, position, type, ...entityIds } = addItemToListDto;

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
            anilistId: true,
            malId: true,
            imageUrl: true,
            title: true,
          },
        },
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            posterUrl: true,
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
            posterUrl: true,
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

    await this.queueService.toActivityJob({
      type: ActivityType.ListItemAdded,
      userId,
      listItemId: listItem.id,
      metadata: { ...listItem },
    });

    const mediaId = Object.values(entityIds).find((id): id is string => Boolean(id));

    if (mediaId) {
      await this.queueService.toXpJob({
        userId,
        reason: XpReason.ListItemAdded,
        contentType: type as unknown as ContentType,
        sourceKey: XP_SOURCE_KEYS.listItem(listId, mediaId),
      });
    }
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

  private buildListsByUserIdWhere(getListsByUserIdDto: GetListsByUserIdDto) {
    return {
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
    };
  }

  async getListsByUserId(getListsByUserIdDto: GetListsByUserIdDto) {
    if (getListsByUserIdDto.grouped) {
      return this.getGroupedListsByUserId(getListsByUserIdDto);
    }

    const lists = await this.databaseService.offsetPagination<ListFindManyArgs>({
      model: "list",
      itemsPerPage: getListsByUserIdDto.itemsPerPage,
      page: getListsByUserIdDto.page,
      where: this.buildListsByUserIdWhere(getListsByUserIdDto),
      include: LIST_PREVIEW_INCLUDE,
    });

    return lists;
  }

  private async getGroupedListsByUserId(getListsByUserIdDto: GetListsByUserIdDto) {
    const page = getListsByUserIdDto.page ?? DEFAULT_PAGINATION_PAGE;
    const itemsPerPage = getListsByUserIdDto.itemsPerPage ?? DEFAULT_PAGINATION_ITEMS_PER_PAGE;
    const where = this.buildListsByUserIdWhere(getListsByUserIdDto);

    const matches = await this.databaseService.list.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    });

    const groups = new Map<string, { key: string; name: string; listIds: string[] }>();

    for (const match of matches) {
      const name = stripListTypeSuffix(match.name);
      const key = name.toLowerCase();
      const group = groups.get(key);

      if (group) {
        group.listIds.push(match.id);
        continue;
      }

      groups.set(key, { key, name, listIds: [match.id] });
    }

    const allGroups = [...groups.values()];
    const pageGroups = allGroups.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const lists = await this.databaseService.list.findMany({
      where: { id: { in: pageGroups.flatMap((group) => group.listIds) } },
      include: LIST_PREVIEW_INCLUDE,
    });

    const listsById = new Map(lists.map((list) => [list.id, list]));

    const items = pageGroups.map((group) => ({
      key: group.key,
      name: group.name,
      lists: group.listIds.map((listId) => listsById.get(listId)).filter((list) => list !== undefined),
    }));

    return {
      total: allGroups.length,
      pages: Math.ceil(allGroups.length / itemsPerPage),
      inPage: page,
      itemsInPage: items.length,
      itemsPerPage,
      items,
    };
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
            anilistId: true,
            malId: true,
            imageUrl: true,
            title: true,
          },
        },
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            posterUrl: true,
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
            posterUrl: true,
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
      include: LIST_PREVIEW_INCLUDE,
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
