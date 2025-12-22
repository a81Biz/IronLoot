import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role, AuthenticatedUser } from '../decorators';
import { ForbiddenException } from '../../../common/observability';

/**
 * RolesGuard
 *
 * Checks if user has required roles for route
 * Must be used after JwtAuthGuard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // For now, we check based on user state
    // This can be expanded to check actual roles from database
    const userRoles: Role[] = [Role.USER];

    // Check if user is seller
    // Note: This would require fetching from DB or including in JWT
    // For now, we'll skip seller check here

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
