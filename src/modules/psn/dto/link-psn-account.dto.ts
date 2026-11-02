import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";

export class LinkPsnAccountDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(64, 64)
  @ApiProperty({
    description: "NPSSO token from https://ca.account.sony.com/api/v1/ssocookie, exchanged and never stored",
    example: "aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789aBcDeFgHiJkLmNoPqRsTuVwXyZ01",
    type: "string",
  })
  readonly npsso: string;
}
