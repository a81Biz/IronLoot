import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { NotFoundExceptionFilter } from './common/filters/not-found.filter';
import * as nunjucks from 'nunjucks';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import helmet from 'helmet';

const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useGlobalFilters(new NotFoundExceptionFilter());

  // Security headers via Helmet (PT-030.5 / H-009)
  // CSRF note: CLIENT has no SSR POST routes — state changes go through the BFF proxy to the
  // REST API which uses JWT Bearer tokens (immune to CSRF). sameSite: Lax provides browser-level
  // CSRF protection for auth cookies.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Nunjucks templates may have inline event handlers
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // allow Google Fonts cross-origin
    }),
  );

  const viewsPath = join(__dirname, '..', 'views');
  nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app.getHttpAdapter().getInstance(),
    watch: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('html');

  const port = process.env.CLIENT_PORT || 5175;
  await app.listen(port);
  console.log(`CLIENT service running on port ${port}`);
}
bootstrap();
