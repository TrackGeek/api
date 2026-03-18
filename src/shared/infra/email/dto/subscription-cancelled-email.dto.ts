import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class SubscriptionCancelledEmailDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  readonly tier: string;
}
