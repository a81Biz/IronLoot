import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import * as nunjucks from 'nunjucks';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';

import * as cookieParser from 'cookie-parser';

import * as helmet from 'helmet';

// ===========================================
// Cookie Configuration
// ===========================================
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// Auth endpoints that return tokens
const AUTH_TOKEN_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.use(cookieParser());
  
  // Security Headers (Helmet)
  app.use(helmet.default({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));

  const viewsPath = join(__dirname, '..', 'views');
  
  // Conf Nunjucks
  nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app.getHttpAdapter().getInstance(),
    watch: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'public'), {
    maxAge: 0,
    setHeaders: (res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
    },
  });
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('html');

  // ===========================================
  // API Proxy with Auth Token Interception
  // ===========================================
  app.use(
    ['/api', '/v1'],
    createProxyMiddleware({
      target: process.env.VITE_API_URL || 'http://localhost:3000',
      changeOrigin: true,
      selfHandleResponse: true, // Required for responseInterceptor
      pathRewrite: {
        '^/v1': '/api/v1',
        '^/api': '/api',
      },
      on: {
        // ===========================================
        // REQUEST: Inject Authorization from Cookie
        // ===========================================
        proxyReq: (proxyReq, req) => {
          const expressReq = req as any;
          
          // Bridge HttpOnly Cookie -> Bearer Header
          if (expressReq.cookies?.['access_token']) {
            proxyReq.setHeader('Authorization', `Bearer ${expressReq.cookies['access_token']}`);
          }

          // Bridge Refresh Token Cookie -> Request Body
          // Only for POST /auth/refresh
          if (req.url && req.url.includes('/auth/refresh') && req.method === 'POST') {
             const refreshToken = expressReq.cookies?.['refresh_token'];
             if (refreshToken) {
               const bodyData = JSON.stringify({ refreshToken });
               
               // Set Headers
               proxyReq.setHeader('Content-Type', 'application/json');
               proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
               
               // Write Body
               proxyReq.write(bodyData);
             }
          }
        },

        // ===========================================
        // RESPONSE: Intercept Auth & Set Cookies
        // ===========================================
        proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
          const expressRes = res as any;
          const originalUrl = (req as any).originalUrl || '';
          
          // Check if this is an auth endpoint that returns tokens
          const isAuthEndpoint = AUTH_TOKEN_ENDPOINTS.some(ep => originalUrl.includes(ep));
          
          // Only process JSON responses
          const contentType = proxyRes.headers['content-type'] || '';
          if (!contentType.includes('application/json')) {
            return responseBuffer;
          }

          // Parse response body
          let body: any;
          try {
            body = JSON.parse(responseBuffer.toString('utf8'));
          } catch {
            return responseBuffer;
          }

          // ===========================================
          // Auth Token Handling
          // ===========================================
          if (isAuthEndpoint && proxyRes.statusCode && proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
            // Extract tokens (handle both { tokens: {...} } and { accessToken: ... } formats)
            const tokens = body.tokens || body;
            
            if (tokens?.accessToken) {
              // Set HttpOnly Cookie
              expressRes.cookie('access_token', tokens.accessToken, COOKIE_OPTIONS);
              console.log(`[Proxy] Set access_token cookie for ${originalUrl}`);
              
              // Optionally set refresh token cookie
              if (tokens.refreshToken) {
                expressRes.cookie('refresh_token', tokens.refreshToken, {
                  ...COOKIE_OPTIONS,
                  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for refresh
                });
              }

              // Remove tokens from response body (security: don't expose to JS)
              const sanitizedBody = {
                success: true,
                user: body.user || tokens.user || undefined,
                message: body.message,
              };
              
              return JSON.stringify(sanitizedBody);
            }
          }

          // ===========================================
          // Logout Handling
          // ===========================================
          if (originalUrl.includes('/auth/logout')) {
            expressRes.clearCookie('access_token', { path: '/' });
            expressRes.clearCookie('refresh_token', { path: '/' });
            console.log('[Proxy] Cleared auth cookies on logout');
          }

          // Return original response for non-auth endpoints
          return responseBuffer;
        }),
      },
    }),
  );

  await app.listen(5173);
  console.log(`Web Application is running on: ${await app.getUrl()}`);
}
bootstrap();
