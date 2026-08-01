import { IsNumber, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({ example: 100.0, description: 'Amount to deposit' })
  @IsNumber()
  @IsPositive()
  @Min(10) // Minimum deposit amount
  amount: number;

  @ApiProperty({ example: 'payment_123', description: 'External payment reference' })
  @IsString()
  referenceId: string;
}

export class WithdrawDto {
  @ApiProperty({ example: 50.0, description: 'Amount to withdraw' })
  @IsNumber()
  @IsPositive()
  @Min(10)
  amount: number;

  @ApiProperty({ example: 'bank_account_123', description: 'Destination reference' })
  @IsString()
  referenceId: string;
}

export class WalletBalanceDto {
  @ApiProperty()
  available: number;

  @ApiProperty()
  held: number;

  @ApiProperty({ description: 'PT-071 — ventas sin liquidar (holdback)' })
  pending: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  isActive: boolean;
}

export class TransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  referenceId: string;
}

export class TransactionHistoryDto {
  @ApiProperty({ type: [TransactionDto] })
  transactions: TransactionDto[];

  /**
   * PT-229 (H-UI-044) — El total, la pagina y el tamaño.
   *
   * Sin `total`, la interfaz no puede dibujar paginacion sin adivinar: es lo que llevo al catalogo a
   * la heuristica `length >= 12` de H-UI-043, que fallaba porque el tamaño real de pagina era 10.
   * Opcionales para no romper a un consumidor que solo lea `transactions`.
   */
  @ApiProperty({ required: false })
  total?: number;

  @ApiProperty({ required: false })
  page?: number;

  @ApiProperty({ required: false })
  limit?: number;
}
