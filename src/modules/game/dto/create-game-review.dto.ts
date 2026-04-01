import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDecimal,
  IsNotEmpty,
  IsOptional,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateGameReviewDto {
  @IsDecimal()
  @Max(5)
  @Min(0)
  @ApiProperty({
    type: "number",
    minimum: 0,
    maximum: 10,
  })
  readonly overall: number;

  @IsDecimal()
  @IsOptional()
  @Max(5)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 10,
  })
  readonly graphics?: number;

  @IsDecimal()
  @IsOptional()
  @Max(5)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 10,
  })
  readonly sound?: number;

  @IsDecimal()
  @IsOptional()
  @Max(5)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 10,
  })
  readonly story?: number;

  @IsDecimal()
  @IsOptional()
  @Max(5)
  @Min(0)
  @ApiPropertyOptional({
    type: "number",
    minimum: 0,
    maximum: 10,
  })
  readonly gameplay?: number;

  @IsOptional()
  @ApiPropertyOptional({
    type: "string",
  })
  readonly platform?: string;

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

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(10)
  @ApiPropertyOptional({
    type: "array",
    maxItems: 10,
  })
  readonly screenshots?: string[];

  @IsNotEmpty()
  @ApiProperty({
    description: "ID of the game",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly gameId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "019ce334-a06a-78bc-9178-93f7274610ee",
    type: "string",
  })
  readonly userId: string;
}
