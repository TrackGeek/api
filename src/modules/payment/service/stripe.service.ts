import { DatabaseService } from "@/shared/infra/database/database.service";
import { formatValue } from "@/shared/utils/currency";
import { capitalizeFirstLetter, toCamelCase } from "@/shared/utils/string";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentFrequency, PaymentStatus, UserTier } from "@prisma/generated/enums";
import Stripe from "stripe";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { GetProductsDto } from "../dto/get-products.dto";
import { DEFAULT_CURRENCY } from "@/shared/constants/payment";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";

export interface StripeProduct {
  id: string;
  title: string;
  enum: string;
  description: string | null;
  imageUrl: string | null;
  prices: Array<{
    id: string;
    frequency: PaymentFrequency;
    value: {
      raw: number;
      formatted: string;
      discount: {
        promotionCodeId: string;
        discountedRaw: number;
        discountedFormatted: string;
        percentage: number | null;
      } | null;
    };
  }>;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {
    const token = this.configService.get<string>("STRIPE_SECRET_KEY") as string;
    const apiVersion = "2026-02-25.clover";

    this.stripe = new Stripe(token, { apiVersion });
  }

  get client(): Stripe {
    return this.stripe;
  }

  async getCustomerId(name: string, email: string) {
    const customerAlreadyExists = await this.client.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;

    if (customerAlreadyExists.data.length > 0) {
      customerId = customerAlreadyExists.data[0].id;
    } else {
      const customer = await this.client.customers.create({
        name,
        email,
      });

      customerId = customer.id;
    }

    return customerId;
  }

  async getProducts(getProductsDto?: GetProductsDto): Promise<StripeProduct[]> {
    const prices = await this.client.prices.list({
      currency: DEFAULT_CURRENCY,
      active: true,
      expand: ["data.product"],
    });

    const upgradeCoupons = getProductsDto?.userId
      ? await this.databaseService.upgradeCoupon.findMany({
          where: { userId: getProductsDto.userId },
        })
      : [];

    const productsMap = new Map<string, any>();

    for (const price of prices.data) {
      const product = price.product as Stripe.Product;

      if (!productsMap.has(product.id)) {
        productsMap.set(product.id, {
          id: product.id,
          title: product.name,
          enum: capitalizeFirstLetter(toCamelCase(product.name)),
          description: product.description,
          imageUrl: product.images?.[0] ?? null,
          prices: [],
        });
      }

      const productEnum = capitalizeFirstLetter(toCamelCase(product.name));
      const coupon = upgradeCoupons.find((c) => c.targetTier === productEnum);

      const rawPrice = price.unit_amount!;
      const discountAmount = coupon ? coupon.discountAmount : 0;
      const discountedPrice = Math.max(rawPrice - discountAmount, 0);
      const discountPercentage = discountAmount > 0 ? Math.round((discountAmount / rawPrice) * 100) : null;

      productsMap.get(product.id).prices.push({
        id: price.id,
        frequency: price.recurring ? PaymentFrequency.Monthly : PaymentFrequency.OneTime,
        value: {
          raw: rawPrice,
          formatted: formatValue(rawPrice, price.currency),
          currency: price.currency,
          discount: coupon
            ? {
                promotionCodeId: coupon.promotionCodeId,
                discountedRaw: discountedPrice,
                discountedFormatted: formatValue(discountedPrice, price.currency),
                percentage: discountPercentage,
              }
            : null,
        },
      });
    }

    return Array.from(productsMap.values()).sort((a, b) => a.prices[0].value.raw - b.prices[0].value.raw);
  }

  async getCurrentSubscription(userId: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user?.stripeCustomerId) {
      return null;
    }

    const subscriptions = await this.client.subscriptions.list({
      customer: user?.stripeCustomerId,
      limit: 1,
    });
    
    const subscription = subscriptions?.data?.[0] ?? null;

    if (!subscription) {
      return null;
    }

    const item = subscription.items.data[0];
    const price = item?.price;
    
    const products = await this.getProducts();
    
    const product = products.find((p) => p.id === price?.product);

    return {
      id: subscription.id,
      status: subscription.status,
      renewsAt: new Date(item.current_period_end * 1000),
      product,
      price: {
        raw: price?.unit_amount ?? 0,
        formatted: formatValue(price?.unit_amount ?? 0, price?.currency ?? DEFAULT_CURRENCY),
        currency: price?.currency ?? DEFAULT_CURRENCY,
      },
    }
  }

  async cancelCurrentSubscription(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);

    if (!subscription) {
      throw new AppException(ERROR_CODES.STRIPE_SUBSCRIPTION_NOT_FOUND);
    }

    const deletedSubscription = await this.client.subscriptions.cancel(subscription.id, {
      prorate: false,
      cancellation_details: {
        comment: "User requested subscription cancellation.",
      },
    });

    return {
      id: deletedSubscription.id,
      status: deletedSubscription.status,
    };
  }

  async handleCheckoutSessionCompletedEvent(event: Stripe.Event) {
    const sessionEvent = event.data.object as Stripe.Checkout.Session;

    const payment = await this.databaseService.payment.findFirst({
      where: {
        stripeCheckoutSessionId: sessionEvent.id,
      },
      include: {
        user: true,
      },
    });

    if (!payment || sessionEvent.payment_status !== "paid") {
      return;
    }
    
    const isSubscription = sessionEvent.mode === "subscription";
    const productEnum = capitalizeFirstLetter(toCamelCase(payment.name));
    const isDonate = !Object.values(UserTier).includes(productEnum as UserTier);

    const stripeSubscriptionId =  isSubscription ? sessionEvent?.subscription as string : null
    
    const stripeInvoiceUrl = await this.client.invoices
      .list({ customer: payment.stripeCustomerId, limit: 1 })
      .then((invoice) => invoice?.data?.[0]?.hosted_invoice_url ?? null)
      .catch(() => null);
    
    const stripePaymentIntentId = await this.client.paymentIntents
      .list({ customer: payment.stripeCustomerId, limit: 1 })
      .then((list) => list?.data?.[0]?.id ?? null)
      .catch(() => null);
    
    const stripeChargeId = await this.client.charges
      .list({ customer: payment.stripeCustomerId, limit: 1 })
      .then((list) => list?.data?.[0]?.id ?? null)
      .catch(() => null);

    await this.databaseService.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: PaymentStatus.Succeeded,
        stripeInvoiceUrl,
        stripeChargeId,
        stripePaymentIntentId,
        stripeSubscriptionId,
      },
    });

    const totalDonated = await this.databaseService.payment.aggregate({
      where: {
        userId: payment.userId,
        status: PaymentStatus.Succeeded,
      },
      _sum: {
        totalValue: true,
      },
    });

    const totalValue = totalDonated._sum.totalValue ?? payment.totalValue;

    const tiers = await this.getProducts().then((products) =>
      products.filter((p) => Object.values(UserTier).includes(p.enum as UserTier)),
    );

    const sortedTiers = [...tiers].sort((a, b) => {
      const aMin = Math.min(...a.prices.map((p) => p.value.raw));
      const bMin = Math.min(...b.prices.map((p) => p.value.raw));

      return aMin - bMin;
    });

    const tierToGive = [...sortedTiers]
      .reverse()
      .find((tier) => tier.prices.some((price) => price.value.raw <= totalValue)) as StripeProduct | undefined;

    let upgradedTier: StripeProduct | null = null;

    if (tierToGive) {
      const currentTierIndex = sortedTiers.findIndex((t) => t.enum === payment.user?.tier);
      const newTierIndex = sortedTiers.findIndex((t) => t.enum === tierToGive.enum);

      if (newTierIndex > currentTierIndex) {
        upgradedTier = tierToGive;

        await this.databaseService.user.update({
          where: {
            id: payment.userId,
          },
          data: {
            tier: tierToGive.enum as UserTier,
          },
        });
      }
    }

    if (isSubscription && stripeSubscriptionId) {
      const activeSubscriptions = await this.client.subscriptions.list({
        customer: payment.stripeCustomerId,
        status: "active",
      });

      for (const sub of activeSubscriptions.data) {
        if (sub.id !== stripeSubscriptionId) {
          await this.client.subscriptions.cancel(sub.id, {
            prorate: false,
            cancellation_details: {
              comment: "Subscription upgrade.",
            },
          });
        }
      }
    }

    const contributorMedal = await this.databaseService.medal.findUnique({
      where: { name: "contributor" },
    });

    if (contributorMedal) {
      const alreadyHasMedal = await this.databaseService.userMedal.findFirst({
        where: {
          userId: payment.userId,
          medalId: contributorMedal.id,
        },
      });

      if (!alreadyHasMedal) {
        await this.databaseService.userMedal.create({
          data: {
            userId: payment.userId,
            medalId: contributorMedal.id,
          },
        });
      }
    }

    const currentTier = tierToGive ?? sortedTiers.find((t) => t.enum === payment.user?.tier);
    const currentTierIndex = sortedTiers.findIndex((t) => t.enum === currentTier?.enum);
    const upgradableTiers = sortedTiers.slice(currentTierIndex + 1);

    const obsoleteCoupons = await this.databaseService.upgradeCoupon.findMany({
      where: {
        userId: payment.userId,
        targetTier: { in: sortedTiers.slice(0, currentTierIndex + 1).map((t) => t.enum) },
      },
    });

    for (const obsolete of obsoleteCoupons) {
      await this.client.promotionCodes.update(obsolete.promotionCodeId, { active: false });
      await this.databaseService.upgradeCoupon.delete({ where: { id: obsolete.id } });
    }

    for (const targetTier of upgradableTiers) {
      const targetPrice = Math.min(...targetTier.prices.map((p) => p.value.raw));
      const discountAmount = Math.min(totalValue, targetPrice - 1);

      if (discountAmount <= 0) continue;

      const existingCoupon = await this.databaseService.upgradeCoupon.findFirst({
        where: {
          userId: payment.userId,
          targetTier: targetTier.enum,
        },
      });

      if (existingCoupon) {
        await this.client.promotionCodes.update(existingCoupon.promotionCodeId, {
          active: false,
        });

        await this.databaseService.upgradeCoupon.delete({
          where: { id: existingCoupon.id },
        });
      }

      const coupon = await this.client.coupons.create({
        amount_off: discountAmount,
        currency: DEFAULT_CURRENCY,
        duration: "once",
        name: `Upgrade to ${targetTier.title}`.slice(0, 40),
        applies_to: {
          products: [targetTier.id],
        },
      });

      const promotionCode = await this.client.promotionCodes.create({
        promotion: {
          type: "coupon",
          coupon: coupon.id,
        },
        customer: payment.stripeCustomerId,
        max_redemptions: 1,
      });

      await this.databaseService.upgradeCoupon.create({
        data: {
          userId: payment.userId,
          targetTier: targetTier.enum,
          promotionCodeId: promotionCode.id,
          discountAmount,
        },
      });
    }

    await this.queueService.toPaymentSuccessJob({
      paymentId: payment.id,
      name: payment.user!.name,
      email: payment.user!.email,
      invoiceUrl: stripeInvoiceUrl ?? "",
      isDonate,
      isSubscription,
      tier: upgradedTier?.title ?? null,
      subtotal: formatValue(payment.subtotalValue, payment.currency),
      discount: payment.discountValue ? formatValue(payment.discountValue, payment.currency) : null,
      total: formatValue(payment.totalValue, payment.currency),
    });
  }
  
  async handleSubscriptionDeletedEvent(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;

    if (subscription.cancellation_details?.comment === "Subscription upgrade.") {
      return;
    }

    const user = await this.databaseService.user.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (!user) {
      return;
    }

    const productId = subscription.items.data[0]?.price.product as string;
    const product = await this.client.products.retrieve(productId);

    await this.queueService.toSubscriptionCancelledJob({
      name: user.name,
      email: user.email,
      tier: product.name,
    });
  }
}
