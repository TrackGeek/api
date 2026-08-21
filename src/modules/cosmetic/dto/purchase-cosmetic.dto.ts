import { ApiProperty } from "@nestjs/swagger";
import { CosmeticType } from "@prisma/generated/enums";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export class PurchaseCosmeticDto {
  @IsEnum(CosmeticType)
  @IsNotEmpty()
  @ApiProperty({ enum: CosmeticType })
  readonly type: CosmeticType;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly key: string;
}
