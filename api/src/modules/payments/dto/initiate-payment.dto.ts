import { IsNumber, IsPositive, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({ example: 100, description: 'Amount to deposit' })
  @IsNumber()
  @IsPositive()
  @Min(10)
  amount: number;

  @ApiProperty({ enum: ['MERCADO_PAGO', 'PAYPAL', 'STRIPE'], description: 'Payment provider' })
  @IsEnum(['MERCADO_PAGO', 'PAYPAL', 'STRIPE'])
  provider: string;
}
