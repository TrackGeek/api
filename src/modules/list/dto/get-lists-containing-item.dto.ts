import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ListType } from "@prisma/generated/enums";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetListsContainingItemDto extends OffsetPaginationParamsDto {
  @IsEnum(ListType)
  @ApiProperty({ enum: ListType })
  readonly type: ListType;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid" })
  readonly animeId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid" })
  readonly mangaId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid" })
  readonly tvShowId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid" })
  readonly movieId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid" })
  readonly gameId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid" })
  readonly bookId?: string;
}
