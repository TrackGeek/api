import { ApiExtraModels, ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";
import { CursorPaginationParamsDto } from "@/shared/infra/database/dtos/cursor-pagination.dto";
import {
  CommentReactionItemDto,
  FeedEventReactionItemDto,
  type ReactionItemDto,
  reactionItemTypeMap,
} from "./create-reaction.dto";

@ApiExtraModels(CommentReactionItemDto, FeedEventReactionItemDto)
export class GetReactionsDto extends CursorPaginationParamsDto {
  @IsEnum(ReactionType)
  @ApiProperty({ enum: ReactionType })
  readonly type: ReactionType;

  @ValidateNested()
  @Type((options) => reactionItemTypeMap[(options?.object as GetReactionsDto).type] ?? Object)
  @ApiProperty({
    oneOf: [
      { $ref: "#/components/schemas/CommentReactionItemDto" },
      { $ref: "#/components/schemas/FeedEventReactionItemDto" },
    ],
  })
  readonly item: ReactionItemDto;
}
