import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {Type} from "class-transformer";
import {IsInt, IsNotEmpty, IsOptional, IsPositive, IsString} from "class-validator";

export class SearchBookDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: "Lookup for a book matching a name",
    example: "The Witcher",
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
