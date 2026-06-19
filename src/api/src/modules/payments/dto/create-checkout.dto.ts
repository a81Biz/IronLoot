import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { PaymentProviderEnum } from '../interfaces';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Order ID to pay', example: 'uuid-string' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Amount to pay', example: 100 })
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: PaymentProviderEnum, description: 'Payment provider to use' })
  @IsEnum(PaymentProviderEnum)
  provider: PaymentProviderEnum;
}
