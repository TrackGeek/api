import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SetupItemType } from "@prisma/generated/enums";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from "class-validator";

export class CreateSetupItemDto {
  readonly userId: string;

  @IsEnum(SetupItemType)
  @IsOptional()
  @ApiPropertyOptional({
    description: "Type of the entry",
    enum: SetupItemType,
    default: SetupItemType.COMPONENT,
  })
  readonly type?: SetupItemType;

  @ValidateIf((object: CreateSetupItemDto) => object.type !== SetupItemType.DIVIDER)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({
    description: "Name of the component, or text of the title",
    example: 'Odyssey G7 27"',
    type: "string",
  })
  readonly name?: string;

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
