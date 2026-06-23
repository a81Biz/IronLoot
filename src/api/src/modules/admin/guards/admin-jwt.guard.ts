import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Admin JWT required');
    }

    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        role: string;
        type: string;
        username: string;
      }>(token, { secret: this.config.get<string>('JWT_SECRET') });

      if (payload.role !== 'admin' || payload.type !== 'admin-session') {
        throw new ForbiddenException('Admin role required');
      }

      req.adminUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired admin token');
    }
  }
}
