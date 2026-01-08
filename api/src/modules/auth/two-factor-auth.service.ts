import { Injectable, BadRequestException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwoFactorAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateSecret(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const appName = this.configService.get('APP_NAME') || 'Iron Loot';

    // keyuri(account, issuer, secret)
    const otpauthUrl = authenticator.keyuri(email, appName, secret);

    // Save secret to user record (but 2FA remains disabled until verified)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    // Generate QR Code Data URL
    const qrCodeUrl = await toDataURL(otpauthUrl);

    return { secret, qrCodeUrl };
  }

  async verifyAndEnable(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA initialization not started');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (isValid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isTwoFactorEnabled: true },
      });
      return true;
    }

    return false;
  }

  async disable(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not enabled');
    }

    // Require current token to disable
    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (isValid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isTwoFactorEnabled: false, twoFactorSecret: null },
      });
      return true;
    }
    return false;
  }

  async validateToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) return false;

    return authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });
  }
}
