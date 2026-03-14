import { ClientIpType } from '@/shared/decorators/client-ip.decorator';
import { PaymentFrequency } from '@prisma/generated/enums';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreatePerkPaymentDto {
  @IsString()
  @IsNotEmpty()
  readonly productId: string;
  
  @IsString()
  @IsNotEmpty()
  readonly priceId: string;
  
  @IsEnum(PaymentFrequency)
  readonly frequency: PaymentFrequency;
  
  readonly userId: string;
  
  readonly clientIp: ClientIpType;
}
