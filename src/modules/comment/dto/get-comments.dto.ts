import { ApiExtraModels, ApiProperty } from "@nestjs/swagger";
import { CommentType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";
import { CursorPaginationParamsDto } from "@/shared/infra/database/dtos/cursor-pagination.dto";
import {
  AnimeCommentItemDto,
  BookCommentItemDto,
  type CommentItemDto,
  commentItemTypeMap,
  GameCommentItemDto,
  MangaCommentItemDto,
  MovieCommentItemDto,
  ProfileCommentItemDto,
  TVShowCommentItemDto,
} from "./create-comment.dto";

@ApiExtraModels(
  AnimeCommentItemDto,
  MangaCommentItemDto,
  TVShowCommentItemDto,
  MovieCommentItemDto,
  GameCommentItemDto,
  BookCommentItemDto,
  ProfileCommentItemDto,
)
export class GetCommentsDto extends CursorPaginationParamsDto {
  @IsEnum(CommentType)
  @ApiProperty({ enum: CommentType })
  readonly type: CommentType;

  @ValidateNested()
  @Type((options) => commentItemTypeMap[(options?.object as GetCommentsDto).type] ?? Object)
  @ApiProperty({
    oneOf: [
      { $ref: "#/components/schemas/AnimeCommentItemDto" },
      { $ref: "#/components/schemas/MangaCommentItemDto" },
      { $ref: "#/components/schemas/TVShowCommentItemDto" },
      { $ref: "#/components/schemas/MovieCommentItemDto" },
      { $ref: "#/components/schemas/GameCommentItemDto" },
      { $ref: "#/components/schemas/BookCommentItemDto" },
      { $ref: "#/components/schemas/ProfileCommentItemDto" },
    ],
  })
  readonly item: CommentItemDto;
}
