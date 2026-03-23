import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from "class-validator";

export class SearchGameDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: "Look up games matching a name.",
    example: "Grand Theft Auto",
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
