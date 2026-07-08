import { Module } from "@nestjs/common";
import { PaymentController } from "./controller/payment.controller";
import { PerkController } from "./controller/perk.controller";
import { StripeController } from "./controller/stripe.controller";
import { PaymentService } from "./service/payment.service";
import { PerkService } from "./service/perk.service";
import { StripeService } from "./service/stripe.service";

@Module({
  imports: [],
  controllers: [PaymentController, StripeController, PerkController],
  providers: [PaymentService, StripeService, PerkService],
  exports: [PaymentService],
})
export class PaymentModule {}
