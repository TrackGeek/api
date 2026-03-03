import { IsEmail, IsUrl } from "class-validator";

export class MagicLinkEmailDto {
  @IsEmail()
  readonly email: string;

  @IsUrl()
  readonly url: string;
}
