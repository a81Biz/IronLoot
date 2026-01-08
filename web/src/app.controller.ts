import { Controller, Get, Render } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('pages/home') // Assuming home.html exists
  root() {
    return { message: 'Welcome to Iron Loot' };
  }

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

  @Get('auth/verify-email')
  @Render('pages/auth/verify-email') // Assuming this view exists or we create a generic one
  verifyEmail() {
    return { title: 'Verifying Email' };
  }

  @Get('dashboard')
  @Render('pages/dashboard')
  dashboard() {
    return { title: 'Dashboard' };
  }

  @Get('wallet')
  @Render('pages/wallet')
  wallet() {
    return { title: 'Mi Billetera' };
  }
}
