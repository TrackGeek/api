import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListMessagesDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 30 })
  readonly limit?: number;
}
