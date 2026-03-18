import { PaymentFrequency } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min, ValidateIf } from "class-validator";

export enum PaymentType {
  Donate = "Donate",
  Perk = "Perk",
}

export class CreatePaymentDto {
  @IsEnum(PaymentType)
  readonly type: PaymentType;

  @IsString()
  @IsNotEmpty()
  readonly productId: string;

  @ValidateIf((o) => o.type === PaymentType.Perk)
  @IsString()
  @IsNotEmpty()
  readonly priceId?: string;

  @ValidateIf((o) => o.type === PaymentType.Perk)
  @IsEnum(PaymentFrequency)
  readonly frequency?: PaymentFrequency;

  @ValidateIf((o) => o.type === PaymentType.Donate)
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(1000000)
  readonly value?: number;

  readonly userId: string;
}
