import { CommentType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsUUID, MaxLength, ValidateNested } from "class-validator";

export class AnimeCommentItemDto {
  @IsNotEmpty({ message: "animeId is required when type is Anime" })
  @IsUUID("4", { message: "animeId must be a valid UUID" })
  readonly animeId: string;
}

export class MangaCommentItemDto {
  @IsNotEmpty({ message: "mangaId is required when type is Manga" })
  @IsUUID("4", { message: "mangaId must be a valid UUID" })
  readonly mangaId: string;
}

export class TVShowCommentItemDto {
  @IsNotEmpty({ message: "tvShowId is required when type is TVShow" })
  @IsUUID("4", { message: "tvShowId must be a valid UUID" })
  readonly tvShowId: string;
}

export class MovieCommentItemDto {
  @IsNotEmpty({ message: "movieId is required when type is Movie" })
  @IsUUID("4", { message: "movieId must be a valid UUID" })
  readonly movieId: string;
}

export class GameCommentItemDto {
  @IsNotEmpty({ message: "gameId is required when type is Game" })
  @IsUUID("4", { message: "gameId must be a valid UUID" })
  readonly gameId: string;
}

export class BookCommentItemDto {
  @IsNotEmpty({ message: "bookId is required when type is Book" })
  @IsUUID("4", { message: "bookId must be a valid UUID" })
  readonly bookId: string;
}

export class ProfileCommentItemDto {
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

export class CreateCommentDto {
  @IsEnum(CommentType)
  readonly type: CommentType;

  readonly userId: string;

  @IsNotEmpty()
  @MaxLength(500)
  readonly content: string;

  @ValidateNested()
  @Type((options) => commentItemTypeMap[(options?.object as CreateCommentDto).type] ?? Object)
  readonly item: CommentItemDto;
}
