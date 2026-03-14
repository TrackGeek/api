import type { ClientIpType } from '@/shared/decorators/client-ip.decorator';
import { formatValue, getUserCurrency } from '@/shared/utils/currency';
import { toCamelCase } from '@/shared/utils/string';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentFrequency } from '@prisma/generated/enums';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const token = this.configService.get<string>('STRIPE_SECRET_KEY') as string;
    const apiVersion = '2026-02-25.clover';
    
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
    
    return customerId
  }
  
  private 
  
  async getProducts(clientIp: ClientIpType) {
    const currency = await getUserCurrency(clientIp);

    const prices = await this.client.prices.list({
      currency,
      active: true,
      expand: ['data.product'],
    });

    const productsMap = new Map<string, any>();

    for (const price of prices.data) {
      const product = price.product as Stripe.Product;

      if (!productsMap.has(product.id)) {
        productsMap.set(product.id, {
          id: product.id,
          title: product.name,
          name: toCamelCase(product.name),
          description: product.description,
          imageUrl: product.images?.[0] ?? null,
          prices: [],
        });
      }

      productsMap.get(product.id).prices.push({
        id: price.id,
        frequency: price.recurring ? PaymentFrequency.Monthly : PaymentFrequency.OneTime,
        value: {
          raw: price.unit_amount!,
          formatted: formatValue(price.unit_amount!, price.currency),
        },
      });
    }

    return Array.from(productsMap.values())
      .sort((a, b) => a.prices[0].value.raw - b.prices[0].value.raw);
  }
}