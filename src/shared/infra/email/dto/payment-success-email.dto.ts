import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from "class-validator";

export class PaymentSuccessEmailDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsEmail()
  readonly email: string;

  @IsBoolean()
  readonly isSubscription: boolean;

  @IsBoolean()
  readonly isDonate: boolean;

  @IsString()
  @IsOptional()
  readonly tier?: string | null;

  @IsUUID()
  readonly paymentId: string;

  @IsUrl()
  readonly invoiceUrl: string;

  @IsString()
  readonly subtotal: string;

  @IsString()
  @IsOptional()
  readonly discount?: string | null;

  @IsString()
  readonly total: string;
}
