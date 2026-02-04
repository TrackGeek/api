import { Injectable } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/generated/client";
import { Pool } from "pg";

import {
	CursorPaginationParams,
	CursorPaginationResult,
	DatabaseArgs,
} from "./dtos/cursor-pagination.dto";

@Injectable()
export class DatabaseService extends PrismaClient {
	constructor(configService: ConfigService) {
		const pool = new Pool({
			connectionString: configService.get<string>("DATABASE_URL"),
		});

		const adapter = new PrismaPg(pool);

		super({ adapter });
	}

	async cursorPagination<A extends DatabaseArgs, R = any>(
		params: CursorPaginationParams<A>,
	): Promise<CursorPaginationResult<R>> {
		const {
			model,
			take = 12,
			cursor,
			omit = {},
			where = {},
			include = {},
			orderBy = {},
			cursorField = "id",
		} = params;

		const data = await (this[model] as any).findMany({
			omit,
			where,
			include,
			orderBy,
			take: take + 1,
			...(cursor && {
				skip: 1,
				cursor: {
					[cursorField]: cursor,
				},
			}),
		});

		const hasNextPage = data.length > take;

		const items = hasNextPage ? data.slice(0, take) : data;

		const nextCursor =
			hasNextPage && items.length > 0
				? items[items.length - 1][cursorField]
				: null;

		return {
			items: items as R[],
			nextCursor,
			hasNextPage,
		};
	}
}
