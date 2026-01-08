import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import * as nunjucks from 'nunjucks';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const viewsPath = join(__dirname, '..', 'views');
  
  // Conf Nunjucks
  const env = nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app.getHttpAdapter().getInstance(),
    watch: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'public'));
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
    }),
  );

  await app.listen(5173);
  console.log(`Web Application is running on: ${await app.getUrl()}`);
}
bootstrap();
