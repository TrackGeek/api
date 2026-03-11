import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

import { DatabaseArgs, DatabaseModel } from "../database.service";
import { PaginationParamsDto } from "./pagination-params.dto";

export class OffsetPaginationParamsDto<Args extends DatabaseArgs = any> extends PaginationParamsDto<Args> {
  readonly model?: DatabaseModel;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  readonly page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  readonly itemsPerPage?: number;
}

export class OffsetPaginationResultDto<T> {
  readonly total: number;

  readonly count: number;

  readonly pages: number;

  readonly inPage: number;

  readonly itemsInPage: number;

  readonly itemsPerPage: number;

  readonly items: T[];
}
