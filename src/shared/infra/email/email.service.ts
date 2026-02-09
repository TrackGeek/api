import { Injectable } from "@nestjs/common";
import { ResendService } from "nestjs-resend";
import { ConfigService } from "@nestjs/config";

import { SendMagicLinkDto } from "./dtos/send-magic-link.dto";
import { extractNameFromEmail } from "@/shared/utils/email";

@Injectable()
export class EmailService {
	constructor(
		private readonly resendService: ResendService,
		private readonly configService: ConfigService,
	) {}

	async sendMagicLink(sendMagicLinkDto: SendMagicLinkDto) {
		const { email, url } = sendMagicLinkDto;

		await this.resendService.send({
			from: this.configService.get<string>("RESEND_FROM")!,
			to: email,
			subject: "Sign in to TrackGeek",
			html: `
        <body style="margin: 0; padding: 40px 20px; font-family: Arial, sans-serif; background-color: #1c1917;">
          <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1c1917; border: 1px solid #ffffff1a; border-radius: 8px; padding: 60px 40px;">
            <tr>
              <td style="text-align: center;">
                <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 500; line-height: 1.3;">
                  Hello, ${extractNameFromEmail(email)}!
                </h2>
                
                <p style="margin: 0 0 30px 0; color: #a6a09b; font-size: 18px; line-height: 1.5;">Click the button below to securely sign in to your account:</p>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding: 20px 0;">
                <a href="${url}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 24px; font-weight: 600; padding: 20px; text-decoration: none; border-radius: 8px;">
                  Sign in to TrackGeek
                </a>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 20px;">
                <p style="margin: 0; color: #a6a09b; font-size: 16px; line-height: 1.5;">
                  If you did not request this link, please ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </body>
      `,
		});
	}
}
