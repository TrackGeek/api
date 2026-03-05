import { ReactionType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsUUID, ValidateNested } from "class-validator";
import { IsEmoji } from "@/shared/validators/is-emoji.validator";

export class CommentReactionItemDto {
  @IsNotEmpty({ message: "commentId is required when type is Comment" })
  @IsUUID("4", { message: "commentId must be a valid UUID" })
  readonly commentId: string;
}

export class FeedEventReactionItemDto {
  @IsNotEmpty({ message: "feedEventId is required when type is FeedEvent" })
  @IsUUID("4", { message: "feedEventId must be a valid UUID" })
  readonly feedEventId: string;
}

export type ReactionItemDto = CommentReactionItemDto | FeedEventReactionItemDto;

export const reactionItemTypeMap: Partial<Record<ReactionType, new () => ReactionItemDto>> = {
  [ReactionType.Comment]: CommentReactionItemDto,
  [ReactionType.FeedEvent]: FeedEventReactionItemDto,
};

export class CreateReactionDto {
  @IsEnum(ReactionType)
  readonly type: ReactionType;

  readonly userId: string;

  @IsEmoji()
  readonly emoji: string;

  @ValidateNested()
  @Type((options) => reactionItemTypeMap[(options?.object as CreateReactionDto).type] ?? Object)
  readonly item: ReactionItemDto;
}
