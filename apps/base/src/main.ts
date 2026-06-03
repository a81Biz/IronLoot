import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import * as nunjucks from 'nunjucks';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';

// COOKIE_DOMAIN controls cross-subdomain SSO. Set to `.ironloot.local` for local dev
// with hosts-file entries, or `.ironloot.com` for production.
// If empty or unset, the cookie is scoped to the host that set it (no cross-subdomain SSO).
// Note: `domain=localhost` (without leading dot) does NOT propagate to subdomains in Chrome ≥ 90.
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.COOKIE_SAMESITE || 'Lax') as 'Lax' | 'Strict' | 'None',
  ...(cookieDomain ? { domain: cookieDomain } : {}),
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const AUTH_TOKEN_ENDPOINTS = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());

  const viewsPath = join(__dirname, '..', 'views');
  nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app.getHttpAdapter().getInstance(),
    watch: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('html');

  // BFF proxy — forwards API requests and handles auth cookies
  const apiTarget = process.env.API_URL || 'http://localhost:3000';
  app.use(
    '/api',
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      selfHandleResponse: true,
      on: {
        proxyReq: (proxyReq, req) => {
          const expressReq = req as any;
          if (expressReq.cookies?.['access_token']) {
            proxyReq.setHeader('Authorization', `Bearer ${expressReq.cookies['access_token']}`);
          }
        },
        proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
          const expressRes = res as any;
          const originalUrl = (req as any).originalUrl || '';
          const isAuthEndpoint = AUTH_TOKEN_ENDPOINTS.some(ep => originalUrl.includes(ep));
          const contentType = proxyRes.headers['content-type'] || '';
          if (!contentType.includes('application/json')) return responseBuffer;

          let body: any;
          try { body = JSON.parse(responseBuffer.toString('utf8')); } catch { return responseBuffer; }

          if (isAuthEndpoint && proxyRes.statusCode && proxyRes.statusCode < 300) {
            const tokens = body.tokens || body;
            if (tokens?.accessToken) {
              expressRes.cookie('access_token', tokens.accessToken, COOKIE_OPTIONS);
              if (tokens.refreshToken) {
                expressRes.cookie('refresh_token', tokens.refreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });
              }
              return JSON.stringify({ success: true, user: body.user || tokens.user, message: body.message });
            }
          }

          if (originalUrl.includes('/auth/logout')) {
            const clearOpts = { path: '/', ...(cookieDomain ? { domain: cookieDomain } : {}) };
            expressRes.clearCookie('access_token', clearOpts);
            expressRes.clearCookie('refresh_token', clearOpts);
          }
          return responseBuffer;
        }),
      },
    }),
  );

  const port = process.env.BASE_PORT || 5174;
  await app.listen(port);
  console.log(`BASE service running on port ${port}`);
}
bootstrap();
