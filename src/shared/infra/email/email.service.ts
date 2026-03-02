import fs from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import handlebars from "handlebars";
import { ResendService } from "nestjs-resend";
import { extractNameFromEmail } from "@/shared/utils/email";
import { MagicLinkEmailDto } from "./dtos/magic-link-email.dto";
import { ResetPasswordEmailDto } from "./dtos/reset-password-email.dto";

@Injectable()
export class EmailService {
  constructor(
    private readonly resendService: ResendService,
    private readonly configService: ConfigService,
  ) {}

  private getHtmlTemplate(templateName: string, variables: Record<string, any>): string {
    const baseDir =
      process.env.NODE_ENV === "development" ? path.join(process.cwd(), "src", "shared", "infra", "email") : __dirname;

    const templatePath = path.join(baseDir, "templates", `${templateName}.template.hbs`);
    const templateSource = fs.readFileSync(templatePath, "utf-8");

    const template = handlebars.compile(templateSource);

    return template(variables);
  }

  async sendMagicLinkEmail(magicLinkEmailDto: MagicLinkEmailDto) {
    const { email, url } = magicLinkEmailDto;

    const name = extractNameFromEmail(email);

    await this.resendService.send({
      from: this.configService.get<string>("RESEND_FROM")!,
      to: email,
      subject: "Sign in to TrackGeek",
      html: this.getHtmlTemplate("magic-link-email", { name, url }),
    });
  }

  async sendResetPasswordEmail(resetPasswordEmailDto: ResetPasswordEmailDto) {
    const { name, email, url } = resetPasswordEmailDto;

    await this.resendService.send({
      from: this.configService.get<string>("RESEND_FROM")!,
      to: email,
      subject: "Reset your password for TrackGeek",
      html: this.getHtmlTemplate("reset-password-email", { name, url }),
    });
  }
}
