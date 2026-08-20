import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUrl } from "class-validator";

export class AddSetupPhotoDto {
  readonly userId: string;

  @IsUrl()
  @IsNotEmpty()
  @ApiProperty({
    description: "URL of the setup photo",
    example: "https://example.com/setup.png",
    type: "string",
  })
  readonly url: string;
}
