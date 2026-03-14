import { Module } from "@nestjs/common";

import { StripeController } from "./controller/stripe.controller";
import { PaymentController } from "./controller/payment.controller";
import { PaymentService } from "./service/payment.service";
import { StripeService } from "./service/stripe.service";

@Module({
  imports: [],
  controllers: [PaymentController, StripeController],
  providers: [PaymentService, StripeService],
  exports: [PaymentService],
})
export class PaymentModule {}
