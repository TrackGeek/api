import {
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Post,
  Req,
  Session,
  UseGuards,
  type RawBodyRequest,
} from "@nestjs/common";
import { StripeService } from "../service/stripe.service";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AuthGuard, type UserSession } from "@thallesp/nestjs-better-auth";
import { ClientIp, type ClientIpType } from "@/shared/decorators/client-ip.decorator";
import { getUserCurrency } from "@/shared/utils/currency";

@ApiTags("Payment")
@Controller("/stripe")
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  @Get("/currency")
  async getCurrency(@ClientIp() clientIp: ClientIpType) {
    const currency = await getUserCurrency(clientIp);

    return { currency };
  }

  @Get("/price")
  async getPrices(@ClientIp() clientIp: ClientIpType) {
    const prices = await this.stripeService.getPrices(clientIp);

    return { prices };
  }

  @UseGuards(AuthGuard)
  @Get("/subscription")
  async getCurrentSubscription(@Session() session: UserSession) {
    const subscription = await this.stripeService.getCurrentSubscription(session.user.id);

    return { subscription };
  }

  @UseGuards(AuthGuard)
  @Delete("/subscription")
  async cancelCurrentSubscription(@Session() session: UserSession) {
    const subscription = await this.stripeService.cancelCurrentSubscription(session.user.id);

    return { subscription };
  }

  @Post("/webhook")
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers("stripe-signature") signature: string) {
    const stripeWebhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET") as string;

    let event: Stripe.Event;

    try {
      event = this.stripeService.client.webhooks.constructEvent(req.rawBody as Buffer, signature, stripeWebhookSecret);
    } catch (error: any) {
      this.logger.error("Stripe webhook signature verification failed.", error);

      throw new AppException(ERROR_CODES.STRIPE_WEBHOOK_ERROR);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        await this.stripeService.handleCheckoutSessionCompletedEvent(event);

        break;
      }

      case "invoice.payment_succeeded": {
        await this.stripeService.handleInvoicePaymentSucceededEvent(event);

        break;
      }

      case "invoice.payment_failed": {
        await this.stripeService.handleInvoicePaymentFailedEvent(event);

        break;
      }

      case "customer.subscription.deleted": {
        await this.stripeService.handleSubscriptionDeletedEvent(event);

        break;
      }

      default: {
        break;
      }
    }
  }
}
