import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Matches, Max, Min } from "class-validator";
import { HardcoverBookOrderBy, HardcoverSort } from "@/shared/infra/integrations/hardcover.service";

export class SearchBookDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: "Lookup for a book matching a name",
    example: "The Witcher",
    type: "string",
  })
  readonly query?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    type: "number",
    default: 1,
  })
  readonly page?: number;

  @IsOptional()
  @IsString()
  @IsOptional()
  readonly status?: string;

  @IsEnum(HardcoverBookOrderBy)
  @IsOptional()
  readonly orderBy?: HardcoverBookOrderBy;

  @IsEnum(HardcoverSort)
  @IsOptional()
  @ApiPropertyOptional({ enum: HardcoverSort, default: HardcoverSort.Desc })
  readonly sort?: HardcoverSort;

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  readonly categories?: string[];

  @Matches(/^\d{4}$/)
  @IsOptional()
  readonly year?: string;

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  @ApiPropertyOptional({ description: "Alias of `categories`.", example: "Fantasy", type: "string" })
  readonly genres?: string[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  @ApiPropertyOptional({ type: "number", minimum: 0, maximum: 5 })
  readonly minTgScore?: number;
}
