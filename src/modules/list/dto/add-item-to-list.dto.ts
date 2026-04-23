import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ListType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsPositive, IsUUID, ValidateNested } from "class-validator";

export class AnimeItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Anime" })
  @IsNotEmpty({ message: "animeId is required when type is Anime" })
  @IsUUID("4", { message: "animeId must be a valid UUID" })
  readonly animeId: string;
}

export class MangaItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Manga" })
  @IsNotEmpty({ message: "mangaId is required when type is Manga" })
  @IsUUID("4", { message: "mangaId must be a valid UUID" })
  readonly mangaId: string;
}

export class TVShowItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is TVShow" })
  @IsNotEmpty({ message: "tvShowId is required when type is TVShow" })
  @IsUUID("4", { message: "tvShowId must be a valid UUID" })
  readonly tvShowId: string;
}

export class MovieItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Movie" })
  @IsNotEmpty({ message: "movieId is required when type is Movie" })
  @IsUUID("4", { message: "movieId must be a valid UUID" })
  readonly movieId: string;
}

export class GameItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Game" })
  @IsNotEmpty({ message: "gameId is required when type is Game" })
  @IsUUID("4", { message: "gameId must be a valid UUID" })
  readonly gameId: string;
}

export class BookItemDto {
  @ApiProperty({ type: "string", format: "uuid", description: "Required when type is Book" })
  @IsNotEmpty({ message: "bookId is required when type is Book" })
  @IsUUID("4", { message: "bookId must be a valid UUID" })
  readonly bookId: string;
}

type ItemDto = AnimeItemDto | MangaItemDto | TVShowItemDto | MovieItemDto | GameItemDto | BookItemDto;

const itemTypeMap: Partial<Record<ListType, new () => ItemDto>> = {
  [ListType.Anime]: AnimeItemDto,
  [ListType.Manga]: MangaItemDto,
  [ListType.TVShow]: TVShowItemDto,
  [ListType.Movie]: MovieItemDto,
  [ListType.Game]: GameItemDto,
  [ListType.Book]: BookItemDto,
};

@ApiExtraModels(AnimeItemDto, MangaItemDto, TVShowItemDto, MovieItemDto, GameItemDto, BookItemDto)
export class AddItemToListDto {
  @IsEnum(ListType)
  @ApiProperty({ enum: ListType })
  readonly type: ListType;

  @IsOptional()
  @ApiPropertyOptional({ type: "integer" })
  @Type(() => Number)
  @IsPositive()
  readonly position?: number;

  @IsUUID("7", { message: "listId must be a valid UUID" })
  @ApiProperty({ type: "string", format: "uuid" })
  readonly listId: string;

  @ApiProperty({ type: "string" })
  readonly userId: string;

  @ValidateNested()
  @Type((options) => itemTypeMap[(options?.object as AddItemToListDto).type] ?? Object)
  @ApiProperty({
    oneOf: [
      { $ref: "#/components/schemas/AnimeItemDto" },
      { $ref: "#/components/schemas/MangaItemDto" },
      { $ref: "#/components/schemas/TVShowItemDto" },
      { $ref: "#/components/schemas/MovieItemDto" },
      { $ref: "#/components/schemas/GameItemDto" },
      { $ref: "#/components/schemas/BookItemDto" },
    ],
  })
  readonly item: ItemDto;
}
