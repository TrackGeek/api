import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GameMediaType } from "@prisma/generated/enums";
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateGameScreenshotDto {
  @IsUrl()
  @IsNotEmpty()
  @ApiProperty({
    description: "URL of the screenshot, or of the YouTube/Twitch video when type is Video",
    example: "https://example.com/screenshot.png",
    type: "string",
  })
  readonly url: string;

  @IsEnum(GameMediaType)
  @IsOptional()
  @ApiPropertyOptional({
    description: "Kind of media the URL points to",
    enum: GameMediaType,
    default: GameMediaType.Image,
  })
  readonly type?: GameMediaType;

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
