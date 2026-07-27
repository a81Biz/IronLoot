import { Module, forwardRef } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { DatabaseModule } from '../../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { KycModule } from '../kyc/kyc.module';
import { WithdrawalsService } from './withdrawals.service';
import { ManualPayoutProvider } from './payout/payout-provider';
import { AccountVerificationService } from './account-verification.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => PaymentsModule), KycModule],
  controllers: [WalletController],
  // PT-092 — AccountVerificationService cierra TD-003: sin verificar no se retira.
  providers: [
    WalletService,
    WithdrawalsService,
    ManualPayoutProvider, // PT-072
    AccountVerificationService,
  ],
  exports: [WalletService, WithdrawalsService, AccountVerificationService],
})
export class WalletModule {}
