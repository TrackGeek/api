import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FavoriteType } from "@prisma/generated/enums";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { FavoriteRequiredForType } from './add-favorite.dto';

export class GetFavoriteStatusDto {
  @IsEnum(FavoriteType)
  @ApiProperty({ enum: FavoriteType })
  readonly type: FavoriteType;

  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Anime)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Anime" })
  readonly animeId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Manga)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Manga" })
  readonly mangaId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.TVShow)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is TVShow" })
  readonly tvShowId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Movie)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Movie" })
  readonly movieId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Game)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Game" })
  readonly gameId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Book)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Book" })
  readonly bookId?: string;
}
