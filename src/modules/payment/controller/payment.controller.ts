import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ClientIp, type ClientIpType } from "@/shared/decorators/client-ip.decorator";
import { CreatePaymentDto } from "../dto/create-payment.dto";
import { GetPaymentsDto } from "../dto/get-payments.dto";
import { PaymentService } from "../service/payment.service";

@ApiTags("Payment")
@Controller("/payment")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiBearerAuth()
  @Post("/")
  @UseGuards(AuthGuard)
  async createPayment(
    @Session() session: UserSession,
    @Body() createPaymentDto: CreatePaymentDto,
    @ClientIp() clientIp: ClientIpType,
  ) {
    const payment = await this.paymentService.createPayment({
      ...createPaymentDto,
      userId: session.user.id,
      clientIp,
    });

    return { payment };
  }

  @ApiBearerAuth()
  @Get("/")
  @UseGuards(AuthGuard)
  async getPayments(@Session() session: UserSession, @Query() query: GetPaymentsDto) {
    const payments = await this.paymentService.getPayments({
      ...query,
      userId: session.user.id,
    });

    return { payments };
  }

  @Get("/detail/:paymentId")
  async getPaymentDetail(@Param("paymentId") paymentId: string) {
    const payment = await this.paymentService.getPaymentById(paymentId);

    return { payment };
  }
}
