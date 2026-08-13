import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsISO31661Alpha2, IsOptional } from "class-validator";

export class GetMovieWatchProvidersDto {
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value))
  @IsISO31661Alpha2()
  @IsOptional()
  @ApiPropertyOptional({
    description: "ISO 3166-1 alpha-2 country code",
    example: "BR",
    default: "US",
    type: "string",
  })
  readonly region?: string;
}
