import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/generated/enums";
import { IsEnum, IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { ReactionRequiredForType } from "./create-reaction.dto";

export class GetReactionsDto extends OffsetPaginationParamsDto {
  @IsEnum(ReactionType)
  @ApiProperty({ enum: ReactionType })
  readonly type: ReactionType;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.Comment)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is Comment",
  })
  readonly commentId?: string;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.Activity)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is Activity",
  })
  readonly activityId?: string;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.GameReview)
  @ApiProperty({ type: "string", format: "uuid", required: false, description: "Required when type is GameReview" })
  readonly gameReviewId?: string;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.AnimeReview)
  @ApiProperty({ type: "string", format: "uuid", required: false, description: "Required when type is AnimeReview" })
  readonly animeReviewId?: string;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.MangaReview)
  @ApiProperty({ type: "string", format: "uuid", required: false, description: "Required when type is MangaReview" })
  readonly mangaReviewId?: string;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.TvShowReview)
  @ApiProperty({ type: "string", format: "uuid", required: false, description: "Required when type is TvShowReview" })
  readonly tvShowReviewId?: string;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.MovieReview)
  @ApiProperty({ type: "string", format: "uuid", required: false, description: "Required when type is MovieReview" })
  readonly movieReviewId?: string;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.BookReview)
  @ApiProperty({ type: "string", format: "uuid", required: false, description: "Required when type is BookReview" })
  readonly bookReviewId?: string;
}
