import { Controller, Get, Render, UseGuards, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { RequireAuth } from '../../common/guards/require-auth.guard';
import { SellerGuard } from '../../common/guards/seller.guard';

@Controller('auctions')
export class AuctionsPageController {
  @Get('create')
  @UseGuards(RequireAuth, SellerGuard)
  @Render('pages/auction/create')
  createAuction() {
    return { title: 'Crear Subasta' };
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

  @Get()
  @Render('pages/auctions/list')
  auctions(@Req() req) {
    const layout = req.user ? 'layouts/main.html' : 'layouts/public.html';
    return {
      title: 'Subastas Activas',
      layout,
    };
  }

  @Get(':id/edit')
  @UseGuards(RequireAuth, SellerGuard)
  @Render('pages/auction/edit')
  editAuction(@Param('id', ParseUUIDPipe) id: string) {
    return { title: 'Editar Subasta', auctionId: id };
  }

  @Get(':id')
  @Render('pages/auctions/detail')
  auctionDetail(@Param('id', ParseUUIDPipe) id: string) {
    return { title: 'Detalle de Subasta' };
  }
}
