/**
 * Iron Loot - Application Configuration
 *
 * Centralizes all configuration loading from environment variables.
 * This is the single source of truth for application settings.
 */

export default () => ({
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // API
  api: {
    port: parseInt(process.env.API_PORT || '3000', 10),
    host: process.env.API_HOST || '0.0.0.0',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'ironloot_db',
    user: process.env.DB_USER || 'ironloot',
    password: process.env.DB_PASSWORD,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  // JWT & Security
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiration: process.env.JWT_EXPIRATION || '1h',
    jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    sessionSecret: process.env.SESSION_SECRET,
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // Logging & Observability
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    traceEnabled: process.env.TRACE_ENABLED === 'true',
  },

  // Business Rules
  business: {
    auction: {
      softCloseWindowSec: parseInt(process.env.AUCTION_SOFT_CLOSE_WINDOW_SEC || '120', 10),
    },
    payment: {
      expirationHours: parseInt(process.env.PAYMENT_EXPIRATION_HOURS || '72', 10),
    },
    dispute: {
      windowDays: parseInt(process.env.DISPUTE_WINDOW_DAYS || '14', 10),
    },
  },
});
