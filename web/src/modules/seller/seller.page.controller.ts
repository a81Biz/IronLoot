import { Controller, Get, Render, UseGuards, Req, Res } from '@nestjs/common';
import { RequireAuth } from '../../common/guards/require-auth.guard';
import { SellerGuard } from '../../common/guards/seller.guard';

@Controller('seller')
@UseGuards(RequireAuth)
export class SellerPageController {
  @Get('auctions')
  @UseGuards(SellerGuard)
  sellerAuctions(@Req() req, @Res() res) {
    const user = req.user;
    if (!user || !user.isSeller) {
      return res.redirect('/dashboard/auctions');
    }
    return res.render('pages/seller/auctions', { title: 'Mis Subastas' });
  }

  @Get('orders')
  @UseGuards(SellerGuard)
  @Render('pages/seller/orders')
  sellerOrders() {
    return { title: 'Gestión de Envíos' };
  }

  @Get('onboarding')
  @Render('pages/seller/onboarding')
  sellerOnboarding() {
    return { title: 'Actívate como Vendedor' };
  }
}

@Controller('dashboard')
@UseGuards(RequireAuth)
export class DashboardAuctionsPageController {
  @Get('auctions')
  dashboardAuctions(@Req() req, @Res() res) {
    const user = req.user;
    console.log('[SellerPageController] Dashboard Auctions. User:', user?.email, 'IsSeller:', user?.isSeller);
    if (user && user.isSeller) {
      console.log('[SellerPageController] Redirecting to Seller Auctions');
      return res.redirect('/seller/auctions');
    }
    console.log('[SellerPageController] Rendering Gate');
    return res.render('pages/dashboard/auctions-gate', { title: 'Gestión de Subastas' });
  }
}
