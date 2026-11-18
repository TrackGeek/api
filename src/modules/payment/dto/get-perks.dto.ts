import { Transform } from "class-transformer";
import { IsOptional, IsString, Length } from "class-validator";

export class GetPerksDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => (typeof value === "string" ? value.toLowerCase() : value))
  readonly currency?: string;
}
