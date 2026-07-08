import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, IsString, Matches } from "class-validator";
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
}
