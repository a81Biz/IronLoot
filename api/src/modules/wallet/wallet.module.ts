import { Module, forwardRef } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { DatabaseModule } from '../../database/database.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => PaymentsModule)],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
