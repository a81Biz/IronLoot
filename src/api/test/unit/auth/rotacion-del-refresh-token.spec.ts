import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@/modules/auth/auth.service';
import { PrismaService } from '@/database/prisma.service';

/**
 * PT-196 · bloque 3 — **Los cuatro casos de un refresh token presentado.**
 *
 * ## Por qué cuatro y no dos
 *
 * Hasta ahora había dos: el token existe (sesión) o no existe (401). Con la rotación aparecen dos más,
 * y **la diferencia entre ellos es todo el PT**:
 *
 * | Lo presentado | Cuándo | Qué es |
 * |---|---|---|
 * | el vigente | siempre | uso normal → **rota** |
 * | el anterior | dentro de la gracia | una **carrera** → devuelve los vigentes, sin rotar |
 * | el anterior | pasada la gracia | un **robo** → revoca la sesión |
 * | ninguno | — | sesión no encontrada, como siempre |
 *
 * Confundir los dos del medio tiene consecuencias opuestas: tratar la carrera como robo **expulsa a un
 * usuario legítimo en una carga de página normal**; tratar el robo como carrera **regala la sesión al
 * ladrón**.
 *
 * ## El orden de las comprobaciones también se prueba
 *
 * Una sesión **ya revocada** no puede disparar un evento de reuso en cada reintento: el registro se
 * llenaría de ruido justo cuando hay que leerlo. Por eso revocada y expirada se miran **antes**.
 *
 * ## La gracia se prueba escribiendo `rotatedAt` en el pasado
 *
 * Una fila con `rotatedAt = ahora − 31 s` es exactamente lo que el sistema vería pasada la ventana. No
 * se espera ni se toca el reloj — el mismo criterio que los tokens con `exp` vencido de PT-194 y que
 * `SETTLEMENT_HOLDBACK_HOURS=0` en la fase 35 de QA.
 */
const GRACIA_SEG = 30;

const haceSegundos = (s: number) => new Date(Date.now() - s * 1000);

const SESION_BASE = {
  id: 's-1',
  userId: 'u-1',
  refreshToken: 'VIGENTE',
  previousRefreshToken: 'ANTERIOR',
  rotatedAt: haceSegundos(5),
  expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
  revokedAt: null as Date | null,
  ipAddress: '10.0.0.1',
  userAgent: 'navegador-legitimo',
};

const USUARIO = {
  id: 'u-1',
  email: 'a@b.c',
  username: 'u',
  state: 'ACTIVE',
  isSeller: false,
  emailVerified: true,
  profile: null,
};

describe('Rotacion del refresh token — PT-196', () => {
  let service: AuthService;
  let prisma: {
    session: {
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    process.env.ROTATION_GRACE_SEC = String(GRACIA_SEG);

    prisma = {
      session: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findUnique: jest.fn().mockResolvedValue(USUARIO) },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 's-1' }]),
      $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
        typeof cb === 'function' ? cb(prisma) : Promise.all(cb),
      ),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
    })
      // Un solo doble que sirve para todas las dependencias: solo interesa que no estorben. Lo que
      // esta prueba mide es la decision entre los cuatro casos, no la firma ni el registro.
      .useMocker(() => ({
        child: () => ({
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        }),
        get: (_clave: string, porDefecto?: unknown) => porDefecto ?? '15m',
        increment: jest.fn(),
        getTraceId: jest.fn(),
        sign: jest.fn().mockReturnValue('access-firmado'),
        recordAudit: jest.fn(),
      }))
      .compile();

    service = mod.get(AuthService);
  });

  // ── Caso 1: el vigente rota ───────────────────────────────────────────────────────────────────
  it('C1: presentar el VIGENTE rota — el actual pasa a anterior y se genera uno nuevo', async () => {
    prisma.session.findFirst.mockResolvedValue({ ...SESION_BASE });

    const r = await service.refreshToken('VIGENTE');

    const escrito = prisma.session.update.mock.calls.at(-1)?.[0].data;
    expect(escrito.previousRefreshToken).toBe('VIGENTE');
    expect(escrito.refreshToken).not.toBe('VIGENTE');
    expect(escrito.rotatedAt).toBeInstanceOf(Date);
    // Y lo que se devuelve es lo que se escribio, no el viejo.
    expect(r.refreshToken).toBe(escrito.refreshToken);
  });

  // ── Caso 2: el anterior dentro de la gracia es una carrera ────────────────────────────────────
  it('C2: el ANTERIOR dentro de la gracia devuelve los vigentes, SIN rotar', async () => {
    // Es una carga de pagina con dos llamadas concurrentes, no un robo.
    prisma.session.findFirst.mockResolvedValue({ ...SESION_BASE, rotatedAt: haceSegundos(5) });

    const r = await service.refreshToken('ANTERIOR');

    expect(r.refreshToken).toBe('VIGENTE');
    expect(prisma.session.update).not.toHaveBeenCalled();
    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });

  // ── Caso 3: el anterior pasada la gracia es un robo ───────────────────────────────────────────
  it('C3: el ANTERIOR pasada la gracia REVOCA la sesion', async () => {
    prisma.session.findFirst.mockResolvedValue({
      ...SESION_BASE,
      rotatedAt: haceSegundos(GRACIA_SEG + 1),
    });

    await expect(service.refreshToken('ANTERIOR')).rejects.toThrow();

    const revocada = prisma.session.update.mock.calls.some(
      (c) => c[0]?.data?.revokedAt instanceof Date,
    );
    expect(revocada).toBe(true);
  });

  it('C4: y tras esa revocacion el token VIGENTE tampoco vale', async () => {
    // Se revoca la sesion, no el token: si no, el ladron seguiria dentro con el que acaba de obtener.
    prisma.session.findFirst.mockResolvedValue({ ...SESION_BASE, revokedAt: new Date() });

    await expect(service.refreshToken('VIGENTE')).rejects.toThrow();
  });

  // ── Caso 4 y el orden ─────────────────────────────────────────────────────────────────────────
  it('C5: un token desconocido sigue dando sesion no encontrada', async () => {
    prisma.session.findFirst.mockResolvedValue(null);

    await expect(service.refreshToken('NO-EXISTE')).rejects.toThrow();
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it('C6: una sesion YA revocada no dispara un evento de reuso en cada reintento', async () => {
    // Si lo hiciera, el registro se llenaria de ruido justo cuando hay que leerlo. Revocada y
    // expirada se comprueban ANTES que el reuso.
    prisma.session.findFirst.mockResolvedValue({
      ...SESION_BASE,
      revokedAt: haceSegundos(600),
      rotatedAt: haceSegundos(GRACIA_SEG + 1),
    });

    await expect(service.refreshToken('ANTERIOR')).rejects.toThrow();

    // No se vuelve a revocar: ya lo estaba.
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  // ── La concurrencia sobre el vigente ──────────────────────────────────────────────────────────
  it('C7: la rotacion bloquea la fila antes de leerla', async () => {
    // Sin bloqueo, dos refrescos concurrentes con el vigente leen el mismo estado y escriben dos
    // rotaciones: la segunda pisa a la primera y **el token entregado primero deja de existir**.
    // Un usuario expulsado por su propia concurrencia. Es RULE-24 aplicada a la sesion.
    prisma.session.findFirst.mockResolvedValue({ ...SESION_BASE });

    await service.refreshToken('VIGENTE');

    expect(prisma.$queryRaw).toHaveBeenCalled();
    const sql = String(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql.toUpperCase()).toContain('FOR UPDATE');
  });

  describe('casos de control', () => {
    it('AC-01: sin `ROTATION_GRACE_SEC` el arranque ABORTA nombrandola', async () => {
      // RULE-17. Un valor silencioso aqui seria o expulsar por carreras (0) o una ventana que nadie
      // decidio.
      const anterior = process.env.ROTATION_GRACE_SEC;
      delete process.env.ROTATION_GRACE_SEC;
      jest.resetModules();

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('@/modules/auth/rotation-grace');
      }).toThrow(/ROTATION_GRACE_SEC/);

      process.env.ROTATION_GRACE_SEC = anterior;
      jest.resetModules();
    });

    it('AC-02: la sesion de prueba tiene un anterior distinto del vigente', async () => {
      // Sin esto, C2 y C3 podrian estar pasando por el camino del vigente sin que se note.
      expect(SESION_BASE.previousRefreshToken).not.toBe(SESION_BASE.refreshToken);
    });

    it('AC-03: la gracia se mide desde `rotatedAt`, no desde `lastUsedAt`', async () => {
      // Es la leccion de H-011: el reloj cuelga del hecho —la rotacion—, no de la ultima vez que
      // alguien toco la fila. Con `lastUsedAt`, cada refresco reiniciaria la ventana y el token
      // anterior valdria indefinidamente.
      prisma.session.findFirst.mockResolvedValue({
        ...SESION_BASE,
        rotatedAt: haceSegundos(GRACIA_SEG + 1),
        lastUsedAt: new Date(),
      });

      await expect(service.refreshToken('ANTERIOR')).rejects.toThrow();
    });
  });
});
