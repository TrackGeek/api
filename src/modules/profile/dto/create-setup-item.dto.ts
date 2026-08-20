import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from "class-validator";

export class CreateSetupItemDto {
  readonly userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({
    description: "Name of the component",
    example: 'Odyssey G7 27"',
    type: "string",
  })
  readonly name: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  @ApiPropertyOptional({
    description: "Brand of the component",
    example: "Samsung",
    type: "string",
  })
  readonly brand?: string;

  @ValidateIf((_object, value) => value !== "")
  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Reference link for the component",
    example: "https://example.com/product",
    type: "string",
  })
  readonly link?: string;
}
