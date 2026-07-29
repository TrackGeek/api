import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateGameScreenshotDto {
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
    default: false,
  })
  readonly isSpoiler?: boolean;

  @IsNotEmpty()
  @ApiProperty({
    description: "ID of the game",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly gameId: string;

  readonly userId: string;
}
