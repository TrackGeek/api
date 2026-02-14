import { FavoriteType } from '@prisma/generated/enums';
import { IsEnum, IsNotEmpty, IsUUID, ValidateIf } from "class-validator";

export class AddFavoriteDto {
  @IsEnum(FavoriteType)
  readonly type: FavoriteType;
  
  readonly userId: string;
  
  @ValidateIf(o => o.type === FavoriteType.Anime)
  @IsNotEmpty({ message: 'animeId is required when type is Anime' })
  @IsUUID('4', { message: 'animeId must be a valid UUID' })
  readonly animeId?: string;
  
  @ValidateIf(o => o.type === FavoriteType.Manga)
  @IsNotEmpty({ message: 'mangaId is required when type is Manga' })
  @IsUUID('4', { message: 'mangaId must be a valid UUID' })
  readonly mangaId?: string;
  
  @ValidateIf(o => o.type === FavoriteType.TVShow)
  @IsNotEmpty({ message: 'tvShowId is required when type is TVShow' })
  @IsUUID('4', { message: 'tvShowId must be a valid UUID' })
  readonly tvShowId?: string;
  
  @ValidateIf(o => o.type === FavoriteType.Movie)
  @IsNotEmpty({ message: 'movieId is required when type is Movie' })
  @IsUUID('4', { message: 'movieId must be a valid UUID' })
  readonly movieId?: string;
  
  @ValidateIf(o => o.type === FavoriteType.Game)
  @IsNotEmpty({ message: 'gameId is required when type is Game' })
  @IsUUID('4', { message: 'gameId must be a valid UUID' })
  readonly gameId?: string;
  
  @ValidateIf(o => o.type === FavoriteType.Book)
  @IsNotEmpty({ message: 'bookId is required when type is Book' })
  @IsUUID('4', { message: 'bookId must be a valid UUID' })
  readonly bookId?: string;
}
