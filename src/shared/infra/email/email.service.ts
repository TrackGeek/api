import fs from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import handlebars from "handlebars";
import { ResendService } from "nestjs-resend";
import { MagicLinkEmailDto } from "./dto/magic-link-email.dto";
import { PaymentFailedEmailDto } from "./dto/payment-failed-email.dto";
import { PaymentSuccessEmailDto } from "./dto/payment-success-email.dto";
import { ResetPasswordEmailDto } from "./dto/reset-password-email.dto";
import { SubscriptionCancelledEmailDto } from "./dto/subscription-cancelled-email.dto";

@Injectable()
export class EmailService {
  constructor(
    private readonly resendService: ResendService,
    private readonly configService: ConfigService,
  ) {}

  private getHtmlTemplate(templateName: string, variables: Record<string, any>): string {
    const templatePath = path.join(__dirname, "templates", `${templateName}.template.hbs`);
    const templateSource = fs.readFileSync(templatePath, "utf-8");

    const template = handlebars.compile(templateSource);

    return template(variables);
  }

  async sendMagicLinkEmail(magicLinkEmailDto: MagicLinkEmailDto) {
    await this.resendService.send({
      from: this.configService.get<string>("RESEND_FROM")!,
      to: magicLinkEmailDto.email,
      subject: "Sign in to TrackGeek",
      html: this.getHtmlTemplate("magic-link-email", magicLinkEmailDto),
    });
  }

  async sendResetPasswordEmail(resetPasswordEmailDto: ResetPasswordEmailDto) {
    await this.resendService.send({
      from: this.configService.get<string>("RESEND_FROM")!,
      to: resetPasswordEmailDto.email,
      subject: "Reset your password for TrackGeek",
      html: this.getHtmlTemplate("reset-password-email", resetPasswordEmailDto),
    });
  }

  async sendPaymentSuccessEmail(paymentSuccessEmailDto: PaymentSuccessEmailDto) {
    await this.resendService.send({
      from: this.configService.get<string>("RESEND_FROM")!,
      to: paymentSuccessEmailDto.userEmail,
      subject: "Thank you for your payment!",
      html: this.getHtmlTemplate("payment-success-email", paymentSuccessEmailDto),
    });
  }

  async sendSubscriptionCancelledEmail(subscriptionCancelledEmailDto: SubscriptionCancelledEmailDto) {
    await this.resendService.send({
      from: this.configService.get<string>("RESEND_FROM")!,
      to: subscriptionCancelledEmailDto.userEmail,
      subject: "Your subscription has been cancelled",
      html: this.getHtmlTemplate("subscription-cancelled-email", subscriptionCancelledEmailDto),
    });
  }

  async sendPaymentFailedEmail(paymentFailedEmailDto: PaymentFailedEmailDto) {
    await this.resendService.send({
      from: this.configService.get<string>("RESEND_FROM")!,
      to: paymentFailedEmailDto.userEmail,
      subject: "Payment failed - we'll retry automatically",
      html: this.getHtmlTemplate("payment-failed-email", paymentFailedEmailDto),
    });
  }
}
