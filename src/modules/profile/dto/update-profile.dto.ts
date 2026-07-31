import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {
  readonly userId: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly color?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly language?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly timezone?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly about?: string;
}
