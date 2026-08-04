import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { ProgressFilterParamsDto } from "@/shared/media-filter/dtos/progress-filter.dto";

export class GetMovieProgressDto extends ProgressFilterParamsDto {
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
    description: "ID of the movie",
    example: "1226863",
    type: "string",
  })
  readonly movieId?: string;
}
