import { ApiProperty } from "@nestjs/swagger";
import { CommentType } from "@prisma/generated/enums";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

export function CommentRequiredForType(commentType: CommentType, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "commentRequiredForType",
      target: object.constructor,
      propertyName,
      constraints: [commentType],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const dto = args.object as CreateCommentDto;
          if (dto.type === commentType) {
            return value !== undefined && value !== null && value !== "";
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const [type] = args.constraints as [CommentType];
          return `${args.property} is required when type is ${type}`;
        },
      },
    });
  };
}

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

  @IsOptional()
  @CommentRequiredForType(CommentType.Anime)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is Anime",
  })
  readonly animeId?: string;

  @IsOptional()
  @CommentRequiredForType(CommentType.Manga)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is Manga",
  })
  readonly mangaId?: string;

  @IsOptional()
  @CommentRequiredForType(CommentType.TVShow)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is TVShow",
  })
  readonly tvShowId?: string;

  @IsOptional()
  @CommentRequiredForType(CommentType.Movie)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is Movie",
  })
  readonly movieId?: string;

  @IsOptional()
  @CommentRequiredForType(CommentType.Game)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is Game",
  })
  readonly gameId?: string;

  @IsOptional()
  @CommentRequiredForType(CommentType.Book)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is Book",
  })
  readonly bookId?: string;

  @IsOptional()
  @CommentRequiredForType(CommentType.Profile)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is Profile",
  })
  readonly profileId?: string;
}
