import {
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Req,
  type RawBodyRequest,
} from "@nestjs/common";
import { StripeService } from "../service/stripe.service";
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { ClientIp, type ClientIpType } from '@/shared/decorators/client-ip.decorator';

@ApiTags("Stripe")
@Controller("/stripe")
export class StripeController {
  private readonly logger = new Logger(StripeController.name);
  
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}
  
  @Get("/product")
  async getProducts(@ClientIp() clientIp: ClientIpType) {
    const products = await this.stripeService.getProducts(clientIp)
    
    return { products }
  }
  
  @Post('/webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const stripeWebhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') as string;
    
    let event: Stripe.Event;
    
    try {
      event = this.stripeService.client.webhooks.constructEvent(
        req.rawBody as Buffer,
        signature,
        stripeWebhookSecret,
      );
    } catch (error) {
      this.logger.error('Stripe webhook signature verification failed.', error);
      
      throw new AppException(ERROR_CODES.STRIPE_WEBHOOK_ERROR)
    }
    
    this.logger.log(event)
  }
}
