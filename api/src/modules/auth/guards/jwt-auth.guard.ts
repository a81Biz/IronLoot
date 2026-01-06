import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators';
import { UnauthorizedException, RequestContextService } from '@common/observability';

/**
 * JwtAuthGuard
 *
 * Global guard that:
 * - Allows public routes (marked with @Public())
 * - Validates JWT for protected routes
 * - Sets user in RequestContext after authentication
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly ctx: RequestContextService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Validate JWT
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any, _context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }

    // Set user in RequestContext
    this.ctx.setUser(user.id, user.state);

    return user;
  }
}

/**
 * Optional JWT authentication guard.
 * Attempts to authenticate the request but doesn't fail if no token is present.
 * If token is present and valid, populates req.user.
 * If token is missing or invalid, continues without authentication.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    _info: any,
    _context: ExecutionContext,
  ): TUser | null {
    // If there's an error or no user, just return null (no authentication)
    // Don't throw - this makes auth optional
    if (err || !user) {
      return null as any;
    }
    return user;
  }

  // Override canActivate to not throw on missing token
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Try to authenticate
      await super.canActivate(context);
    } catch {
      // Ignore errors - authentication is optional
    }
    return true; // Always allow the request to proceed
  }
}
