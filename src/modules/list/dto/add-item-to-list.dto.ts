import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ListType } from "@prisma/generated/enums";
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

export function ListRequiredForType(favoriteType: ListType, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "favoriteRequiredForType",
      target: object.constructor,
      propertyName,
      constraints: [favoriteType],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const dto = args.object as AddItemToListDto;
          if (dto.type === favoriteType) {
            return value !== undefined && value !== null && value !== "";
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const [type] = args.constraints as [ListType];
          return `${args.property} is required when type is ${type}`;
        },
      },
    });
  };
}

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

  @IsOptional()
  @ListRequiredForType(ListType.Anime)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Anime" })
  readonly animeId?: string;

  @IsOptional()
  @ListRequiredForType(ListType.Manga)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Manga" })
  readonly mangaId?: string;

  @IsOptional()
  @ListRequiredForType(ListType.TVShow)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is TVShow" })
  readonly tvShowId?: string;

  @IsOptional()
  @ListRequiredForType(ListType.Movie)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Movie" })
  readonly movieId?: string;

  @IsOptional()
  @ListRequiredForType(ListType.Game)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Game" })
  readonly gameId?: string;

  @IsOptional()
  @ListRequiredForType(ListType.Book)
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid", description: "Required when type is Book" })
  readonly bookId?: string;
}
