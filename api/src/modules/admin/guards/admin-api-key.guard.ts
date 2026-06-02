import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-admin-key'];
    const expected = this.configService.get<string>('ADMIN_API_KEY', 'dev-admin-key');

    if (!key || key !== expected) {
      throw new UnauthorizedException('Invalid admin API key');
    }
    return true;
  }
}
