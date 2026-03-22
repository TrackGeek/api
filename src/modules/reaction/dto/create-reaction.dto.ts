import { ApiExtraModels, ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsUUID, ValidateNested } from "class-validator";
import { IsEmoji } from "@/shared/validators/is-emoji.validator";

export class CommentReactionItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Comment" })
  @IsNotEmpty({ message: "commentId is required when type is Comment" })
  @IsUUID("4", { message: "commentId must be a valid UUID" })
  readonly commentId: string;
}

export class FeedEventReactionItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is FeedEvent" })
  @IsNotEmpty({ message: "feedEventId is required when type is FeedEvent" })
  @IsUUID("4", { message: "feedEventId must be a valid UUID" })
  readonly feedEventId: string;
}

export type ReactionItemDto = CommentReactionItemDto | FeedEventReactionItemDto;
export const reactionItemTypeMap: Partial<Record<ReactionType, new () => ReactionItemDto>> = {
  [ReactionType.Comment]: CommentReactionItemDto,
  [ReactionType.FeedEvent]: FeedEventReactionItemDto,
};

@ApiExtraModels(CommentReactionItemDto, FeedEventReactionItemDto)
export class CreateReactionDto {
  @IsEnum(ReactionType)
  @ApiProperty({ enum: ReactionType })
  readonly type: ReactionType;

  @ApiProperty({ type: "string" })
  readonly userId: string;

  @IsEmoji()
  @ApiProperty({ type: "string" })
  readonly emoji: string;

  @ValidateNested()
  @Type((options) => reactionItemTypeMap[(options?.object as CreateReactionDto).type] ?? Object)
  @ApiProperty({
    oneOf: [
      { $ref: "#/components/schemas/CommentReactionItemDto" },
      { $ref: "#/components/schemas/FeedEventReactionItemDto" },
    ],
  })
  readonly item: ReactionItemDto;
}
