import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminDualAuthGuard } from './guards/admin-dual-auth.guard';
import { DatabaseModule } from '../../database/database.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { KycModule } from '../kyc/kyc.module';
import { CfdiModule } from '../cfdi/cfdi.module';
import { RefundsModule } from '../refunds/refunds.module';
import { SeoModule } from '../seo/seo.module';
import { CmsModule } from '../cms/cms.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
    DatabaseModule,
    SystemConfigModule,
    CommissionsModule,
    KycModule,
    CfdiModule,
    RefundsModule,
    SeoModule,
    CmsModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, AdminJwtGuard, AdminDualAuthGuard],
})
export class AdminModule {}
