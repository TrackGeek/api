import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateGameScreenshotDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @ApiPropertyOptional({
    description: "Description of the screenshot",
    type: "string",
  })
  readonly description?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Whether the screenshot contains spoilers",
    type: "boolean",
  })
  readonly isSpoiler?: boolean;

  readonly screenshotId: string;

  readonly userId: string;
}
