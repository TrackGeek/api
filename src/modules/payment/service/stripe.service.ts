import { HttpService } from "@nestjs/axios";
import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ActivityType, PaymentStatus } from "@prisma/generated/enums";
import { firstValueFrom } from "rxjs";
import Stripe from "stripe";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { DEFAULT_CURRENCY } from "@/shared/constants/payment";
import type { ClientIpType } from "@/shared/decorators/client-ip.decorator";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { formatValue, getUserCurrency } from "@/shared/utils/currency";
import { PerkService } from "./perk.service";

export interface PriceValue {
  raw: number;
  formatted: string;
  currency: string;
}

export interface Price {
  id: string;
  productId: string | null;
  value: {
    converted: PriceValue;
    original: PriceValue;
  };
}

interface ConvertValue {
  value: number;
  currency: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    @Inject(forwardRef(() => PerkService))
    private readonly perkService: PerkService,
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
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

  /**
   * Pra usar tem que criar o produto no Stripe com o nome "Donate" e ativar ele. O ID do produto é usado para criar os preços.
   */
  async donateProduct(): Promise<Stripe.Product> {
    const donateProduct = await this.client.products
      .list({ active: true, limit: 100 })
      .then((res) => (res.data?.find((product) => product.name === "Donate") as Stripe.Product | undefined) ?? null)
      .catch(() => null);

    if (!donateProduct) {
      throw new AppException(ERROR_CODES.STRIPE_DONATE_PRODUCT_NOT_FOUND);
    }

    return donateProduct;
  }

  async convertCurrency(value: number, from: string, to: string): Promise<ConvertValue> {
    try {
      if (from.toLowerCase() === to.toLowerCase()) {
        return { value, currency: from };
      }

      const cachedCurrency = await this.cacheService.get<ConvertValue>(
        CACHE_KEYS.CONVERT_CURRENCY.prefix(value, from, to),
      );

      if (cachedCurrency) {
        return cachedCurrency;
      }

      const currencyResponse = await firstValueFrom(
        this.httpService.get("https://www.revolut.com/api/exchange/quote", {
          params: {
            amount: value,
            country: "GB",
            localeCode: "pt-BR",
            isRecipientAmount: false,
            toCurrency: to.toUpperCase(),
            fromCurrency: from.toUpperCase(),
          },
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            Referer: "https://www.revolut.com/",
            Origin: "https://www.revolut.com",
          },
        }),
      );

      const currencyData = currencyResponse.data;

      const currency: ConvertValue = {
        value: currencyData?.recipient?.amount,
        currency: currencyData?.recipient?.currency?.toLowerCase(),
      };

      await this.cacheService.set<ConvertValue>(
        CACHE_KEYS.CONVERT_CURRENCY.prefix(value, from, to),
        currency,
        CACHE_KEYS.CONVERT_CURRENCY.expiration,
      );

      return currency;
    } catch (error: any) {
      this.logger.error("Error converting currency", error);

      return {
        value,
        currency: from,
      };
    }
  }

  async getPrices(clientIp?: ClientIpType): Promise<Price[]> {
    const userCurrency = await getUserCurrency(clientIp);
    const donateProduct = await this.donateProduct();

    const prices = [300, 500, 1000, 1500, 2500, 5000];

    const values = await Promise.all(
      prices.map(async (price, index) => {
        const convertedCurrency = await this.convertCurrency(price, DEFAULT_CURRENCY, userCurrency);

        return {
          id: `price_${index + 1}`,
          productId: donateProduct?.id ?? null,
          value: {
            converted: {
              raw: convertedCurrency.value,
              formatted: formatValue(convertedCurrency.value / 100, convertedCurrency.currency),
              currency: convertedCurrency.currency,
            },
            original: {
              raw: price,
              formatted: formatValue(price / 100, DEFAULT_CURRENCY),
              currency: DEFAULT_CURRENCY,
            },
          },
        };
      }),
    );

    return values.sort((a, b) => a.value.converted.raw - b.value.converted.raw);
  }

  async getOrCreatePrice(
    productId: string,
    unitAmount: number,
    currency: string,
    isSubscription: boolean,
  ): Promise<string> {
    let lastId: string | undefined;

    while (true) {
      const page = await this.client.prices.list({
        product: productId,
        currency: currency.toLowerCase(),
        active: true,
        limit: 100,
        ...(lastId ? { starting_after: lastId } : {}),
      });

      const match = page.data.find((p) => {
        const sameAmount = p.unit_amount === unitAmount;
        const sameType = isSubscription ? p.recurring?.interval === "month" : p.type === "one_time";

        return sameAmount && sameType;
      });

      if (match) {
        return match.id;
      }

      if (!page.has_more) {
        break;
      }

      lastId = page.data[page.data.length - 1].id;
    }

    const created = await this.client.prices.create({
      product: productId,
      unit_amount: unitAmount,
      currency: currency.toLowerCase(),
      ...(isSubscription ? { recurring: { interval: "month" } } : {}),
    });

    return created.id;
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

    const donateProduct = await this.donateProduct();

    return {
      id: subscription.id,
      status: subscription.status,
      renewsAt: new Date(item.current_period_end * 1000),
      product: {
        id: donateProduct.id,
        name: donateProduct.name,
      },
      price: {
        raw: price?.unit_amount ?? 0,
        formatted: formatValue((price?.unit_amount ?? 0) / 100, price?.currency ?? DEFAULT_CURRENCY),
        currency: price?.currency ?? DEFAULT_CURRENCY,
      },
    };
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

    const stripeCharge = await this.client.charges
      .list({ customer: payment.stripeCustomerId, limit: 1 })
      .then((list) => list?.data?.[0] ?? null)
      .catch(() => null);

    const stripeChargeId = stripeCharge?.id ?? null;
    const stripeSubscriptionId = isSubscription ? (sessionEvent?.subscription as string) : null;

    let stripePaymentIntentId: string | null = null;
    let stripeInvoiceUrl: string | null = null;

    if (isSubscription) {
      stripePaymentIntentId = await this.client.paymentIntents
        .list({ customer: payment.stripeCustomerId, limit: 1 })
        .then((list) => list?.data?.[0]?.id ?? null)
        .catch(() => null);

      stripeInvoiceUrl = await this.client.invoices
        .list({ customer: payment.stripeCustomerId, limit: 1 })
        .then((invoice) => invoice?.data?.[0]?.hosted_invoice_url ?? null)
        .catch(() => null);
    } else {
      stripePaymentIntentId = sessionEvent?.payment_intent as string;
      stripeInvoiceUrl = stripeCharge?.receipt_url ?? null;
    }

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

    const user = await this.databaseService.user.update({
      where: {
        id: payment.userId,
      },
      data: {
        accumulatedMoney: {
          increment: sessionEvent.metadata?.valueToEur ? Number(sessionEvent.metadata.valueToEur) : 0,
        },
      },
      select: {
        id: true,
        accumulatedMoney: true,
      },
    });

    const perkToGive = await this.perkService.perkToGive(user.accumulatedMoney, payment.user.tier);

    if (perkToGive) {
      await this.databaseService.user.update({
        where: {
          id: user.id,
        },
        data: {
          tier: perkToGive.name,
          tierStartedAt: new Date(),
        },
      });
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
        const userMedal = await this.databaseService.userMedal.create({
          data: {
            userId: payment.userId,
            medalId: contributorMedal.id,
          },
        });

        await this.queueService.toActivityJob({
          type: ActivityType.MedalEarned,
          userId: payment.userId,
          userMedalId: userMedal.id,
          metadata: { id: userMedal.id, medal: { ...contributorMedal } },
        });
      }
    }

    await this.queueService.toPaymentSuccessJob({
      paymentId: payment.id,
      paymentLink: `${this.configService.get<string>("WEB_URL")}/billing?paymentId=${payment.id}`,
      userName: payment.user!.name,
      userEmail: payment.user!.email,
      invoiceUrl: stripeInvoiceUrl ?? null,
      tier: perkToGive?.name ?? null,
      value: formatValue(payment.value / 100, payment.currency),
    });
  }

  async handleInvoicePaymentSucceededEvent(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;

    if (invoice.billing_reason === "subscription_create") {
      return;
    }

    if (invoice.status !== "paid") {
      return;
    }

    const user = await this.databaseService.user.findFirst({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!user) {
      return;
    }

    const subscriptions = await this.client.subscriptions.list({
      customer: invoice.customer as string,
      limit: 1,
    });

    const subscription = subscriptions?.data?.[0] ?? null;

    if (subscription?.status !== "active") {
      return;
    }

    const payment = await this.databaseService.payment.findFirst({
      where: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!payment) {
      return;
    }

    const stripeInvoiceUrl = invoice.hosted_invoice_url ?? null;
    const valueToEur = await this.convertCurrency(invoice.amount_paid, invoice.currency, DEFAULT_CURRENCY);

    const newPayment = await this.databaseService.payment.create({
      data: {
        name: payment.name,
        value: invoice.amount_paid,
        currency: invoice.currency,
        status: PaymentStatus.Succeeded,
        frequency: payment.frequency,
        stripeInvoiceUrl,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: invoice.customer as string,
        stripeProductId: payment.stripeProductId,
        userId: user.id,
      },
    });

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        accumulatedMoney: {
          increment: valueToEur.value,
        },
      },
    });

    await this.queueService.toPaymentSuccessJob({
      paymentId: newPayment.id,
      paymentLink: `${this.configService.get<string>("WEB_URL")}/billing?paymentId=${newPayment.id}`,
      userName: user.name,
      userEmail: user.email,
      invoiceUrl: stripeInvoiceUrl ?? null,
      value: formatValue(invoice.amount_paid / 100, invoice.currency),
    });
  }

  async handleInvoicePaymentFailedEvent(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;

    const user = await this.databaseService.user.findFirst({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!user) {
      return;
    }

    const subscriptions = await this.client.subscriptions.list({
      customer: invoice.customer as string,
      limit: 1,
    });

    const subscription = subscriptions?.data?.[0] ?? null;

    if (subscription?.status !== "active") {
      return;
    }

    const payment = await this.databaseService.payment.findFirst({
      where: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!payment) {
      return;
    }

    await this.databaseService.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.Failed },
    });

    await this.queueService.toPaymentFailedJob({
      userName: user.name,
      userEmail: user.email,
      value: formatValue(invoice.amount_due / 100, invoice.currency),
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

    const payment = await this.databaseService.payment.findFirst({
      where: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
      },
    });

    await this.queueService.toSubscriptionCancelledJob({
      userName: user.name,
      userEmail: user.email,
      value: formatValue(payment!.value / 100, payment!.currency),
    });
  }
}
