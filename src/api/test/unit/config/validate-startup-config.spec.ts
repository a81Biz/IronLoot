import { ConfigService } from '@nestjs/config';
import {
  validateStartupConfig,
  PLACEHOLDER_SECRETS,
} from '../../../src/common/config/validate-startup-config';

// Stub mínimo de ConfigService: solo se usa .get(key, default)
function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: <T = string>(key: string, def?: T): T =>
      key in values ? (values[key] as unknown as T) : (def as T),
  } as unknown as ConfigService;
}

// Config "válida" de producción para aislar la variable bajo prueba
const VALID_PROD: Record<string, string> = {
  ADMIN_API_KEY: 'a-strong-admin-api-key-value',
  JWT_SECRET: 'x'.repeat(40),
  SESSION_SECRET: 'y'.repeat(40),
  ADMIN_USERNAME: 'ironadmin',
  ADMIN_PASSWORD: 'a-strong-admin-password',
};

describe('validateStartupConfig', () => {
  const savedOrigins = process.env.ALLOWED_ORIGINS;
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://admin.ironloot.local';
  });
  afterAll(() => {
    if (savedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = savedOrigins;
  });

  // A5 — happy path
  it('A5: no devuelve errores con configuración de producción válida', () => {
    const errors = validateStartupConfig(makeConfig(VALID_PROD), 'production');
    expect(errors).toEqual([]);
  });

  // A6 — dev no aplica
  it('A6: no valida en entornos distintos de production', () => {
    const errors = validateStartupConfig(makeConfig({}), 'development');
    expect(errors).toEqual([]);
  });

  // A1 — password default
  it('A1: rechaza ADMIN_PASSWORD default "admin" en producción', () => {
    const errors = validateStartupConfig(
      makeConfig({ ...VALID_PROD, ADMIN_PASSWORD: 'admin' }),
      'production',
    );
    expect(errors.some((e) => /ADMIN_PASSWORD/.test(e))).toBe(true);
  });

  // A2 — password vacío
  it('A2: rechaza ADMIN_PASSWORD vacío en producción', () => {
    const errors = validateStartupConfig(
      makeConfig({ ...VALID_PROD, ADMIN_PASSWORD: '' }),
      'production',
    );
    expect(errors.some((e) => /ADMIN_PASSWORD/.test(e))).toBe(true);
  });

  // A3 — password placeholder
  it('A3: rechaza ADMIN_PASSWORD placeholder en producción', () => {
    const placeholder = [...PLACEHOLDER_SECRETS][0];
    const errors = validateStartupConfig(
      makeConfig({ ...VALID_PROD, ADMIN_PASSWORD: placeholder }),
      'production',
    );
    expect(errors.some((e) => /ADMIN_PASSWORD/.test(e))).toBe(true);
  });

  // A4 — username default
  it('A4: rechaza ADMIN_USERNAME default "admin" en producción', () => {
    const errors = validateStartupConfig(
      makeConfig({ ...VALID_PROD, ADMIN_USERNAME: 'admin' }),
      'production',
    );
    expect(errors.some((e) => /ADMIN_USERNAME/.test(e))).toBe(true);
  });

  // A7 — regresión: los checks existentes siguen operando
  it('A7: mantiene los checks existentes (JWT_SECRET corto)', () => {
    const errors = validateStartupConfig(
      makeConfig({ ...VALID_PROD, JWT_SECRET: 'short' }),
      'production',
    );
    expect(errors.some((e) => /JWT_SECRET/.test(e))).toBe(true);
  });

  it('A7b: reporta ALLOWED_ORIGINS ausente en producción', () => {
    delete process.env.ALLOWED_ORIGINS;
    const errors = validateStartupConfig(makeConfig(VALID_PROD), 'production');
    expect(errors.some((e) => /ALLOWED_ORIGINS/.test(e))).toBe(true);
  });
});
