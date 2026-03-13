import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";
import { HardcoverBookFilter } from "@/shared/infra/integrations/hardcover.service";

export class TopBookDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    type: "number",
    default: 1,
  })
  readonly page?: number;

  @IsEnum(HardcoverBookFilter)
  @ApiProperty({
    enum: HardcoverBookFilter,
  })
  readonly filter: HardcoverBookFilter;
}
