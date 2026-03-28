import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {Type} from "class-transformer";
import {IsInt, IsNotEmpty, IsOptional, IsPositive, IsString} from "class-validator";

export class SearchMovieDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: "Look up movies matching an name.",
    example: "John Wick",
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
