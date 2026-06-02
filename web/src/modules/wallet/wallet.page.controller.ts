import { Controller, Get, Render, UseGuards } from '@nestjs/common';
import { RequireAuth } from '../../common/guards/require-auth.guard';

@Controller('wallet')
@UseGuards(RequireAuth)
export class WalletPageController {
  @Get()
  @Render('pages/wallet')
  wallet() {
    return { title: 'Mi Billetera' };
  }

  @Get('deposit')
  @Render('pages/wallet/deposit')
  walletDeposit() {
    return {
      title: 'Depositar Fondos',
      mpPublicKey: process.env.MERCADO_PAGO_PUBLIC_KEY,
    };
  }

  @Get('withdraw')
  @Render('pages/wallet/withdraw')
  walletWithdraw() {
    return { title: 'Retirar Fondos' };
  }

  @Get('history')
  @Render('pages/wallet/history')
  walletHistory() {
    return { title: 'Historial de Transacciones' };
  }
}
