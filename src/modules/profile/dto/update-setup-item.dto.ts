import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from "class-validator";

export class UpdateSetupItemDto {
  readonly userId: string;

  readonly itemId: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  @ApiPropertyOptional({
    description: "Name of the component, or text of the title",
    example: 'Odyssey G7 27"',
    type: "string",
  })
  readonly name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  @ApiPropertyOptional({
    description: "Brand of the component, empty to clear it",
    example: "Samsung",
    type: "string",
  })
  readonly brand?: string;

  @ValidateIf((_object, value) => value !== "")
  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Reference link for the component, empty to clear it",
    example: "https://example.com/product",
    type: "string",
  })
  readonly link?: string;
}
