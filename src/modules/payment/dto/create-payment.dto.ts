import { PaymentFrequency } from "@prisma/generated/enums";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import type { ClientIpType } from "@/shared/decorators/client-ip.decorator";

export class CreatePaymentDto {
  @IsEnum(PaymentFrequency)
  readonly frequency: PaymentFrequency;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(1000000)
  readonly value: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => (typeof value === "string" ? value.toLowerCase() : value))
  readonly currency?: string;

  readonly userId: string;

  readonly clientIp: ClientIpType;
}
