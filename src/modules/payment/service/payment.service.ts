import { Injectable } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { PaymentFrequency, PaymentStatus } from "@prisma/generated/enums";
import { GetPaymentsDto } from "../dto/get-payments.dto";
import { PaymentFindManyArgs } from "@prisma/generated/models";
import { capitalizeFirstLetter, toCamelCase } from "@/shared/utils/string";
import { CreatePaymentDto, PaymentType } from "../dto/create-payment.dto";
import Stripe from "stripe";
import { UpgradeCoupon } from "@prisma/generated/client";
import { DEFAULT_CURRENCY } from "@/shared/constants/payment";

@Injectable()
export class PaymentService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async createPayment(dto: CreatePaymentDto) {
    const { type, productId, userId } = dto;

    const isDonate = type === PaymentType.Donate;
    const isSubscription = dto.frequency === PaymentFrequency.Monthly;

    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    const stripeProduct = await this.stripeService.client.products.retrieve(productId);

    if (!stripeProduct) {
      throw new AppException(ERROR_CODES.STRIPE_PRODUCT_NOT_FOUND);
    }

    let stripePrice: Stripe.Price | null = null;

    if (!isDonate) {
      stripePrice = await this.stripeService.client.prices.retrieve(dto.priceId!);

      if (!stripePrice) {
        throw new AppException(ERROR_CODES.STRIPE_PRICE_NOT_FOUND);
      }

      const paymentAlreadyExists = await this.databaseService.payment.findFirst({
        where: {
          userId,
          stripeProductId: productId,
          status: PaymentStatus.Pending,
        },
      });

      if (paymentAlreadyExists && paymentAlreadyExists.expiredAt > new Date()) {
        const session = await this.stripeService.client.checkout.sessions.retrieve(
          paymentAlreadyExists.stripeCheckoutSessionId,
        );

        return { id: session.id, url: session.url };
      }
    }
    
    let stripeCustomerId = user?.stripeCustomerId ?? null;
    
    if (!stripeCustomerId) {
      stripeCustomerId = await this.stripeService.getCustomerId(user.name, user.email);

      await this.databaseService.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    const expiredAt = new Date();

    expiredAt.setMinutes(expiredAt.getMinutes() + 30);

    let upgradeCoupon: UpgradeCoupon | null = null;

    if (!isDonate) {
      const productEnum = capitalizeFirstLetter(toCamelCase(stripeProduct.name));

      upgradeCoupon = await this.databaseService.upgradeCoupon.findFirst({
        where: { userId, targetTier: productEnum },
      });
    }

    const subtotalValue = isDonate ? dto.value! : stripePrice!.unit_amount!;
    const discountValue = upgradeCoupon?.discountAmount ?? 0;
    const totalValue = subtotalValue - discountValue;

    const session = await this.stripeService.client.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      customer: stripeCustomerId,
      success_url: `${this.configService.get<string>("WEB_URL")}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get<string>("WEB_URL")}/donate/error`,
      metadata: { userId: user.id },
      expires_at: Math.floor(expiredAt.getTime() / 1000),
      line_items: isDonate
        ? [{ quantity: 1, price_data: { currency: DEFAULT_CURRENCY, product: productId, unit_amount: totalValue } }]
        : [{ quantity: 1, price: dto.priceId! }],
      ...(upgradeCoupon && {
        discounts: [{ promotion_code: upgradeCoupon.promotionCodeId }],
      }),
    });

    await this.databaseService.payment.create({
      data: {
        name: stripeProduct.name,
        subtotalValue,
        discountValue: discountValue || null,
        totalValue,
        currency: DEFAULT_CURRENCY,
        status: PaymentStatus.Pending,
        frequency: dto.frequency ?? PaymentFrequency.OneTime,
        stripeCheckoutSessionId: session.id,
        stripeCustomerId,
        stripeProductId: productId,
        stripePromotionCodeId: upgradeCoupon?.promotionCodeId ?? null,
        userId,
        expiredAt,
      },
    });

    return { id: session.id, url: session.url };
  }

  async getPayments(getPaymentsDto: GetPaymentsDto) {
    const payments = await this.databaseService.offsetPagination<PaymentFindManyArgs>({
      model: "payment",
      itemsPerPage: getPaymentsDto.itemsPerPage,
      page: getPaymentsDto.page,
      orderBy: { createdAt: "desc" },
      where: {
        userId: getPaymentsDto.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            profile: {
              select: {
                id: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return payments;
  }

  async getPaymentByCheckoutSessionId(checkoutSessionId: string) {
    const payment = await this.databaseService.payment.findFirst({
      where: {
        stripeCheckoutSessionId: checkoutSessionId,
      },
    });

    if (!payment) {
      throw new AppException(ERROR_CODES.PAYMENT_NOT_FOUND);
    }

    return payment;
  }
}
