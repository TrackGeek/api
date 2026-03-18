import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class SubscriptionCancelledEmailDto {
  @IsString()
  @IsNotEmpty()
  readonly userName: string;

  @IsEmail()
  readonly userEmail: string;
  
  @IsString()
  readonly value: string;
}
