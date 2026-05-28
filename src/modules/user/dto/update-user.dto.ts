import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateUserDto {
  readonly userId: string;

  @IsString()
  @ApiProperty({ type: "string" })
  readonly name: string;

  @IsString()
  @ApiProperty({ type: "string" })
  readonly username: string;
}
