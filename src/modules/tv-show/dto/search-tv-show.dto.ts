import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

export class SearchTVShowDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: "Look up tv shows matching an name.",
    example: "La Casa de Papel",
    type: "string",
  })
  readonly query: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    type: "number",
    default: 1,
  })
  readonly page?: number;
}
