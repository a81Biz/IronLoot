import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DevelopmentOnlyGuard implements CanActivate {
  constructor(private configHelper: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const isProduction = this.configHelper.get<string>('NODE_ENV') === 'production';
    if (isProduction) {
      throw new ForbiddenException('This endpoint is not available in production');
    }
    return true;
  }
}
