import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min, validateSync } from 'class-validator';

/**
 * Environment types
 */
enum Environment {
  Development = 'development',
  QA = 'qa',
  Production = 'production',
}

/**
 * Environment variables schema
 * Validates required and optional environment variables at startup
 */
class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @IsOptional()
  API_PORT: number = 3000;

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  DB_HOST?: string;

  @IsNumber()
  @IsOptional()
  DB_PORT?: number;

  @IsString()
  @IsOptional()
  DB_NAME?: string;

  @IsString()
  @IsOptional()
  DB_USER?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsNumber()
  @IsOptional()
  REFRESH_TOKEN_EXPIRES_DAYS?: number;

  @IsNumber()
  @IsOptional()
  BCRYPT_SALT_ROUNDS?: number;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string;
}

/**
 * Validates environment variables at application startup
 * Throws error if validation fails (fail-fast approach)
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((err) => Object.values(err.constraints || {}).join(', '));
    throw new Error(`Environment validation failed: ${errorMessages.join('; ')}`);
  }

  return validatedConfig;
}
