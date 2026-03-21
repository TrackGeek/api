import { ApiExtraModels, ApiProperty } from "@nestjs/swagger";
import { CommentType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsUUID, MaxLength, ValidateNested } from "class-validator";

export class AnimeCommentItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Anime" })
  @IsNotEmpty({ message: "animeId is required when type is Anime" })
  @IsUUID("4", { message: "animeId must be a valid UUID" })
  readonly animeId: string;
}

export class MangaCommentItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Manga" })
  @IsNotEmpty({ message: "mangaId is required when type is Manga" })
  @IsUUID("4", { message: "mangaId must be a valid UUID" })
  readonly mangaId: string;
}

export class TVShowCommentItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is TVShow" })
  @IsNotEmpty({ message: "tvShowId is required when type is TVShow" })
  @IsUUID("4", { message: "tvShowId must be a valid UUID" })
  readonly tvShowId: string;
}

export class MovieCommentItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Movie" })
  @IsNotEmpty({ message: "movieId is required when type is Movie" })
  @IsUUID("4", { message: "movieId must be a valid UUID" })
  readonly movieId: string;
}

export class GameCommentItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Game" })
  @IsNotEmpty({ message: "gameId is required when type is Game" })
  @IsUUID("4", { message: "gameId must be a valid UUID" })
  readonly gameId: string;
}

export class BookCommentItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Book" })
  @IsNotEmpty({ message: "bookId is required when type is Book" })
  @IsUUID("4", { message: "bookId must be a valid UUID" })
  readonly bookId: string;
}

export class ProfileCommentItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Profile" })
  @IsNotEmpty({ message: "profileId is required when type is Profile" })
  @IsUUID("4", { message: "profileId must be a valid UUID" })
  readonly profileId: string;
}

export type CommentItemDto =
  | AnimeCommentItemDto
  | MangaCommentItemDto
  | TVShowCommentItemDto
  | MovieCommentItemDto
  | GameCommentItemDto
  | BookCommentItemDto
  | ProfileCommentItemDto;

export const commentItemTypeMap: Partial<Record<CommentType, new () => CommentItemDto>> = {
  [CommentType.Anime]: AnimeCommentItemDto,
  [CommentType.Manga]: MangaCommentItemDto,
  [CommentType.TVShow]: TVShowCommentItemDto,
  [CommentType.Movie]: MovieCommentItemDto,
  [CommentType.Game]: GameCommentItemDto,
  [CommentType.Book]: BookCommentItemDto,
  [CommentType.Profile]: ProfileCommentItemDto,
};

@ApiExtraModels(
  AnimeCommentItemDto,
  MangaCommentItemDto,
  TVShowCommentItemDto,
  MovieCommentItemDto,
  GameCommentItemDto,
  BookCommentItemDto,
  ProfileCommentItemDto,
)
export class CreateCommentDto {
  @IsEnum(CommentType)
  @ApiProperty({ enum: CommentType })
  readonly type: CommentType;

  @ApiProperty({ type: "string" })
  readonly userId: string;

  @IsNotEmpty()
  @MaxLength(500)
  @ApiProperty({ type: "string", maxLength: 500 })
  readonly content: string;

  @ValidateNested()
  @Type((options) => commentItemTypeMap[(options?.object as CreateCommentDto).type] ?? Object)
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
