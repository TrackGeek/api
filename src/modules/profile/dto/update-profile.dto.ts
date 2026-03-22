import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional } from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;

  @IsNotEmpty()
  @ApiProperty({ type: "string" })
  readonly color: string;

  @IsNotEmpty()
  @ApiProperty({ type: "string" })
  readonly language: string;

  @IsOptional()
  @ApiPropertyOptional({ type: "string" })
  readonly timezone: string;

  @IsOptional()
  @ApiPropertyOptional({ type: "string" })
  readonly about: string;
}
