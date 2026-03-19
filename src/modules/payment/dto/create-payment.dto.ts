import type { ClientIpType } from "@/shared/decorators/client-ip.decorator";
import { PaymentFrequency } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsInt, Max, Min } from "class-validator";

export class CreatePaymentDto {
  @IsEnum(PaymentFrequency)
  readonly frequency: PaymentFrequency;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(1000000)
  readonly value: number;

  readonly userId: string;

  readonly clientIp: ClientIpType;
}
