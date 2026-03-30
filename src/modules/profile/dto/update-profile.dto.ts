import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateProfileDto {
  readonly userId: string;

  @IsString()
  @ApiProperty({ type: "string" })
  readonly color: string;

  @IsString()
  @ApiProperty({ type: "string" })
  readonly language: string;

  @IsString()
  @ApiProperty({ type: "string" })
  readonly timezone: string;

  @IsString()
  @ApiProperty({ type: "string" })
  readonly about: string;
}
