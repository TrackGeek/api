import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { ProgressFilterParamsDto } from "@/shared/media-filter/dtos/progress-filter.dto";

export class GetAnimeProgressDto extends ProgressFilterParamsDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: String, format: "uuid" })
  readonly userId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: String, format: "uuid" })
  readonly animeId?: string;
}
