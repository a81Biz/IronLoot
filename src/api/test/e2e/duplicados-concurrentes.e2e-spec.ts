import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { WalletService } from '../../src/modules/wallet/wallet.service';
import { AccountVerificationService } from '../../src/modules/wallet/account-verification.service';

/**
 * PT-145 — Dos guardas de negocio sin restriccion que las sostenga.
 *
 * `Rating` y `AccountVerification` comprueban «ya existe» y crean si no. Ninguna de las dos tablas
 * declara restriccion unica, asi que la carrera **no produce un error: produce un duplicado en
 * silencio**.
 *
 * La grave es la segunda: cada verificacion **envia dinero** a la cuenta del vendedor, descontado de
 * su saldo. Dos verificaciones en curso son dos envios.
 *
 * Las dos pruebas de abajo fabrican la concurrencia a proposito. Tienen que fallar contra el codigo
 * anterior.
 */
describe('Duplicados bajo concurrencia (PT-145)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let wallet: WalletService;
  let verificacion: AccountVerificationService;

  const SIMULTANEAS = 5;
  const usuariosCreados: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    wallet = app.get(WalletService);
    verificacion = app.get(AccountVerificationService);
  });

  afterAll(async () => {
    // Acotado a lo propio y en orden de dependencias (RULE-23).
    for (const id of usuariosCreados) {
      const metodos = await prisma.userPaymentMethod.findMany({ where: { userId: id } });
      await prisma.accountVerification.deleteMany({ where: { userId: id } });
      await prisma.userPaymentMethod.deleteMany({
        where: { id: { in: metodos.map((m) => m.id) } },
      });
      const w = await prisma.wallet.findUnique({ where: { userId: id } });
      if (w) await prisma.ledger.deleteMany({ where: { walletId: w.id } });
      await prisma.wallet.deleteMany({ where: { userId: id } });
      await prisma.user.deleteMany({ where: { id } });
    }
    await app?.close();
  });

  async function usuario(sufijo: string): Promise<string> {
    const t = Date.now();
    const u = await prisma.user.create({
      data: {
        email: `pt145-${sufijo}-${t}@ironloot.test`,
        username: `pt145-${sufijo}-${t}`,
        passwordHash: 'no-se-usa',
      },
    });
    usuariosCreados.push(u.id);
    return u.id;
  }

  describe('Verificacion de cuenta — cada una envia dinero', () => {
    async function metodoConSaldo(sufijo: string): Promise<{ userId: string; metodoId: string }> {
      const userId = await usuario(sufijo);
      await wallet.deposit(userId, 500, `pt145-dep-${sufijo}-${Date.now()}`);

      const metodo = await prisma.userPaymentMethod.create({
        data: {
          userId,
          type: 'CLABE',
          referenceId: `0021800000000000${Math.floor(Math.random() * 90 + 10)}`,
          clabe: `0021800000000000${Math.floor(Math.random() * 90 + 10)}`,
          holderName: 'PT145 Concurrencia',
          isVerified: false,
          isActive: true,
        },
      });

      return { userId, metodoId: metodo.id };
    }

    it('VER-01: N solicitudes simultaneas dejan UNA verificacion, no N', async () => {
      const { userId, metodoId } = await metodoConSaldo('ver');

      await Promise.allSettled(
        Array.from({ length: SIMULTANEAS }, () => verificacion.start(userId, metodoId)),
      );

      const enCurso = await prisma.accountVerification.count({
        where: { paymentMethodId: metodoId, status: { in: ['PENDING', 'SENT'] } },
      });

      // Cada fila de mas es un envio de dinero de mas. No es un codigo HTTP equivocado.
      expect(enCurso).toBe(1);
    });

    it('VER-04 (control): dos metodos DISTINTOS del mismo usuario no se estorban', async () => {
      // El bloqueo tiene que ser por metodo. Si fuera por usuario, esto pasaria igual y estariamos
      // serializando de mas sin saberlo.
      const { userId, metodoId: a } = await metodoConSaldo('dos-a');
      const b = await prisma.userPaymentMethod.create({
        data: {
          userId,
          type: 'CLABE',
          referenceId: `00218111111111111${Math.floor(Math.random() * 9)}`,
          clabe: `00218111111111111${Math.floor(Math.random() * 9)}`,
          holderName: 'PT145 Segundo',
          isVerified: false,
          isActive: true,
        },
      });

      await Promise.allSettled([verificacion.start(userId, a), verificacion.start(userId, b.id)]);

      const total = await prisma.accountVerification.count({
        where: { paymentMethodId: { in: [a, b.id] }, status: { in: ['PENDING', 'SENT'] } },
      });

      expect(total).toBe(2);
    });

    it('VER-02 (control): secuencialmente devuelve la MISMA, no una nueva', async () => {
      const { userId, metodoId } = await metodoConSaldo('idem');

      const primera = await verificacion.start(userId, metodoId);
      const segunda = await verificacion.start(userId, metodoId);

      // La idempotencia que ya existia no debe cambiar: este PT añade la red de debajo, no
      // sustituye la guarda.
      expect(segunda.id).toBe(primera.id);
    });
  });
});
