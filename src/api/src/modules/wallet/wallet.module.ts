import { Module, forwardRef } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { DatabaseModule } from '../../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { KycModule } from '../kyc/kyc.module';
import { WithdrawalsService } from './withdrawals.service';
import { ManualPayoutProvider } from './payout/payout-provider';

@Module({
  imports: [DatabaseModule, forwardRef(() => PaymentsModule), KycModule],
  controllers: [WalletController],
  providers: [WalletService, WithdrawalsService, ManualPayoutProvider], // PT-072
  exports: [WalletService, WithdrawalsService],
})
export class WalletModule {}
