import { Module } from "@nestjs/common";

import { StripeController } from "./controller/stripe.controller";
import { PaymentController } from "./controller/payment.controller";
import { PaymentService } from "./service/payment.service";
import { StripeService } from "./service/stripe.service";
import { PerkController } from "./controller/perk.controller";
import { PerkService } from "./service/perk.service";

@Module({
  imports: [],
  controllers: [PaymentController, StripeController, PerkController],
  providers: [PaymentService, StripeService, PerkService],
  exports: [PaymentService],
})
export class PaymentModule {}
