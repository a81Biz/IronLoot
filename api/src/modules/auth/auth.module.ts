import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies';
import { JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard, RecaptchaGuard } from './guards';
import { NotificationsModule } from '../notifications/notifications.module';
import { TwoFactorAuthService } from './two-factor-auth.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRY', '15m'),
        },
      }),
    }),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    OptionalJwtAuthGuard,
    RecaptchaGuard,
    TwoFactorAuthService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    OptionalJwtAuthGuard,
    RecaptchaGuard,
    JwtModule,
    PassportModule,
    TwoFactorAuthService,
  ],
})
export class AuthModule {}
