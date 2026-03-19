import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class CreateGameReviewScreenshotDto {
  @IsUrl()
  @IsNotEmpty()
  @ApiProperty({
    description: "URL of the screenshot",
    example: "https://example.com/screenshot.png",
    type: "string",
  })
  readonly url: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Description of the screenshot",
    type: "string",
  })
  readonly description?: string;

  @IsBoolean()
  @ApiProperty({
    description: "Whether the screenshot contains spoilers",
    type: "boolean",
  })
  readonly isSpoiler: boolean;

  @IsNotEmpty()
  @ApiProperty({
    description: "ID of the game review",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly gameReviewId: string;

  readonly userId: string;
}
