import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Matches, Max, Min } from "class-validator";
import { IGDBGameOrderBy, IGDBSort } from "@/shared/infra/integrations/igdb.service";

export class SearchGameDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: "Look up games matching a name.",
    example: "Grand Theft Auto",
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

  @IsEnum(IGDBGameOrderBy)
  @IsOptional()
  @ApiPropertyOptional({
    enum: IGDBGameOrderBy,
  })
  readonly orderBy?: IGDBGameOrderBy;

  @IsEnum(IGDBSort)
  @IsOptional()
  @ApiPropertyOptional({
    enum: IGDBSort,
    default: IGDBSort.Desc,
  })
  readonly sort?: IGDBSort;

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  readonly genres?: string[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: "Filter games by game mode (e.g., single-player, multiplayer).",
    example: "single-player",
    type: "string",
  })
  readonly gameMode?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: "Filter games by platform (e.g., pc, playstation5).",
    example: "pc",
    type: "string",
  })
  readonly platform?: string;

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Filter games by one or more platforms, by name or slug. Matches any of them.",
    example: "PlayStation 5,PC (Microsoft Windows)",
    type: "string",
  })
  readonly platforms?: string[];

  @IsOptional()
  @Matches(/^\d{4}$/)
  readonly year?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: "Filter games by release status (e.g., Released, Beta, Not Released).",
    example: "Released",
    type: "string",
  })
  readonly status?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  @ApiPropertyOptional({ type: "number", minimum: 0, maximum: 5 })
  readonly minTgScore?: number;
}
