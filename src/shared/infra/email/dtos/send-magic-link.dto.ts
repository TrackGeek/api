import { IsEmail, IsUrl } from "class-validator";

export class SendMagicLinkDto {
	@IsEmail()
	readonly email: string;

	@IsUrl()
	readonly url: string;
}
