import { PrismaClient } from "@prisma/generated/client";

type DatabaseModel = Exclude<keyof PrismaClient, `$${string}` | symbol>;

export type DatabaseArgs = {
	where?: any;
	omit?: any;
	include?: any;
	orderBy?: any;
};

export class CursorPaginationParams<Args extends DatabaseArgs> {
	readonly model: DatabaseModel;

	readonly take?: number;

	readonly cursor?: string;

	readonly omit?: Args["omit"];

	readonly where?: Args["where"];

	readonly include?: Args["include"];

	readonly orderBy?: Args["orderBy"];

	readonly cursorField?: string;
}

export class CursorPaginationResult<T> {
	readonly items: T[];

	readonly nextCursor: string | null;

	readonly hasNextPage: boolean;
}
