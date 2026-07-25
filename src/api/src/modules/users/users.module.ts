import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    AuthModule, // For guards
    KycModule, // PT-069 — gate KYC en enable-seller
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
