import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DatabaseModule } from '../../database/database.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { KycModule } from '../kyc/kyc.module';
import { CfdiModule } from '../cfdi/cfdi.module';
import { RefundsModule } from '../refunds/refunds.module';
import { SeoModule } from '../seo/seo.module';
import { CmsModule } from '../cms/cms.module';

@Module({
  imports: [
    DatabaseModule,
    SystemConfigModule,
    CommissionsModule,
    KycModule,
    CfdiModule,
    RefundsModule,
    SeoModule,
    CmsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
