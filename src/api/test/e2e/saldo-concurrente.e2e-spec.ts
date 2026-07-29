import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { WalletService } from '../../src/modules/wallet/wallet.service';

/**
 * PT-146 — Leer un saldo, sumarle y escribirlo no es atomico.
 *
 * Lo destapo la prueba concurrente de PT-142 al desaparecer el `P2002` que lo tapaba:
 *
 *     2 depositos simultaneos de 100 y 250
 *       estados:  fulfilled | fulfilled      <- ninguno falla
 *       esperado: 350
 *       real:     250   (y 100 en otra corrida)
 *
 * **Es peor que lo que arreglo PT-142.** Aquello fallaba ruidosamente —P2002, el ciclo se reabre,
 * PT-087 reintenta y el dinero llega—. Esto devuelve 200 y deja algo peor que un saldo equivocado:
 * deja **el asiento del perdedor escrito en `ledger`** con un `balanceAfter` que no coincide con el
 * saldo real. La contabilidad se contradice a si misma, y solo se ve sumando el ledger.
 *
 * `Payment.reference @unique` no protege: impide acreditar EL MISMO pago dos veces, y aqui son dos
 * pagos distintos llegando a la vez — un webhook y la via garantizada del cron, por ejemplo.
 */
describe('Saldo bajo concurrencia (PT-146)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let wallet: WalletService;

  const SIMULTANEAS = 6;
  const IMPORTE = 100;

  const usuariosCreados: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    wallet = app.get(WalletService);
  });

  afterAll(async () => {
    // Acotado a lo propio, en orden de dependencias (RULE-23).
    for (const id of usuariosCreados) {
      const w = await prisma.wallet.findUnique({ where: { userId: id } });
      if (w) await prisma.ledger.deleteMany({ where: { walletId: w.id } });
      await prisma.wallet.deleteMany({ where: { userId: id } });
      await prisma.user.deleteMany({ where: { id } });
    }
    await app?.close();
  });

  async function usuarioConMonedero(sufijo: string): Promise<string> {
    const t = Date.now();
    const user = await prisma.user.create({
      data: {
        email: `pt146-${sufijo}-${t}@ironloot.test`,
        username: `pt146-${sufijo}-${t}`,
        passwordHash: 'no-se-usa',
      },
    });
    usuariosCreados.push(user.id);
    await wallet.getWallet(user.id);
    return user.id;
  }

  /**
   * La invariante contable: lo que dice el ledger y lo que dice el saldo tienen que ser lo mismo.
   *
   * Se acota a los asientos que mueven `balance`. `pendingBalance` (PT-071) vive fuera y tiene su
   * propio ciclo —entra al cerrar una subasta y sale al liberarse—, asi que meterlo en la misma suma
   * daria una invariante que falla por diseño. Una invariante mal escrita es peor que ninguna:
   * enseña a ignorarla.
   */
  async function invarianteContable(userId: string): Promise<{ ledger: number; saldo: number }> {
    const w = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const asientos = await prisma.ledger.findMany({
      where: { walletId: w.id, type: { in: ['DEPOSIT'] } },
    });

    return {
      ledger: asientos.reduce((a, l) => a + Number(l.amount), 0),
      saldo: Number(w.balance),
    };
  }

  it('CC-01: N acreditaciones simultaneas dejan el saldo en la SUMA, no en una de ellas', async () => {
    const userId = await usuarioConMonedero('rafaga');
    const t = Date.now();

    const resultados = await Promise.allSettled(
      Array.from({ length: SIMULTANEAS }, (_, i) =>
        wallet.deposit(userId, IMPORTE, `pt146-${t}-${i}`),
      ),
    );

    const fallos = resultados.filter((r) => r.status === 'rejected');
    // Que ninguna falle es parte del defecto: si fallaran, PT-087 reintentaria y el dinero llegaria.
    expect(fallos.map((f) => String((f as PromiseRejectedResult).reason))).toEqual([]);

    const w = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(Number(w.balance)).toBe(SIMULTANEAS * IMPORTE);
  });

  it('INV-01: tras la rafaga, el ledger y el saldo cuentan lo mismo', async () => {
    const userId = await usuarioConMonedero('invariante');
    const t = Date.now();

    await Promise.allSettled(
      Array.from({ length: SIMULTANEAS }, (_, i) =>
        wallet.deposit(userId, IMPORTE, `pt146-inv-${t}-${i}`),
      ),
    );

    const { ledger, saldo } = await invarianteContable(userId);

    // Esta es la mitad que de verdad preocupa. El asiento del perdedor SE ESCRIBE, con un
    // `balanceAfter` que no coincide con el saldo: no es que falte dinero, es que el registro de
    // auditoria dice una cosa y la fila del monedero dice otra.
    expect(saldo).toBe(ledger);
  });

  it('AC-03 (control): secuencialmente el saldo es exacto, con el codigo de antes y con el de ahora', async () => {
    // Sin este caso, un fallo de los de arriba podria achacarse a cualquier detalle del entorno en
    // vez de a la concurrencia, que es lo unico que los distingue.
    const userId = await usuarioConMonedero('secuencial');
    const t = Date.now();

    for (let i = 0; i < 3; i++) {
      await wallet.deposit(userId, IMPORTE, `pt146-seq-${t}-${i}`);
    }

    const w = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(Number(w.balance)).toBe(3 * IMPORTE);
  });

  it('BLQ-03: dos capturas CRUZADAS a la vez no se interbloquean', async () => {
    // `captureHeldFunds` bloquea DOS monederos. Si dos transacciones los pidieran en orden
    // distinto, se quedarian esperandose para siempre: cada una con el cerrojo que la otra
    // necesita. `bloquearDosMonederos()` los ordena por `userId`, de modo que todas piden en la
    // misma secuencia y el ciclo no puede formarse.
    //
    // Esta prueba existe porque «deberia impedirlo» no es un criterio. Un interbloqueo no aparece
    // en desarrollo: aparece en produccion, de noche, como peticiones colgadas.
    const a = await usuarioConMonedero('cruzado-a');
    const b = await usuarioConMonedero('cruzado-b');
    const t = Date.now();

    // Los dos necesitan saldo retenido para poder capturar.
    await wallet.deposit(a, 1000, `pt146-x-a-${t}`);
    await wallet.deposit(b, 1000, `pt146-x-b-${t}`);
    await wallet.holdFunds(a, 100, `pt146-hold-a-${t}`, 'cruzado');
    await wallet.holdFunds(b, 100, `pt146-hold-b-${t}`, 'cruzado');

    // A paga a B **y** B paga a A, simultaneamente: el orden natural de bloqueo es opuesto.
    const cruzadas = Promise.all([
      wallet.captureHeldFunds(a, b, 100, `pt146-cap-ab-${t}`, 'A paga a B'),
      wallet.captureHeldFunds(b, a, 100, `pt146-cap-ba-${t}`, 'B paga a A'),
    ]);

    // Si hubiera interbloqueo, esto no resolveria nunca; Postgres lo cortaria por deteccion
    // de deadlock y una de las dos lanzaria. Cualquiera de los dos desenlaces es un fallo.
    await expect(cruzadas).resolves.toBeDefined();
  }, 30000);

  it('BLQ-02: dos monederos DISTINTOS no se esperan entre si', async () => {
    // Un bloqueo global tambien haria pasar CC-01, y seria el remedio caro. Esta prueba es la que
    // distingue «serializa lo que se pisa» de «serializa todo».
    const a = await usuarioConMonedero('paralelo-a');
    const b = await usuarioConMonedero('paralelo-b');
    const t = Date.now();

    const inicio = Date.now();
    await Promise.all([
      wallet.deposit(a, IMPORTE, `pt146-par-a-${t}`),
      wallet.deposit(b, IMPORTE, `pt146-par-b-${t}`),
    ]);
    const duracion = Date.now() - inicio;

    const wa = await prisma.wallet.findUniqueOrThrow({ where: { userId: a } });
    const wb = await prisma.wallet.findUniqueOrThrow({ where: { userId: b } });
    expect(Number(wa.balance)).toBe(IMPORTE);
    expect(Number(wb.balance)).toBe(IMPORTE);

    // Umbral generoso a proposito: lo que se quiere detectar es un bloqueo GLOBAL, que serializaria
    // operaciones de usuarios sin relacion. No es una prueba de rendimiento.
    expect(duracion).toBeLessThan(5000);
  });
});
