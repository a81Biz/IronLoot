import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminAuthController } from '../../../src/modules/admin/admin-auth.controller';
import { AuditPersistenceService } from '../../../src/modules/audit/audit-persistence.service';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: <T = string>(key: string, def?: T): T =>
      key in values ? (values[key] as unknown as T) : (def as T),
  } as unknown as ConfigService;
}

const jwt = { sign: jest.fn().mockReturnValue('signed-token') } as unknown as JwtService;
const audit = {
  recordAudit: jest.fn().mockResolvedValue(undefined),
} as unknown as AuditPersistenceService;

function makeController(values: Record<string, string>): AdminAuthController {
  return new AdminAuthController(jwt, makeConfig(values), audit);
}

describe('AdminAuthController.login (PT-036 — comparación timing-safe)', () => {
  afterEach(() => jest.clearAllMocks());

  it('C1: autentica con credenciales correctas (comportamiento preservado)', async () => {
    const ctrl = makeController({
      ADMIN_USERNAME: 'ironadmin',
      ADMIN_PASSWORD: 'strong-pass',
    });
    const res = await ctrl.login({ username: 'ironadmin', password: 'strong-pass' });
    expect(res.access_token).toBe('signed-token');
    expect(res.expires_in).toBe(8 * 60 * 60);
    expect(jwt.sign).toHaveBeenCalledTimes(1);
  });

  it('C2: rechaza contraseña incorrecta (distinta longitud, sin excepción por length)', async () => {
    const ctrl = makeController({
      ADMIN_USERNAME: 'ironadmin',
      ADMIN_PASSWORD: 'strong-pass',
    });
    await expect(ctrl.login({ username: 'ironadmin', password: 'x' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza usuario incorrecto', async () => {
    const ctrl = makeController({
      ADMIN_USERNAME: 'ironadmin',
      ADMIN_PASSWORD: 'strong-pass',
    });
    await expect(
      ctrl.login({ username: 'someone', password: 'strong-pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('dev: los defaults admin/admin siguen autenticando cuando no hay envs', async () => {
    const ctrl = makeController({});
    const res = await ctrl.login({ username: 'admin', password: 'admin' });
    expect(res.access_token).toBe('signed-token');
  });

  it('exige TOTP cuando ADMIN_TOTP_SECRET está configurado', async () => {
    const ctrl = makeController({
      ADMIN_USERNAME: 'ironadmin',
      ADMIN_PASSWORD: 'strong-pass',
      ADMIN_TOTP_SECRET: 'JBSWY3DPEHPK3PXP',
    });
    await expect(ctrl.login({ username: 'ironadmin', password: 'strong-pass' })).rejects.toThrow(
      'TOTP code required',
    );
  });
});
