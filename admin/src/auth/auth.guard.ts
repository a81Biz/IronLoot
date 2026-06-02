import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    if (!req.session?.isAdmin) {
      res.redirect('/login');
      return false;
    }
    return true;
  }
}
