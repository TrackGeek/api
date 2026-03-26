import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FavoriteType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsPositive, IsUUID, ValidateNested } from "class-validator";

export class AnimeFavoriteItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Anime" })
  @IsNotEmpty({ message: "animeId is required when type is Anime" })
  @IsUUID("4", { message: "animeId must be a valid UUID" })
  readonly animeId: string;
}

export class MangaFavoriteItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Manga" })
  @IsNotEmpty({ message: "mangaId is required when type is Manga" })
  @IsUUID("4", { message: "mangaId must be a valid UUID" })
  readonly mangaId: string;
}

export class TVShowFavoriteItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is TVShow" })
  @IsNotEmpty({ message: "tvShowId is required when type is TVShow" })
  @IsUUID("4", { message: "tvShowId must be a valid UUID" })
  readonly tvShowId: string;
}

export class MovieFavoriteItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Movie" })
  @IsNotEmpty({ message: "movieId is required when type is Movie" })
  @IsUUID("4", { message: "movieId must be a valid UUID" })
  readonly movieId: string;
}

export class GameFavoriteItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Game" })
  @IsNotEmpty({ message: "gameId is required when type is Game" })
  @IsUUID("4", { message: "gameId must be a valid UUID" })
  readonly gameId: string;
}

export class BookFavoriteItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Book" })
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

@ApiExtraModels(
  AnimeFavoriteItemDto,
  MangaFavoriteItemDto,
  TVShowFavoriteItemDto,
  MovieFavoriteItemDto,
  GameFavoriteItemDto,
  BookFavoriteItemDto,
)
export class AddFavoriteDto {
  @IsEnum(FavoriteType)
  @ApiProperty({ enum: FavoriteType })
  readonly type: FavoriteType;

  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;

  @IsOptional()
  @ApiPropertyOptional({ type: "integer" })
  @Type(() => Number)
  @IsPositive()
  readonly position?: number;

  @ValidateNested()
  @Type((options) => favoriteItemTypeMap[(options?.object as AddFavoriteDto).type] ?? Object)
  @ApiProperty({
    oneOf: [
      { $ref: "#/components/schemas/AnimeFavoriteItemDto" },
      { $ref: "#/components/schemas/MangaFavoriteItemDto" },
      { $ref: "#/components/schemas/TVShowFavoriteItemDto" },
      { $ref: "#/components/schemas/MovieFavoriteItemDto" },
      { $ref: "#/components/schemas/GameFavoriteItemDto" },
      { $ref: "#/components/schemas/BookFavoriteItemDto" },
    ],
  })
  readonly item: FavoriteItemDto;
}
