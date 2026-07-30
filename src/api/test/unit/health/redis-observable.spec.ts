import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from '@/modules/health/health.service';
import { PrismaService } from '@/database/prisma.service';
import { ThrottlerRedisService } from '@/common/redis/throttler-redis.module';

/**
 * PT-178 (H-026) — Redis se puede observar.
 *
 * ## Qué había
 *
 * ```ts
 * // health.service.ts:89
 * return { status: 'unknown', message: 'Redis check not implemented' };
 * // :65
 * status: anyDown ? 'unhealthy' : allUp ? 'healthy' : 'degraded',
 * ```
 *
 * `redis` **nunca** podía valer `up`, así que `allUp` nunca era cierto y `/health/detailed`
 * **no podía** devolver `healthy`. Dos consecuencias, y la segunda es la que lo hacía un hallazgo:
 *
 *   1. Reportaba un problema inexistente en **cada** consulta — ruido que enseña a descartar la fuente.
 *   2. **Y si Redis se caía de verdad, decía exactamente lo mismo.** Una caída real era indistinguible
 *      del funcionamiento normal en el único endpoint que existe para diagnosticarla.
 *
 * De Redis dependen las colas, el rate limiting, el cerrojo distribuido y las sesiones de ADMIN.
 * RULE-17 protegió el **arranque** (el proceso aborta sin `REDIS_URL`); la degradación **en caliente**
 * quedó sin cubrir. Es el mismo hueco, un estado más tarde.
 *
 * ## Por qué se reutiliza el cliente del limitador
 *
 * No se crea uno propio: se hace `PING` sobre **el cliente que el sistema ya usa**. Un cliente nuevo
 * podría estar sano mientras el que sostiene el rate limiting está roto, y entonces el endpoint diría
 * «up» sobre algo que no es lo que importa. Se observa la dependencia real, no una parecida.
 */
describe('Redis se puede observar — H-026 (PT-178)', () => {
  // `PrismaService` expone `healthCheck()`, que ya devuelve `{status, latency}` y **nunca lanza**: la
  // base siempre se midio bien. El doble refleja ese contrato, no uno inventado.
  const mockPrisma = {
    healthCheck: jest.fn().mockResolvedValue({ status: 'up' as const, latency: 1 }),
  };

  const construir = async (redis: unknown): Promise<HealthService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('development') } },
        { provide: ThrottlerRedisService, useValue: redis },
      ],
    }).compile();

    return module.get(HealthService);
  };

  beforeEach(() => jest.clearAllMocks());

  it('C1: con Redis respondiendo, el estado es `up` y trae latencia', async () => {
    const service = await construir({ client: { ping: jest.fn().mockResolvedValue('PONG') } });

    const r = await service.checkDetailed();

    expect(r.dependencies?.redis?.status).toBe('up');
    expect(typeof r.dependencies?.redis?.latency).toBe('number');
  });

  it('C2: y entonces `/health/detailed` PUEDE decir `healthy` — antes era imposible', async () => {
    // El corazon del hallazgo: `allUp` nunca era alcanzable, asi que el endpoint no podia dar verde.
    const service = await construir({ client: { ping: jest.fn().mockResolvedValue('PONG') } });

    expect((await service.checkDetailed()).status).toBe('healthy');
  });

  it('C3: con Redis caido el estado es `down`, y el agregado `unhealthy`', async () => {
    // La otra mitad: una caida real ahora se DISTINGUE del funcionamiento normal.
    const service = await construir({
      client: { ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) },
    });

    const r = await service.checkDetailed();

    expect(r.dependencies?.redis?.status).toBe('down');
    expect(r.status).toBe('unhealthy');
  });

  it('C4: el motivo del fallo se dice, no se esconde', async () => {
    const service = await construir({
      client: { ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) },
    });

    expect(String((await service.checkDetailed()).dependencies?.redis?.message)).toMatch(
      /ECONNREFUSED/,
    );
  });

  it('C5: un `PING` colgado no cuelga el endpoint de salud', async () => {
    // Un endpoint de diagnostico que se queda esperando es peor que uno que dice «no lo se»: el
    // monitor que lo consulta se queda tambien.
    const service = await construir({
      client: { ping: jest.fn().mockImplementation(() => new Promise(() => {})) },
    });

    const inicio = Date.now();
    const r = await service.checkDetailed();

    expect(Date.now() - inicio).toBeLessThan(4000);
    expect(r.dependencies?.redis?.status).toBe('down');
  });

  describe('casos de control', () => {
    it('AC-01: `unknown` ya no es un estado que este codigo pueda producir', async () => {
      // Era el defecto literal: `status: 'unknown', message: 'Redis check not implemented'`.
      const arriba = await construir({ client: { ping: jest.fn().mockResolvedValue('PONG') } });
      const abajo = await construir({
        client: { ping: jest.fn().mockRejectedValue(new Error('x')) },
      });

      for (const s of [arriba, abajo]) {
        expect((await s.checkDetailed()).dependencies?.redis?.status).not.toBe('unknown');
      }
    });

    it('AC-02: la base de datos sigue comprobandose de verdad', async () => {
      // No se rompe lo que ya funcionaba: `database` siempre se midio bien.
      const service = await construir({ client: { ping: jest.fn().mockResolvedValue('PONG') } });

      await service.checkDetailed();

      expect(mockPrisma.healthCheck).toHaveBeenCalled();
    });

    it('AC-03: si la base cae, el agregado es `unhealthy` aunque Redis este bien', async () => {
      mockPrisma.healthCheck.mockResolvedValueOnce({ status: 'down' as const, latency: 0 });
      const service = await construir({ client: { ping: jest.fn().mockResolvedValue('PONG') } });

      expect((await service.checkDetailed()).status).toBe('unhealthy');
    });
  });
});
