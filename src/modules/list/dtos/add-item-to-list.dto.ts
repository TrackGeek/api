import { ListType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsUUID, ValidateNested } from "class-validator";

export class AnimeItemDto {
	@IsNotEmpty({ message: "animeId is required when type is Anime" })
	@IsUUID("4", { message: "animeId must be a valid UUID" })
	readonly animeId: string;
}

export class MangaItemDto {
	@IsNotEmpty({ message: "mangaId is required when type is Manga" })
	@IsUUID("4", { message: "mangaId must be a valid UUID" })
	readonly mangaId: string;
}

export class TVShowItemDto {
	@IsNotEmpty({ message: "tvShowId is required when type is TVShow" })
	@IsUUID("4", { message: "tvShowId must be a valid UUID" })
	readonly tvShowId: string;
}

export class MovieItemDto {
	@IsNotEmpty({ message: "movieId is required when type is Movie" })
	@IsUUID("4", { message: "movieId must be a valid UUID" })
	readonly movieId: string;
}

export class GameItemDto {
	@IsNotEmpty({ message: "gameId is required when type is Game" })
	@IsUUID("4", { message: "gameId must be a valid UUID" })
	readonly gameId: string;
}

export class BookItemDto {
	@IsNotEmpty({ message: "bookId is required when type is Book" })
	@IsUUID("4", { message: "bookId must be a valid UUID" })
	readonly bookId: string;
}

type ItemDto =
	| AnimeItemDto
	| MangaItemDto
	| TVShowItemDto
	| MovieItemDto
	| GameItemDto
	| BookItemDto;

const itemTypeMap: Partial<Record<ListType, new () => ItemDto>> = {
	[ListType.Anime]: AnimeItemDto,
	[ListType.Manga]: MangaItemDto,
	[ListType.TVShow]: TVShowItemDto,
	[ListType.Movie]: MovieItemDto,
	[ListType.Game]: GameItemDto,
	[ListType.Book]: BookItemDto,
};

export class AddItemToListDto {
	@IsEnum(ListType)
	readonly type: ListType;

	readonly listId: string;

	readonly userId: string;

	@ValidateNested()
	@Type(
		(options) =>
			itemTypeMap[(options?.object as AddItemToListDto).type] ?? Object,
	)
	readonly item: ItemDto;
}
