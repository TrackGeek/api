import { CommentType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";
import { CursorPaginationParamsDto } from "@/shared/infra/database/dtos/cursor-pagination.dto";
import { type CommentItemDto, commentItemTypeMap } from "./create-comment.dto";

export class GetCommentsDto extends CursorPaginationParamsDto {
  @IsEnum(CommentType)
  readonly type: CommentType;

  @ValidateNested()
  @Type((options) => commentItemTypeMap[(options?.object as GetCommentsDto).type] ?? Object)
  readonly item: CommentItemDto;
}
