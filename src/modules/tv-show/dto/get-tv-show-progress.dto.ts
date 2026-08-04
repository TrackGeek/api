import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { ProgressFilterParamsDto } from "@/shared/media-filter/dtos/progress-filter.dto";

export class GetTVShowProgressDto extends ProgressFilterParamsDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: "ID of the TV show",
    example: "14424",
    type: "string",
  })
  readonly tvShowId?: string;
}
