import { ConfigService } from '@nestjs/config';

/**
 * Valores de secreto/placeholder que nunca deben usarse en producción.
 * Reutilizado por el gate de credenciales admin (PT-036 / AUD-004).
 */
export const PLACEHOLDER_SECRETS = new Set([
  'dev-admin-key',
  'change-me',
  'secret',
  'your-secret-here',
  'your-jwt-secret',
  'changeme',
]);

/** Credenciales admin por defecto que deben rechazarse en producción (PT-036). */
const DEFAULT_ADMIN_CREDENTIAL = 'admin';

/**
 * Valida la configuración crítica de arranque. Función **pura**: devuelve la
 * lista de errores (no realiza `process.exit`) para poder testearse sin arrancar
 * Nest. `main.ts` decide abortar si la lista no está vacía.
 *
 * Solo aplica en producción; en otros entornos devuelve `[]`.
 */
export function validateStartupConfig(config: ConfigService, env: string): string[] {
  if (env !== 'production') return [];

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

  // PT-036 (AUD-004): las credenciales de login admin deben estar definidas y
  // no ser el default `admin` ni un placeholder conocido.
  const adminUser = config.get<string>('ADMIN_USERNAME', '');
  if (!adminUser || adminUser === DEFAULT_ADMIN_CREDENTIAL) {
    errors.push('ADMIN_USERNAME must be set to a non-default value (not "admin") in production');
  }

  const adminPass = config.get<string>('ADMIN_PASSWORD', '');
  if (!adminPass || adminPass === DEFAULT_ADMIN_CREDENTIAL || PLACEHOLDER_SECRETS.has(adminPass)) {
    errors.push(
      'ADMIN_PASSWORD must be set to a strong non-default value (not "admin"/placeholder) in production',
    );
  }

  if (!process.env.ALLOWED_ORIGINS) {
    errors.push('ALLOWED_ORIGINS must be explicitly set in production (cannot allow all origins)');
  }

  return errors;
}
