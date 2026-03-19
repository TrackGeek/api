import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class PaymentFailedEmailDto {
  @IsString()
  @IsNotEmpty()
  readonly userName: string;

  @IsEmail()
  readonly userEmail: string;

  @IsString()
  readonly value: string;
}
