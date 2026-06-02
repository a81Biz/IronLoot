import { Controller, Get, Render } from '@nestjs/common';

@Controller('auth')
export class AuthPageController {
  @Get('login')
  @Render('pages/auth/login')
  login() {
    return { title: 'Login' };
  }

  @Get('register')
  @Render('pages/auth/register')
  register() {
    return { title: 'Register' };
  }

  @Get('verify-email')
  @Render('pages/auth/verify-email')
  verifyEmail() {
    return { title: 'Verifying Email' };
  }

  @Get('verify-email-pending')
  @Render('pages/auth/verify-email-pending')
  verifyEmailPending() {
    return { title: 'Verificación Pendiente' };
  }
}
