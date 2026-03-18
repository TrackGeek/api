import { IsEmail, IsNotEmpty, IsString, IsUrl } from "class-validator";

export class MagicLinkEmailDto {
  @IsEmail()
  readonly email: string;

  @IsUrl()
  readonly url: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;
}
