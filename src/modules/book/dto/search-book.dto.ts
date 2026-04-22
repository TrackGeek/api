import { HardcoverBookOrderBy } from '@/shared/infra/integrations/hardcover.service';
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, IsString, Matches } from "class-validator";

export class SearchBookDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: "Lookup for a book matching a name",
    example: "The Witcher",
    type: "string",
  })
  readonly query?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    type: "number",
    default: 1,
  })
  readonly page?: number;
  
  @IsOptional()
  @IsString()
  @IsOptional()
  readonly status?: string;
  
  @IsEnum(HardcoverBookOrderBy)
  @IsOptional()
  readonly orderBy?: HardcoverBookOrderBy;
  
  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  readonly categories?: string[];
  
  @Matches(/^\d{4}$/)
  @IsOptional()
  readonly year?: string;
}
