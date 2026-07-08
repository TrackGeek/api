import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ListType } from "@prisma/generated/enums";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

export class GetListStatusDto {
  @IsEnum(ListType)
  @ApiProperty({ enum: ListType })
  readonly type: ListType;

  @ApiProperty({ type: "string" })
  readonly userId: string;

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
