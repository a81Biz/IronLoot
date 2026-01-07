import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import * as nunjucks from 'nunjucks';

import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve Static Files
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  // Setup Nunjucks (View Engine)
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('html');

  nunjucks.configure(join(__dirname, '..', 'views'), {
    autoescape: true,
    express: app,
    watch: true,
  });

  // Proxy API requests in development
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.API_URL || 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/': '/api/', // Add /api/ back because Express strips it
      },
    }),
  );

  const port = process.env.WEB_PORT || 5173;
  await app.listen(port);
  console.log(`Frontend (SSR) running on http://localhost:${port}`);
}
bootstrap();
