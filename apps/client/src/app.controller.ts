import { Controller, Get, Param, Query, Render, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ClientAuthGuard } from './common/guards/client-auth.guard';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';

async function apiGet<T>(token: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function getToken(req: Request): string {
  return req.cookies?.['access_token'] || '';
}

@UseGuards(ClientAuthGuard)
@Controller()
export class AppController {
  // ── Buyer Portal ──────────────────────────────────────────────────────
  @Get('/dashboard')
  @Render('pages/dashboard.html')
  async dashboard(@Req() req: Request) {
    const token = getToken(req);
    const [profile, wallet, bids, auctions] = await Promise.all([
      apiGet(token, '/api/v1/users/me'),
      apiGet(token, '/api/v1/wallet'),
      apiGet(token, '/api/v1/bids/my?limit=5'),
      apiGet(token, '/api/v1/auctions?status=ACTIVE&limit=6'),
    ]);
    return { profile, wallet, bids, auctions, apiUrl: API_URL, baseUrl: BASE_URL };
  }

  @Get('/auth/logout')
  logout(@Res() res: Response): void {
    res.clearCookie('access_token');
    res.redirect(`${BASE_URL}/auth/login`);
  }

  @Get('/profile')
  @Render('pages/profile.html')
  async profile(@Req() req: Request) {
    const profile = await apiGet(getToken(req), '/api/v1/users/me');
    return { profile, apiUrl: API_URL };
  }

  @Get('/settings')
  @Render('pages/settings.html')
  async settings(@Req() req: Request) {
    const settings = await apiGet(getToken(req), '/api/v1/users/settings');
    return { settings, apiUrl: API_URL };
  }

  @Get('/my-bids')
  @Render('pages/bids/my.html')
  async myBids(@Req() req: Request, @Query('page') page = 1) {
    const bids = await apiGet(getToken(req), `/api/v1/bids/my?page=${page}`);
    return { bids, page, apiUrl: API_URL };
  }

  @Get('/auctions/won-auctions')
  @Render('pages/won-auctions.html')
  async wonAuctions(@Req() req: Request) {
    const orders = await apiGet(getToken(req), '/api/v1/orders?role=buyer');
    return { orders, apiUrl: API_URL };
  }

  @Get('/auctions/watchlist')
  @Render('pages/watchlist.html')
  async watchlist(@Req() req: Request) {
    const items = await apiGet(getToken(req), '/api/v1/watchlist');
    return { items, apiUrl: API_URL, baseUrl: BASE_URL };
  }

  @Get('/wallet')
  @Render('pages/wallet.html')
  async wallet(@Req() req: Request) {
    const wallet = await apiGet(getToken(req), '/api/v1/wallet');
    return { wallet, apiUrl: API_URL };
  }

  @Get('/wallet/deposit')
  @Render('pages/wallet/deposit.html')
  deposit(@Req() req: Request) {
    return { apiUrl: API_URL };
  }

  @Get('/wallet/withdraw')
  @Render('pages/wallet/withdraw.html')
  withdraw(@Req() req: Request) {
    return { apiUrl: API_URL };
  }

  @Get('/wallet/history')
  @Render('pages/wallet/history.html')
  async walletHistory(@Req() req: Request, @Query('page') page = 1) {
    const history = await apiGet(getToken(req), `/api/v1/wallet/history?page=${page}`);
    return { history, page, apiUrl: API_URL };
  }

  @Get('/payments')
  @Render('pages/payments.html')
  async payments(@Req() req: Request) {
    const history = await apiGet(getToken(req), '/api/v1/wallet/history?types=DEBIT_ORDER,CREDIT_SALE');
    return { history, apiUrl: API_URL };
  }

  @Get('/orders')
  @Render('pages/orders/list.html')
  async orders(@Req() req: Request, @Query('page') page = 1) {
    const orders = await apiGet(getToken(req), `/api/v1/orders?page=${page}`);
    return { orders, page, apiUrl: API_URL };
  }

  @Get('/orders/:id')
  @Render('pages/orders/detail.html')
  async orderDetail(@Req() req: Request, @Param('id') id: string) {
    const order = await apiGet(getToken(req), `/api/v1/orders/${id}`);
    return { order, apiUrl: API_URL };
  }

  @Get('/notifications')
  @Render('pages/notifications/list.html')
  async notifications(@Req() req: Request) {
    const notifications = await apiGet(getToken(req), '/api/v1/notifications');
    return { notifications, apiUrl: API_URL };
  }

  @Get('/disputes')
  @Render('pages/disputes/list.html')
  async disputes(@Req() req: Request) {
    const disputes = await apiGet(getToken(req), '/api/v1/disputes');
    return { disputes, apiUrl: API_URL };
  }

  @Get('/disputes/create')
  @Render('pages/disputes/create.html')
  disputeCreate(@Query('orderId') orderId?: string) {
    return { orderId, apiUrl: API_URL };
  }

  @Get('/disputes/:id')
  @Render('pages/disputes/detail.html')
  async disputeDetail(@Req() req: Request, @Param('id') id: string) {
    const dispute = await apiGet(getToken(req), `/api/v1/disputes/${id}`);
    return { dispute, apiUrl: API_URL };
  }

  @Get('/reputation')
  @Render('pages/reputation.html')
  async reputation(@Req() req: Request) {
    const profile = await apiGet(getToken(req), '/api/v1/users/me');
    return { profile, apiUrl: API_URL };
  }

  // ── Seller Portal ─────────────────────────────────────────────────────
  @Get('/seller/onboarding')
  @Render('pages/seller/onboarding.html')
  sellerOnboarding(@Req() req: Request) {
    return { apiUrl: API_URL };
  }

  @Get('/seller/auctions')
  @Render('pages/seller/auctions.html')
  async sellerAuctions(@Req() req: Request, @Query('page') page = 1) {
    const auctions = await apiGet(getToken(req), `/api/v1/auctions?role=seller&page=${page}`);
    return { auctions, page, apiUrl: API_URL };
  }

  @Get('/seller/orders')
  @Render('pages/seller/orders.html')
  async sellerOrders(@Req() req: Request, @Query('page') page = 1) {
    const orders = await apiGet(getToken(req), `/api/v1/orders?role=seller&page=${page}`);
    return { orders, page, apiUrl: API_URL };
  }

  @Get('/auctions/create')
  @Render('pages/auction/create.html')
  auctionCreate(@Req() req: Request) {
    return { apiUrl: API_URL };
  }

  @Get('/auctions/:id/edit')
  @Render('pages/auction/edit.html')
  async auctionEdit(@Req() req: Request, @Param('id') id: string) {
    const auction = await apiGet(getToken(req), `/api/v1/auctions/${id}`);
    return { auction, apiUrl: API_URL };
  }
}
