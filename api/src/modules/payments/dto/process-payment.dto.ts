import { IsNumber, IsString, IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentProviderEnum } from '../interfaces';

export class ProcessPaymentDto {
  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Card token', required: false })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiProperty({ description: 'Payment method ID (e.g., master)' })
  @IsString()
  payment_method_id: string;

  @ApiProperty({ description: 'Number of installments' })
  @IsNumber()
  installments: number;

  @ApiProperty({ description: 'Payer information' })
  @IsObject()
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };

  @ApiProperty({ enum: PaymentProviderEnum, description: 'Payment provider' })
  @IsEnum(PaymentProviderEnum)
  provider: PaymentProviderEnum;

  @ApiProperty({ required: false, description: 'Issuer ID' })
  @IsOptional()
  @IsString()
  issuer_id?: string;

  @ApiProperty({ required: false, description: 'Payment description' })
  @IsOptional()
  @IsString()
  description?: string;
}
