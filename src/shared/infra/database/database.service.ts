import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/generated/client";
import { Pool } from "pg";

import { CursorPaginationParamsDto, CursorPaginationResultDto } from "./dtos/cursor-pagination.dto";
import { OffsetPaginationParamsDto, OffsetPaginationResultDto } from "./dtos/offset-pagination.dto";

export type DatabaseModel = Exclude<keyof PrismaClient, `$${string}` | symbol>;

export interface DatabaseArgs {
  where?: any;
  omit?: any;
  include?: any;
  orderBy?: any;
  select?: any;
}

export const DEFAULT_PAGINATION_PAGE = 1;

export const DEFAULT_PAGINATION_ITEMS_PER_PAGE = 20;

const DEFAULT_PAGINATION_CURSOR_FIELD = "id";

@Injectable()
export class DatabaseService extends PrismaClient {
  constructor(configService: ConfigService) {
    const pool = new Pool({
      connectionString: configService.get<string>("DATABASE_URL"),
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  async offsetPagination<A extends DatabaseArgs, R = any>(
    params: OffsetPaginationParamsDto<A>,
  ): Promise<OffsetPaginationResultDto<R>> {
    const {
      model,
      page = DEFAULT_PAGINATION_PAGE,
      itemsPerPage = DEFAULT_PAGINATION_ITEMS_PER_PAGE,
      omit = {},
      select = {},
      where = {},
      include = {},
      orderBy = {},
    } = params;

    const modelInstance = this[model as DatabaseModel] as any;

    const [total, items] = await Promise.all([
      modelInstance.count(),
      modelInstance.findMany({
        take: itemsPerPage,
        skip: (page - 1) * itemsPerPage,
        where,
        orderBy,
        ...(Object.keys(include).length === 0 && { select }),
        ...(Object.keys(select).length === 0 && { include, omit }),
      }),
    ]);

    const pages = Math.ceil(total / itemsPerPage);

    return {
      total,
      pages,
      inPage: page,
      itemsInPage: items.length,
      itemsPerPage,
      items: items as R[],
    };
  }

  async cursorPagination<A extends DatabaseArgs, R = any>(
    params: CursorPaginationParamsDto<A>,
  ): Promise<CursorPaginationResultDto<R>> {
    const {
      model,
      itemsPerPage = DEFAULT_PAGINATION_ITEMS_PER_PAGE,
      cursor,
      omit = {},
      where = {},
      select = {},
      include = {},
      orderBy = {},
      cursorField = DEFAULT_PAGINATION_CURSOR_FIELD,
    } = params;

    const modelInstance = this[model as DatabaseModel] as any;

    const data = await modelInstance.findMany({
      take: itemsPerPage + 1,
      omit,
      where,
      include,
      orderBy,
      ...(Object.keys(include).length === 0 && { select }),
      ...(Object.keys(select).length === 0 && { include, omit }),
      ...(cursor && {
        skip: 1,
        cursor: {
          [cursorField]: cursor,
        },
      }),
    });

    const hasNextPage = data.length > itemsPerPage;

    const items = hasNextPage ? data.slice(0, itemsPerPage) : data;

    const nextCursor = hasNextPage && items.length > 0 ? items[items.length - 1][cursorField] : null;

    const total = await modelInstance.count();

    return {
      nextCursor,
      hasNextPage,
      count: data.length,
      total,
      items: items as R[],
    };
  }
}
