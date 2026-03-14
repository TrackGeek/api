import { Injectable } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { CreatePerkPaymentDto } from '../dto/create-perk-payment.dto';
import { DatabaseService } from '@/shared/infra/database/database.service';
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { PaymentFrequency, PaymentStatus } from '@prisma/generated/enums';
import { CreateDonatePaymentDto } from '../dto/create-donate-payment.dto';
import { GetPaymentsDto } from '../dto/get-payments.dto';
import { PaymentFindManyArgs } from '@prisma/generated/models';
import { getUserCurrency } from '@/shared/utils/currency';

@Injectable()
export class PaymentService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
  ) {}
  
  async createDonatePayment(createDonatePaymentDto: CreateDonatePaymentDto) {
    const { clientIp, productId, userId, value } = createDonatePaymentDto
    
    const currency = await getUserCurrency(clientIp);
    
    const user = await this.databaseService.user.findUnique({
      where: {
        id: userId, 
      },
    });
    
    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND)
    }
    
    const product = await this.stripeService.client.products.retrieve(productId);
    
    if (!product) {
      throw new AppException(ERROR_CODES.STRIPE_PRODUCT_NOT_FOUND)
    }
    
    const customerId = await this.stripeService.getCustomerId(user.name, user.email);
    
    const expiredAt = new Date();
    
    expiredAt.setMinutes(expiredAt.getMinutes() + 30);
    
    const session = await this.stripeService.client.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      success_url: `${this.configService.get<string>('WEB_URL')}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get<string>('WEB_URL')}/donate/error`,
      metadata: { userId: user.id },
      expires_at: Math.floor(expiredAt.getTime() / 1000),
      line_items: [{ price_data: {
        currency,
        product: productId,
        unit_amount: value,
      }, quantity: 1 }],
    });
    
    await this.databaseService.payment.create({
      data: {
        name: product.name,
        value,
        currency,
        status: PaymentStatus.Pending,
        frequency: PaymentFrequency.OneTime,
        checkoutSessionId: session.id,
        customerId,
        productId,
        userId,
        expiredAt,
      },
    });
    
    return {
      id: session.id,
      url: session.url
    }
  }
  
  async createPerkPayment(createPerkPaymentDto: CreatePerkPaymentDto) {
    const { frequency, productId, priceId, userId, clientIp } = createPerkPaymentDto
    
    const isSubscription = frequency === PaymentFrequency.Monthly
    const currency = await getUserCurrency(clientIp);
    
    const user = await this.databaseService.user.findUnique({
      where: {
        id: userId, 
      },
    });
    
    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND)
    }
    
    const product = await this.stripeService.client.products.retrieve(productId);
    
    if (!product) {
      throw new AppException(ERROR_CODES.STRIPE_PRODUCT_NOT_FOUND)
    }
    
    const price = await this.stripeService.client.prices.retrieve(priceId);
    
    if (!price) {
      throw new AppException(ERROR_CODES.STRIPE_PRICE_NOT_FOUND)
    }
    
    const paymentAlreadyExists = await this.databaseService.payment.findFirst({
      where: {
        userId,
        productId,
        status: PaymentStatus.Pending,
      },
    });
    
    if (paymentAlreadyExists && paymentAlreadyExists.expiredAt > new Date()) {
      const session = await this.stripeService.client.checkout.sessions.retrieve(paymentAlreadyExists.checkoutSessionId);
      
      return {
        id: session.id,
        url: session.url,
      }
    }
    
    const customerId = await this.stripeService.getCustomerId(user.name, user.email);
    
    const expiredAt = new Date();
    
    expiredAt.setHours(expiredAt.getHours() + 1);
    
    const session = await this.stripeService.client.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      customer: customerId,
      success_url: `${this.configService.get<string>('WEB_URL')}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get<string>('WEB_URL')}/donate/error`,
      metadata: { userId: user.id },
      expires_at: Math.floor(expiredAt.getTime() / 1000),
      line_items: [{ price: priceId, quantity: 1 }],
    });
    
    await this.databaseService.payment.create({
      data: {
        name: product.name,
        value: price.unit_amount!,
        currency,
        status: PaymentStatus.Pending,
        frequency,
        checkoutSessionId: session.id,
        customerId,
        productId,
        userId,
        expiredAt,
      },
    });
    
    return {
      id: session.id,
      url: session.url
    }
  }
  
  async getPayments(getPaymentsDto: GetPaymentsDto) {
    const payments = await this.databaseService.offsetPagination<PaymentFindManyArgs>({
      model: "payment",
      itemsPerPage: getPaymentsDto.itemsPerPage,
      page: getPaymentsDto.page,
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
}