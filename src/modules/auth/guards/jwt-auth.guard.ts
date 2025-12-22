import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators';
import {
  UnauthorizedException,
  RequestContextService,
} from '../../../common/observability';

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

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }

    // Set user in RequestContext
    this.ctx.setUser(user.id, user.state);

    return user;
  }
}
