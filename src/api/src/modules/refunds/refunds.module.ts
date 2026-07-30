import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { WalletModule } from '../wallet/wallet.module';

// PT-191 (AUD-010) — `WalletModule` entra porque el reembolso ya no mueve el saldo por su cuenta:
// delega en `WalletService.reversarVenta()`, que es donde viven el cerrojo de fila (RULE-24) y la
// creación perezosa atómica del monedero (RULE-22).
@Module({
  imports: [WalletModule],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
