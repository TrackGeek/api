import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class UpdateProfileLinkDto {
  readonly userId: string;

  readonly linkId: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(40)
  @ApiPropertyOptional({
    description: "Label shown for the link",
    example: "Portfolio",
    type: "string",
  })
  readonly label?: string;

  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Destination of the link",
    example: "https://example.com",
    type: "string",
  })
  readonly url?: string;
}
