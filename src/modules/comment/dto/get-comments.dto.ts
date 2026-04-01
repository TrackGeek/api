import { ApiProperty } from "@nestjs/swagger";
import { CommentType } from "@prisma/generated/enums";
import { IsEnum, IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { CommentRequiredForType } from './create-comment.dto';

export class GetCommentsDto extends OffsetPaginationParamsDto {
  @IsEnum(CommentType)
  @ApiProperty({ enum: CommentType })
  readonly type: CommentType;

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
