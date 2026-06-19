import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecaptchaGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isEnabled = this.configService.get<boolean>('RECAPTCHA_ENABLED', false);
    if (!isEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-recaptcha-token'] || request.body.recaptchaToken;

    if (!token) {
      throw new ForbiddenException('CAPTCHA token required');
    }

    // TODO: Verify token with Google API or use nestjs-recaptcha
    // const secret = this.configService.get('RECAPTCHA_SECRET');
    // const verification = await axios.post(...)

    return true; // Mock success for now
  }
}
