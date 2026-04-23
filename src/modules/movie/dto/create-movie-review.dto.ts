import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, Max, MaxLength, Min } from "class-validator";

export class CreateMovieReviewDto {
  @IsNumber()
  @Max(5)
  @Min(0)
  @ApiProperty({
    type: "number",
    minimum: 0,
    maximum: 5,
  })
  readonly overall: number;

  @IsNumber()
  @IsOptional()
  @Max(5)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 5,
  })
  readonly direction?: number;

  @IsNumber()
  @IsOptional()
  @Max(5)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 5,
  })
  readonly production?: number;

  @IsNumber()
  @IsOptional()
  @Max(5)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 5,
  })
  readonly acting?: number;

  @IsOptional()
  @MaxLength(250)
  @ApiPropertyOptional({
    type: "string",
    maxLength: 250,
  })
  readonly summary?: string;

  @IsOptional()
  @MaxLength(1000)
  @ApiPropertyOptional({
    type: "string",
    maxLength: 1000,
  })
  readonly notes?: string;

  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({
    type: "string",
    maxLength: 500,
  })
  readonly story?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    type: "boolean",
    default: true,
  })
  readonly recommended?: boolean;

  @IsNotEmpty()
  @ApiProperty({
    description: "ID of the movie",
    example: "1226863",
    type: "string",
  })
  readonly movieId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;
}
