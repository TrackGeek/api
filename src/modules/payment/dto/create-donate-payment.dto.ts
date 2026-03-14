import { ClientIpType } from '@/shared/decorators/client-ip.decorator';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, Max, Min } from 'class-validator';

export class CreateDonatePaymentDto {
  @IsString()
  @IsNotEmpty()
  readonly productId: string;
    
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(1000000)
  readonly value: number;
  
  readonly userId: string;
  
  readonly clientIp: ClientIpType;
}
