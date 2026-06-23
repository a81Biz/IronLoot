import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { StructuredLogger } from './common/observability';

const PLACEHOLDER_SECRETS = new Set([
  'dev-admin-key',
  'change-me',
  'secret',
  'your-secret-here',
  'your-jwt-secret',
  'changeme',
]);

function validateStartupConfig(config: ConfigService, env: string): void {
  if (env !== 'production') return;

  const errors: string[] = [];

  const adminKey = config.get<string>('ADMIN_API_KEY', '');
  if (!adminKey || PLACEHOLDER_SECRETS.has(adminKey)) {
    errors.push('ADMIN_API_KEY must not be a placeholder value in production');
  }

  const jwtSecret = config.get<string>('JWT_SECRET', '');
  if (!jwtSecret || jwtSecret.length < 32 || PLACEHOLDER_SECRETS.has(jwtSecret)) {
    errors.push('JWT_SECRET must be set and at least 32 characters in production');
  }

  const sessionSecret = config.get<string>('SESSION_SECRET', '');
  if (!sessionSecret || sessionSecret.length < 32 || PLACEHOLDER_SECRETS.has(sessionSecret)) {
    errors.push('SESSION_SECRET must be set and at least 32 characters in production');
  }

  if (!process.env.ALLOWED_ORIGINS) {
    errors.push('ALLOWED_ORIGINS must be explicitly set in production (cannot allow all origins)');
  }

  if (errors.length > 0) {
    console.error('STARTUP CONFIGURATION ERRORS:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  // Create application
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get services
  const config = app.get(ConfigService);
  const logger = app.get(StructuredLogger);

  // Use structured logger for NestJS
  app.useLogger(logger);

  const port = config.get<number>('API_PORT', 3000);
  const env = config.get<string>('NODE_ENV', 'development');

  // Fail fast on insecure production configuration
  validateStartupConfig(config, env);

  // Security
  app.use(helmet());

  // CORS — reads ALLOWED_ORIGINS (comma-separated) to support multi-domain architecture (PT-013)
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Production requires explicit origins. Development falls back to allow-all.
  const corsOrigin =
    allowedOrigins.length > 0 ? allowedOrigins : env === 'production' ? false : true;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger (non-production only)
  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Iron Loot API')
      .setDescription('Auction platform API')
      .setVersion('0.1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token', // This name must match @ApiBearerAuth() in controllers
      )
      .addTag('health', 'Service health check')
      .addTag('auth', 'User authentication and session management')
      .addTag('users', 'User profile and seller management')
      .addTag('auctions', 'Auction creation and lifecycle management')
      .addTag('bids', 'Bidding validation and processing')
      .addTag('orders', 'Order creation and management')
      .addTag('wallet', 'Wallet and transaction history')
      .addTag('ratings', 'User reputation system')
      .addTag('disputes', 'Dispute resolution')
      .addTag('payments', 'Payment processing')
      .addTag('watchlist', 'User watchlist management')
      .addTag('diagnostics', 'System diagnostics (Non-production)')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);

    logger.info(`Swagger docs available at /docs`, { context: 'Bootstrap' });
  }

  // Start
  await app.listen(port);

  logger.info(`Iron Loot API started`, {
    context: 'Bootstrap',
    data: { port, env },
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
