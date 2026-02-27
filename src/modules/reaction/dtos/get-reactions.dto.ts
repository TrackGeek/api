import { ReactionType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";
import { CursorPaginationParamsDto } from "@/shared/infra/database/dtos/cursor-pagination.dto";
import { type ReactionItemDto, reactionItemTypeMap } from "./create-reaction.dto";

export class GetReactionsDto extends CursorPaginationParamsDto {
  @IsEnum(ReactionType)
  readonly type: ReactionType;

  @ValidateNested()
  @Type((options) => reactionItemTypeMap[(options?.object as GetReactionsDto).type] ?? Object)
  readonly item: ReactionItemDto;
}
