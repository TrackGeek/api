import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional } from "class-validator";

export class CreateProfileDto {
  @IsNotEmpty()
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;

  @IsOptional()
  @ApiPropertyOptional({ type: "string" })
  readonly avatarUrl?: string | null;
}
