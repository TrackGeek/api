import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsUUID, Max, MaxLength, Min } from "class-validator";

export class CreateBookReviewDto {
  @IsNumber()
  @Max(10)
  @Min(0)
  @ApiProperty({
    type: "number",
    minimum: 0,
    maximum: 10,
  })
  readonly overall: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 10,
  })
  readonly characters?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 10,
  })
  readonly language?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 10,
  })
  readonly theme?: number;

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

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    type: "boolean",
    default: true,
  })
  readonly recommended?: boolean;

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({
    description: "ID of the book",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly bookId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "019ce334-a06a-78bc-9178-93f7274610ee",
    type: "string",
  })
  readonly userId: string;
}
