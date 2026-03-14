import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PaymentService } from "../service/payment.service";
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CreatePerkPaymentDto } from '../dto/create-perk-payment.dto';
import { ClientIp, type ClientIpType } from '@/shared/decorators/client-ip.decorator';
import { CreateDonatePaymentDto } from '../dto/create-donate-payment.dto';
import { GetPaymentsDto } from '../dto/get-payments.dto';

@ApiTags("Payment")
@Controller("/payment")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}
  
  @ApiBearerAuth()
  @Get("/user")
  @UseGuards(AuthGuard)
  async getPayments(
    @Session() session: UserSession,
    @Query() query: GetPaymentsDto
  ) {
    const payments = await this.paymentService.getPayments({
      ...query,
      userId: session.user.id,
    });

    return { payments };
  }
  
  @ApiBearerAuth()
  @Post("/perk")
  @UseGuards(AuthGuard)
  async createPerkPayment(
    @Session() session: UserSession,
    @Body() createPerkPaymentDto: CreatePerkPaymentDto,
    @ClientIp() clientIp: ClientIpType
  ) {
    const payment = await this.paymentService.createPerkPayment({
      ...createPerkPaymentDto,
      userId: session.user.id,
      clientIp,
    });
    
    return { payment }
  }
  
  @ApiBearerAuth()
  @Post("/donate")
  @UseGuards(AuthGuard)
  async createDonatePayment(
    @Session() session: UserSession,
    @Body() createDonatePaymentDto: CreateDonatePaymentDto,
    @ClientIp() clientIp: ClientIpType
  ) {
    const payment = await this.paymentService.createDonatePayment({
      ...createDonatePaymentDto,
      userId: session.user.id,
      clientIp,
    });
    
    return { payment }
  }
}
