import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Response, Request } from 'express';
import * as jwt from 'jsonwebtoken';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

@Injectable()
export class ClientAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const token = req.cookies?.['access_token'];
    if (!token) {
      res.redirect(`${BASE_URL}/auth/login`);
      return false;
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
      (req as any).user = payload;
      return true;
    } catch {
      res.clearCookie('access_token');
      res.redirect(`${BASE_URL}/auth/login`);
      return false;
    }
  }
}
