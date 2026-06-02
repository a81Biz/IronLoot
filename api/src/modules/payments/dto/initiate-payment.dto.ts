import { IsNumber, IsPositive, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentProviderEnum } from '../interfaces';

export class InitiatePaymentDto {
  @ApiProperty({ example: 100, description: 'Amount to deposit' })
  @IsNumber()
  @IsPositive()
  @Min(10)
  amount: number;

  @ApiProperty({ enum: PaymentProviderEnum, description: 'Payment provider' })
  @IsEnum(PaymentProviderEnum)
  provider: PaymentProviderEnum;
}
