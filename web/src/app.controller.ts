import { Controller, Get, Render, UseGuards, Req, Res, Param, ParseUUIDPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { RequireAuth } from './common/guards/require-auth.guard';
import { SellerGuard } from './common/guards/seller.guard';



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

  @Get('auth/verify-email-pending')
  @Render('pages/auth/verify-email-pending')
  verifyEmailPending() {
    return { title: 'Verificación Pendiente' };
  }

  @Get('dashboard')
  @UseGuards(RequireAuth)
  @Render('pages/dashboard')
  dashboard() {
    return { title: 'Dashboard' };
  }

  @Get('wallet')
  @UseGuards(RequireAuth)
  @Render('pages/wallet')
  wallet() {
    return { title: 'Mi Billetera' };
  }

  @Get('wallet/deposit')
  @UseGuards(RequireAuth)
  @Render('pages/wallet/deposit')
  walletDeposit() {
    return { title: 'Depositar Fondos' };
  }

  @Get('wallet/withdraw')
  @UseGuards(RequireAuth)
  @Render('pages/wallet/withdraw')
  walletWithdraw() {
    return { title: 'Retirar Fondos' };
  }

  @Get('wallet/history')
  @UseGuards(RequireAuth)
  @Render('pages/wallet/history')
  walletHistory() {
    return { title: 'Historial de Transacciones' };
  }

  @Get('profile')
  @UseGuards(RequireAuth)
  @Render('pages/profile')
  profile() {
    return { title: 'Mi Perfil' };
  }

  @Get('my-bids')
  @UseGuards(RequireAuth)
  @Render('pages/bids/my')
  myBids() {
    return { title: 'Mis Pujas' };
  }

  @Get('orders/:id')
  @UseGuards(RequireAuth)
  @Render('pages/orders/detail')
  orderDetail(@Param('id', ParseUUIDPipe) id: string) {
    return { title: 'Detalle de Orden' };
  }

  @Get('orders')
  @UseGuards(RequireAuth)
  @Render('pages/orders/list')
  ordersList() {
    return { title: 'Mis Órdenes' };
  }

  @Get('dashboard/auctions')
  @UseGuards(RequireAuth)
  dashboardAuctions(@Req() req, @Res() res) {
    const user = req.user;
    if (user && user.isSeller) {
        return res.redirect('/seller/auctions');
    }
    return res.render('pages/dashboard/auctions-gate', { title: 'Gestión de Subastas' });
  }

  @Get('seller/auctions')
  @UseGuards(RequireAuth, SellerGuard)
  sellerAuctions(@Req() req, @Res() res) {
    const user = req.user;
    if (!user || !user.isSeller) {
       return res.redirect('/dashboard/auctions');
    }
    return res.render('pages/seller/auctions', { title: 'Mis Subastas' });
  }

  @Get('seller/orders')
  @UseGuards(RequireAuth, SellerGuard)
  @Render('pages/seller/orders')
  sellerOrders() {
    return { title: 'Gestión de Envíos' };
  }

  @Get('seller/onboarding')
  @UseGuards(RequireAuth)
  @Render('pages/seller/onboarding')
  sellerOnboarding() {
    return { title: 'Actívate como Vendedor' };
  }

  @Get('auction/create')
  @UseGuards(RequireAuth, SellerGuard)
  @Render('pages/auction/create')
  createAuction() {
    return { title: 'Crear Subasta' };
  }

  @Get('notifications')
  @UseGuards(RequireAuth)
  @Render('pages/notifications/list')
  notifications() {
    return { title: 'Notificaciones' };
  }

  @Get('disputes')
  @UseGuards(RequireAuth)
  @Render('pages/disputes/list')
  disputesList() {
    return { title: 'Disputas' };
  }

  @Get('disputes/new')
  @UseGuards(RequireAuth)
  @Render('pages/disputes/create')
  createDispute() {
    return { title: 'Nueva Disputa' };
  }

  @Get('disputes/:id')
  @UseGuards(RequireAuth)
  @Render('pages/disputes/detail')
  disputeDetail(@Param('id', ParseUUIDPipe) id: string) {
    return { title: 'Detalle de Disputa' };
  }

  @Get('about')
  @Render('pages/static/about')
  about() {
    return { title: 'Sobre Nosotros' };
  }

  @Get('terms')
  @Render('pages/static/terms')
  terms() {
    return { title: 'Términos y Condiciones' };
  }

  @Get('privacy')
  @Render('pages/static/privacy')
  privacy() {
    return { title: 'Política de Privacidad' };
  }

  @Get('auctions')
  @Render('pages/auctions/list')
  auctions(@Req() req) {
    const layout = req.user ? 'layouts/main.html' : 'layouts/public.html';
    return { 
      title: 'Subastas Activas',
      layout 
    };
  }

  @Get('auctions/:id')
  @Render('pages/auctions/detail')
  auctionDetail(@Param('id', ParseUUIDPipe) id: string) {
    return { title: 'Detalle de Subasta' };
  }

  @Get('won-auctions')
  @UseGuards(RequireAuth)
  @Render('pages/won-auctions')
  wonAuctions() {
    return { title: 'Subastas Ganadas' };
  }

  @Get('watchlist')
  @UseGuards(RequireAuth)
  @Render('pages/watchlist')
  watchlist() {
    return { title: 'Mi Watchlist' };
  }

  @Get('payments')
  @UseGuards(RequireAuth)
  @Render('pages/payments')
  payments() {
    return { title: 'Mis Pagos' };
  }

  @Get('reputation')
  @UseGuards(RequireAuth)
  @Render('pages/reputation')
  reputation() {
    return { title: 'Mi Reputación' };
  }

  @Get('settings')
  @UseGuards(RequireAuth)
  @Render('pages/settings')
  settings() {
    return { title: 'Configuración' };
  }
}
