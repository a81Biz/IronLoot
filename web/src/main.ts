import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import * as nunjucks from 'nunjucks';
import { createProxyMiddleware } from 'http-proxy-middleware';

import * as cookieParser from 'cookie-parser';

import * as helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.use(cookieParser());
  
  // Security Headers (Helmet)
  app.use(helmet.default({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for window.CURRENT_USER injection
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Often causes issues with resources
  }));

  const viewsPath = join(__dirname, '..', 'views');
  
  // Conf Nunjucks
  const env = nunjucks.configure(viewsPath, {
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

  // Proxy /api requests to backend
  // Proxy /api and /v1 requests to backend
  app.use(
    ['/api', '/v1'],
    createProxyMiddleware({
      target: process.env.VITE_API_URL || 'http://api:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/v1': '/api/v1', // rewrite /v1 -> /api/v1
        '^/api': '/api',   // keep /api as is
      },
      on: {
        proxyReq: (proxyReq, req, res) => {
          // Bridge HttpOnly Cookie -> Bearer Header for Backend API
          const expressReq = req as any;
          if (expressReq.cookies && expressReq.cookies['access_token']) {
             proxyReq.setHeader('Authorization', `Bearer ${expressReq.cookies['access_token']}`);
          }
        },
      },
    }),
  );

  await app.listen(5173);
  console.log(`Web Application is running on: ${await app.getUrl()}`);
}
bootstrap();
