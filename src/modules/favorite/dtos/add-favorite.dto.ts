import { FavoriteType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsUUID, ValidateNested } from "class-validator";

export class AnimeFavoriteItemDto {
  @IsNotEmpty({ message: "animeId is required when type is Anime" })
  @IsUUID("4", { message: "animeId must be a valid UUID" })
  readonly animeId: string;
}

export class MangaFavoriteItemDto {
  @IsNotEmpty({ message: "mangaId is required when type is Manga" })
  @IsUUID("4", { message: "mangaId must be a valid UUID" })
  readonly mangaId: string;
}

export class TVShowFavoriteItemDto {
  @IsNotEmpty({ message: "tvShowId is required when type is TVShow" })
  @IsUUID("4", { message: "tvShowId must be a valid UUID" })
  readonly tvShowId: string;
}

export class MovieFavoriteItemDto {
  @IsNotEmpty({ message: "movieId is required when type is Movie" })
  @IsUUID("4", { message: "movieId must be a valid UUID" })
  readonly movieId: string;
}

export class GameFavoriteItemDto {
  @IsNotEmpty({ message: "gameId is required when type is Game" })
  @IsUUID("4", { message: "gameId must be a valid UUID" })
  readonly gameId: string;
}

export class BookFavoriteItemDto {
  @IsNotEmpty({ message: "bookId is required when type is Book" })
  @IsUUID("4", { message: "bookId must be a valid UUID" })
  readonly bookId: string;
}

type FavoriteItemDto =
  | AnimeFavoriteItemDto
  | MangaFavoriteItemDto
  | TVShowFavoriteItemDto
  | MovieFavoriteItemDto
  | GameFavoriteItemDto
  | BookFavoriteItemDto;

const favoriteItemTypeMap: Partial<Record<FavoriteType, new () => FavoriteItemDto>> = {
  [FavoriteType.Anime]: AnimeFavoriteItemDto,
  [FavoriteType.Manga]: MangaFavoriteItemDto,
  [FavoriteType.TVShow]: TVShowFavoriteItemDto,
  [FavoriteType.Movie]: MovieFavoriteItemDto,
  [FavoriteType.Game]: GameFavoriteItemDto,
  [FavoriteType.Book]: BookFavoriteItemDto,
};

export class AddFavoriteDto {
  @IsEnum(FavoriteType)
  readonly type: FavoriteType;

  readonly userId: string;

  @ValidateNested()
  @Type((options) => favoriteItemTypeMap[(options?.object as AddFavoriteDto).type] ?? Object)
  readonly item: FavoriteItemDto;
}
