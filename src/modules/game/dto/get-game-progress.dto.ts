import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { ProgressFilterParamsDto } from "@/shared/media-filter/dtos/progress-filter.dto";

export class GetGameProgressDto extends ProgressFilterParamsDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty({
    description: "ID of the user",
    example: "019ce334-a06a-78bc-9178-93f7274610ee",
    type: "string",
  })
  readonly userId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: "ID of the game",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly gameId?: string;
}
