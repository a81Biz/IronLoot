import { Controller, Get, Param, Query, Redirect, Render, Res } from '@nestjs/common';
import { Response } from 'express';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5175';

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

@Controller()
export class AppController {
  @Get('/')
  @Render('pages/home.html')
  async home() {
    const auctions = await fetchJson<any[]>(`${API_URL}/api/v1/auctions?status=ACTIVE&limit=6`);
    return { auctions: auctions ?? [], clientUrl: CLIENT_URL, apiUrl: API_URL };
  }

  @Get('/about')
  @Render('pages/static/about.html')
  about() {
    return { clientUrl: CLIENT_URL };
  }

  @Get('/privacy')
  @Render('pages/static/privacy.html')
  privacy() {
    return { clientUrl: CLIENT_URL };
  }

  @Get('/terms')
  @Redirect('/static/terms', 301)
  termsRedirect() {}

  @Get('/static/terms')
  @Render('pages/static/terms.html')
  terms() {
    return { clientUrl: CLIENT_URL };
  }

  @Get('/auctions')
  @Render('pages/auctions/list.html')
  async auctionsList(@Query('page') page = 1, @Query('q') q?: string) {
    const params = new URLSearchParams({ page: String(page), ...(q ? { q } : {}) });
    const data = await fetchJson<any>(`${API_URL}/api/v1/auctions?${params}`);
    return { auctions: data?.items ?? [], total: data?.total ?? 0, page, q, clientUrl: CLIENT_URL, apiUrl: API_URL };
  }

  @Get('/auctions/:id')
  @Render('pages/auctions/detail.html')
  async auctionDetail(@Param('id') id: string) {
    const auction = await fetchJson<any>(`${API_URL}/api/v1/auctions/${id}`);
    return { auction, clientUrl: CLIENT_URL, apiUrl: API_URL };
  }

  @Get('/auth/login')
  @Render('pages/auth/login.html')
  login() {
    return { apiUrl: API_URL, clientUrl: CLIENT_URL };
  }

  @Get('/auth/register')
  @Render('pages/auth/register.html')
  register() {
    return { apiUrl: API_URL, clientUrl: CLIENT_URL };
  }

  @Get('/auth/recovery')
  @Render('pages/auth/recovery.html')
  recovery() {
    return { apiUrl: API_URL };
  }

  @Get('/auth/reset-password')
  @Render('pages/auth/reset-password.html')
  resetPassword(@Query('token') token?: string) {
    return { apiUrl: API_URL, token };
  }

  @Get('/auth/verify-email')
  @Render('pages/auth/verify-email.html')
  verifyEmail(@Query('token') token?: string) {
    return { apiUrl: API_URL, token };
  }

  @Get('/auth/verify-email-pending')
  @Render('pages/auth/verify-email-pending.html')
  verifyEmailPending() {
    return { clientUrl: CLIENT_URL };
  }
}
