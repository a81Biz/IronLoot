import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { KycModule } from './modules/kyc/kyc.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { CfdiModule } from './modules/cfdi/cfdi.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { SeoModule } from './modules/seo/seo.module';
import { CmsModule } from './modules/cms/cms.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { LotsModule } from './modules/lots/lots.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { UsersModule } from './modules/users/users.module';
import { AuctionsAdminModule } from './modules/auctions/auctions.module';

@Module({
  imports: [
    SharedModule,
    AuditModule,
    ReportsModule,
    NotificationsModule,
    KycModule,
    ModerationModule,
    CfdiModule,
    OrdersModule,
    PaymentsModule,
    ReconciliationModule,
    SeoModule,
    CmsModule,
    RefundsModule,
    DisputesModule,
    LotsModule,
    CommissionsModule,
    ConfigurationModule,
    UsersModule,
    AuctionsAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
