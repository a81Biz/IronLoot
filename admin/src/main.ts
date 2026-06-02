import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import * as nunjucks from 'nunjucks';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.ADMIN_SESSION_SECRET || 'admin-dev-secret-change-in-prod',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      },
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

  const port = process.env.ADMIN_PORT || 3001;
  await app.listen(port);
  console.log(`Iron Loot Admin running on: http://localhost:${port}`);
}
bootstrap();
