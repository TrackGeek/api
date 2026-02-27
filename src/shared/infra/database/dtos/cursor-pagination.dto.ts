import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

import { DatabaseArgs, DatabaseModel } from "../database.service";
import { PaginationParamsDto } from "./pagination-params.dto";

export class CursorPaginationParamsDto<Args extends DatabaseArgs = any> extends PaginationParamsDto<Args> {
  readonly model?: DatabaseModel;

  readonly cursorField?: string;

  @IsOptional()
  @IsString()
  readonly cursor?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  readonly itemsPerPage?: number;
}

export class CursorPaginationResultDto<T> {
  readonly nextCursor: string | null;

  readonly hasNextPage: boolean;

  readonly items: T[];
}
