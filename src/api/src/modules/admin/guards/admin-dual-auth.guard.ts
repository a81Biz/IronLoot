import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Accepts either:
 *  1. Authorization: Bearer <admin JWT with role=admin, type=admin-session>
 *  2. x-admin-key: <ADMIN_API_KEY> (legacy — for transition period while module services migrate)
 *
 * JWT is preferred. API key fallback is retained until all admin SSR module services
 * are updated to send Bearer tokens (Phase 2).
 */
@Injectable()
export class AdminDualAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      return this.validateJwt(req, authHeader.slice(7));
    }

    return this.validateApiKey(req);
  }

  private validateJwt(req: any, token: string): boolean {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        role: string;
        type: string;
        username: string;
      }>(token, { secret: this.config.get<string>('JWT_SECRET') });

      if (payload.role !== 'admin' || payload.type !== 'admin-session') {
        throw new UnauthorizedException('Admin role required');
      }

      req.adminUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid admin token');
    }
  }

  private validateApiKey(req: any): boolean {
    const key = req.headers['x-admin-key'] as string | undefined;
    const expected = this.config.get<string>('ADMIN_API_KEY', 'dev-admin-key');

    if (!key || key !== expected) {
      throw new UnauthorizedException('Valid admin JWT or API key required');
    }
    return true;
  }
}
