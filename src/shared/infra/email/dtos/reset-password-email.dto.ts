import { IsEmail, IsNotEmpty, IsUrl } from "class-validator";

export class ResetPasswordEmailDto {
  @IsNotEmpty()
  readonly name: string;
  
  @IsEmail()
  readonly email: string;

  @IsUrl()
  readonly url: string;
}
