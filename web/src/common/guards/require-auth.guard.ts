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

    // We trust the middleware has already validated/decoded the token into request['user'].
    // If request['user'] is missing, it means no token or expired token.
    if (request['user']) {
        return true;
    }
    
    // Fallback check if middleware didn't run (shouldn't happen if configured correctly)
    // But good for safety: Check if token exists but user not set -> Token invalid/expired
    if (token && !request['user']) {
        // Token exists but middleware rejected it (e.g. expired)
        // Proceed to redirect
    }

    // SSR Redirect
    const originalUrl = request.originalUrl;
    response.redirect(`/login?return=${encodeURIComponent(originalUrl)}`);
    return false;
  }
}
