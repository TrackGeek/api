import { PrismaClient } from "@prisma/generated/client";

type PrismaModel = Exclude<keyof PrismaClient, `$${string}` | symbol>;

export type PrismaArgs = {
	where?: any;
	omit?: any;
	include?: any;
	orderBy?: any;
}

export class CursorPaginationParams<Args extends PrismaArgs> {
  readonly model: PrismaModel;
	
  readonly take?: number;
  
	readonly cursor?: string;
	
	readonly omit?: Args["omit"]
  
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
