import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { KycModule } from '../kyc/kyc.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    AuthModule, // For guards
    KycModule, // PT-069 — gate KYC en enable-seller
    NotificationsModule, // PT-182 (H-030) — el reenvio de verificacion necesita enviar de verdad
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
