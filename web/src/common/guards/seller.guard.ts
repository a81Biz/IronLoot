import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SellerGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user exists and is a seller
    // user.isSeller should be present in the token claims
    if (user && user.isSeller === true) {
      return true;
    }

    // If not seller, redirect or throw forbidden
    // Since this is for server-rendered pages, we might want to redirect.
    // However, NestJS Guards typically return boolean.
    // If we return false, it throws 403 Forbidden.
    // We can handle the redirect in an Exception Filter OR manual check in controller.
    // But to be secure and "Guard", returning false is correct. 
    // The user will see a 403 error page (or generic error).
    // Ideally we'd redirect to dashboard, but 403 is secure.
    return false;
  }
}
