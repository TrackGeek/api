import { Injectable } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { PaymentFrequency, PaymentStatus } from "@prisma/generated/enums";
import { GetPaymentsDto } from "../dto/get-payments.dto";
import { PaymentFindManyArgs } from "@prisma/generated/models";
import { CreatePaymentDto } from "../dto/create-payment.dto";
import { getUserCurrency } from '@/shared/utils/currency';
import { DEFAULT_CURRENCY } from '@/shared/constants/payment';

@Injectable()
export class PaymentService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async createPayment(dto: CreatePaymentDto) {
    const { userId, frequency, value, clientIp } = dto;

    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }
    
    const paymentAlreadyExists = await this.databaseService.payment.findFirst({
      where: {
        value,
        userId,
        status: PaymentStatus.Pending,
        frequency,
        expiredAt: {
          gt: new Date(),
        },
      },
      select: {
        stripeCheckoutSessionId: true,
        stripeCheckoutSessionUrl: true,
      }
    });

    if (paymentAlreadyExists) {
      return {
        id: paymentAlreadyExists.stripeCheckoutSessionId,
        url: paymentAlreadyExists.stripeCheckoutSessionUrl,
      };
    }
    
    let stripeCustomerId = user?.stripeCustomerId ?? null;
    
    if (!stripeCustomerId) {
      stripeCustomerId = await this.stripeService.getCustomerId(user.name, user.email);

      await this.databaseService.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }
    
    const isSubscription = frequency === PaymentFrequency.Monthly;
    
    const currentSubscription = await this.stripeService.getCurrentSubscription(userId);
    
    if (isSubscription && currentSubscription && currentSubscription.status === "active") {
      throw new AppException(ERROR_CODES.ACTIVE_SUBSCRIPTION_EXISTS);
    }
    
    const donateProduct = await this.stripeService.donateProduct();
    
    const currency = await getUserCurrency(clientIp);

    const expiredAt = new Date();

    expiredAt.setHours(expiredAt.getHours() + 1);
    
    const priceId = await this.stripeService.getOrCreatePrice(donateProduct.id, value, currency, isSubscription);
    
    const valueToEur = await this.stripeService.convertCurrency(value, currency, DEFAULT_CURRENCY);

    const session = await this.stripeService.client.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      customer: stripeCustomerId,
      success_url: `${this.configService.get<string>("WEB_URL")}/donate/success?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get<string>("WEB_URL")}/donate/error`,
      metadata: { userId: user.id, valueToEur: valueToEur.value },
      expires_at: Math.floor(expiredAt.getTime() / 1000),
      line_items: [{ quantity: 1, price: priceId }],
    });

    await this.databaseService.payment.create({
      data: {
        name: donateProduct?.name!,
        value,
        currency,
        status: PaymentStatus.Pending,
        frequency: dto.frequency ?? PaymentFrequency.OneTime,
        stripeCheckoutSessionUrl: session.url!,
        stripeCheckoutSessionId: session.id,
        stripeCustomerId,
        stripeProductId: donateProduct?.id!,
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

  async getPaymentById(id: string) {
    const payment = await this.databaseService.payment.findFirst({
      where: {
        id,
      },
    });

    if (!payment) {
      throw new AppException(ERROR_CODES.PAYMENT_NOT_FOUND);
    }

    return payment;
  }
}
