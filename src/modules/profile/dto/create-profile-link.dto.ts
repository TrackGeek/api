import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateProfileLinkDto {
  readonly userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @ApiProperty({
    description: "Label shown for the link",
    example: "Portfolio",
    type: "string",
  })
  readonly label: string;

  @IsUrl()
  @ApiProperty({
    description: "Destination of the link",
    example: "https://example.com",
    type: "string",
  })
  readonly url: string;
}
