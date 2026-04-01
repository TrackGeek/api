import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FavoriteType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsOptional,
  IsPositive,
  IsUUID,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

export function FavoriteRequiredForType(favoriteType: FavoriteType, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "favoriteRequiredForType",
      target: object.constructor,
      propertyName,
      constraints: [favoriteType],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const dto = args.object as AddFavoriteDto;
          if (dto.type === favoriteType) {
            return value !== undefined && value !== null && value !== "";
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const [type] = args.constraints as [FavoriteType];
          return `${args.property} is required when type is ${type}`;
        },
      },
    });
  };
}

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

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Anime)
  @IsUUID("4")
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Anime" })
  readonly animeId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Manga)
  @IsUUID("4")
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Manga" })
  readonly mangaId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.TVShow)
  @IsUUID("4")
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is TVShow" })
  readonly tvShowId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Movie)
  @IsUUID("4")
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Movie" })
  readonly movieId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Game)
  @IsUUID("4")
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Game" })
  readonly gameId?: string;

  @IsOptional()
  @FavoriteRequiredForType(FavoriteType.Book)
  @IsUUID("4")
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Book" })
  readonly bookId?: string;
}
