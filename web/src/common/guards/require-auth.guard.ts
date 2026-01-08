import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class RequireAuth implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Single source of truth: access_token cookie
    const token = request.cookies['access_token'] || request.headers['authorization'];

    if (token) {
      return true;
    }

    // SSR Redirect
    const originalUrl = request.originalUrl;
    response.redirect(`/login?return=${encodeURIComponent(originalUrl)}`);
    return false;
  }
}
