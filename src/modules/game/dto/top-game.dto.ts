import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";
import { IGDBGameFilter } from "@/shared/infra/integrations/igdb.service";

export class TopGameDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    type: "number",
    default: 1,
  })
  readonly page?: number;

  @IsEnum(IGDBGameFilter)
  @ApiProperty({
    enum: IGDBGameFilter,
  })
  readonly filter: IGDBGameFilter;
}
