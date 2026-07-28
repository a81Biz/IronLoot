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
import { jwtSecret } from '../../common/config/jwt-secret';
import { expiracionJwt } from '../../common/config/jwt-expiry';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: jwtSecret(config),
        signOptions: {
          expiresIn: expiracionJwt(
            config.get<string>('JWT_ACCESS_EXPIRY', '15m'),
            'JWT_ACCESS_EXPIRY',
          ),
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
