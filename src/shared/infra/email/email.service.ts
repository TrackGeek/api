import fs from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { ResendService } from "nestjs-resend";
import { ConfigService } from "@nestjs/config";
import handlebars from "handlebars";

import { SendMagicLinkDto } from "./dtos/send-magic-link.dto";
import { extractNameFromEmail } from "@/shared/utils/email";

@Injectable()
export class EmailService {
	constructor(
		private readonly resendService: ResendService,
		private readonly configService: ConfigService,
	) {}

	private getHtmlTemplate(
		templateName: string,
		variables: Record<string, any>,
	): string {
		const templatePath = path.join(
			__dirname,
			"templates",
			`${templateName}.template.hbs`,
		);
		const templateSource = fs.readFileSync(templatePath, "utf-8");
		const template = handlebars.compile(templateSource);
		return template(variables);
	}

	async sendMagicLink(sendMagicLinkDto: SendMagicLinkDto) {
		const { email, url } = sendMagicLinkDto;

		const name = extractNameFromEmail(email);

		const html = this.getHtmlTemplate("send-magic-link", { name, url });

		await this.resendService.send({
			from: this.configService.get<string>("RESEND_FROM")!,
			to: email,
			subject: "Sign in to TrackGeek",
			html,
		});
	}
}
