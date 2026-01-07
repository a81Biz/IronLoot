import { Controller, Get, Render, Param } from '@nestjs/common';

@Controller()
export class AppController {
  
  @Get()
  @Render('pages/home.html')
  home() {
    return { title: 'Iron Loot - Home' };
  }

  @Get('login')
  @Render('pages/auth/login.html')
  login() {
    return { title: 'Login' };
  }

  @Get('register')
  @Render('pages/auth/register.html')
  register() {
    return { title: 'Register' };
  }

  @Get('recovery')
  @Render('pages/auth/recovery.html')
  recovery() {
    return { title: 'Recover Password' };
  }

  @Get('auth/verify-email')
  @Render('pages/auth/verify-email.html')
  verifyEmail() {
    return { title: 'Verifying Email' };
  }

  @Get('auth/reset-password')
  @Render('pages/auth/reset-password.html')
  resetPassword() {
    return { title: 'Reset Password' };
  }

  @Get('dashboard')
  @Render('pages/dashboard.html')
  dashboard() {
    return { title: 'Dashboard' };
  }

  @Get('wallet')
  @Render('pages/wallet.html')
  wallet() {
    return { title: 'My Wallet' };
  }

  @Get('auctions')
  @Render('pages/auctions/list.html')
  auctions() {
    return { title: 'Auctions' };
  }

  @Get('auctions/:id')
  @Render('pages/auctions/detail.html')
  auctionDetail(@Param('id') id: string) {
    return { title: 'Auction Detail', id };
  }
}
