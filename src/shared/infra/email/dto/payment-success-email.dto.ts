import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from "class-validator";

export class PaymentSuccessEmailDto {
  @IsString()
  @IsNotEmpty()
  readonly userName: string;

  @IsEmail()
  readonly userEmail: string;

  @IsString()
  @IsOptional()
  readonly tier?: string | null;

  @IsUUID()
  readonly paymentId: string;

  @IsUrl()
  readonly invoiceUrl: string;

  @IsString()
  readonly value: string;
}
