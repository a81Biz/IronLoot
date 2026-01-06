import { IsNumber, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({ example: 100.0, description: 'Amount to deposit' })
  @IsNumber()
  @IsPositive()
  @Min(5) // Minimum deposit amount
  amount: number;

  @ApiProperty({ example: 'payment_123', description: 'External payment reference' })
  @IsString()
  referenceId: string;
}

export class WithdrawDto {
  @ApiProperty({ example: 50.0, description: 'Amount to withdraw' })
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'bank_account_123', description: 'Destination reference' })
  @IsString()
  referenceId: string;
}
