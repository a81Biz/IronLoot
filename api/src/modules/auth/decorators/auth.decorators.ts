import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserState } from '@prisma/client';

/**
 * Key for public routes metadata
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() - Mark route as public (no authentication required)
 *
 * Usage:
 * @Public()
 * @Get('status')
 * getStatus() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  username: string;
  state: UserState;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated user interface (attached to request)
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  state: UserState;
}

/**
 * @CurrentUser() - Get current authenticated user from request
 *
 * Usage:
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 * @Get('profile')
 * getProfile(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

/**
 * Key for roles metadata
 */
export const ROLES_KEY = 'roles';

/**
 * User roles
 */
export enum Role {
  USER = 'user',
  SELLER = 'seller',
  ADMIN = 'admin',
}

/**
 * @Roles() - Require specific roles for route
 *
 * Usage:
 * @Roles(Role.SELLER)
 * @Post('auctions')
 * createAuction() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
