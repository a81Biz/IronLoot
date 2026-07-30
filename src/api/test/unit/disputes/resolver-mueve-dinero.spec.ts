import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@prisma/client/runtime/library';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AdminService } from '@/modules/admin/admin.service';
import { RefundsService } from '@/modules/refunds/refunds.service';
import { WalletService } from '@/modules/wallet/wallet.service';
import { AuctionSchedulerService } from '@/modules/scheduler/auction-scheduler.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { DistributedLockService } from '@/common/redis/distributed-lock.service';
import { SystemConfigService } from '@/modules/system-config/system-config.service';
import { CommissionsService } from '@/modules/commissions/commissions.service';
import { PrismaService } from '@/database/prisma.service';
import { StructuredLogger } from '@/common/observability';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-191 (AUD-010) — **Resolver una disputa a favor del comprador mueve dinero, y el dinero sale de
 * algún sitio.**
 *
 * ## El hallazgo, y por qué era tres veces más grande de lo que decía
 *
 * El enunciado era: *«resolver una disputa no mueve dinero: devuelve `note: 'Initiate refund via POST
 * /admin/refunds'`»*. Suena a un cable que falta. Medido, eran **tres defectos encadenados**, y el
 * tercero es el que no se ve:
 *
 * ### D-1 — La resolución no pagaba, y nada obligaba al segundo paso
 *
 * `resolveDisputeFavorBuyer` ponía la disputa en `RESOLVED`, escribía la traza de administración y
 * devolvía una **nota de texto** pidiendo que alguien, después, llamara a otro endpoint. Para el
 * comprador y para el panel la disputa quedaba **resuelta a su favor**; el dinero dependía de que un
 * humano leyera la nota y no se distrajera. Es la familia de H-029 y H-030 otra vez: **un control que
 * aparenta funcionar**.
 *
 * ### D-2 — El holdback se liberaba aunque hubiera una disputa abierta
 *
 * `releaseMaturedSettlements` filtraba por `sellerSettledAt: null` y por tiempo, y **no miraba las
 * disputas**. El holdback existe exactamente para proteger al comprador durante la ventana de disputa
 * (`PT-174`), y se soltaba con la disputa abierta encima de la mesa. La consecuencia práctica es la que
 * hace grave a D-3: cuando llegaba la resolución, el dinero **ya se había ido**.
 *
 * ### D-3 — Y cablear D-1 sin D-2 habría IMPRESO DINERO
 *
 * `createRefund` sólo **acredita al comprador**. No toca al vendedor. Enganchar la resolución a
 * `createRefund` sin más habría dado al comprador su importe **sin quitárselo a nadie**: dos monederos
 * con el mismo dinero y un ledger que no cuadra. Es el defecto más caro de los tres y **no estaba en el
 * enunciado del hallazgo** — sale de preguntar *de dónde sale el dinero*, que es la pregunta que A3
 * (trazabilidad inversa) obliga a hacer.
 *
 * ### Y de paso: `createRefund` era una octava vía al saldo, fuera de `WalletService`
 *
 * Hacía `findUnique` + `update({ balance: { increment } })` **sin `FOR UPDATE`** — el defecto que
 * `PT-146` (RULE-24) corrigió en siete caminos, todos dentro de `WalletService`. Éste está fuera y por
 * eso no se vio. Peor: `if (buyerWallet)` — **un comprador sin monedero dejaba el pedido `REFUNDED` y no
 * cobraba nada**, en silencio, que es justo lo que `asegurarMonedero()` (RULE-22) existe para impedir.
 *
 * ## Lo que hay ahora
 *
 * `WalletService.reversarVenta()` — **una sola transacción** que bloquea los dos monederos en orden fijo,
 * toma del vendedor primero de `pendingBalance` (el holdback, que es para esto) y después de `balance`, y
 * acredita al comprador. Conserva el dinero: lo que entra a uno sale del otro.
 *
 * **El descubierto es una decisión declarada.** Si el vendedor ya retiró, se le deja el saldo en negativo
 * en vez de negar el reembolso: el derecho del comprador no depende de la solvencia del vendedor, y negar
 * el pago premiaría a quien retire rápido. Queda como deuda, con su asiento, y el vendedor no puede
 * retirar hasta cubrirla.
 */
const RAIZ = raizDelMonorepo();
const REFUNDS_SERVICE = join(RAIZ, 'src', 'api', 'src', 'modules', 'refunds', 'refunds.service.ts');

describe('Resolver una disputa mueve dinero — AUD-010 (PT-191)', () => {
  // ── D-1: la resolución paga ────────────────────────────────────────────────────────────────────
  describe('C1/AC-01: la resolución a favor del comprador reembolsa; la del vendedor no mueve nada', () => {
    let admin: AdminService;
    const createRefund = jest.fn().mockResolvedValue({ id: 'r-1' });
    const prisma = {
      dispute: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      adminAction: { create: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'd-1',
        status: 'OPEN',
        order: { id: 'o-1', totalAmount: new Decimal(500), buyerId: 'b-1', sellerId: 's-1' },
      });
      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          AdminService,
          { provide: PrismaService, useValue: prisma },
          { provide: RefundsService, useValue: { createRefund } },
        ],
      })
        .useMocker(() => ({}))
        .compile();
      admin = mod.get(AdminService);
    });

    it('C1: a favor del comprador se crea el reembolso por el importe del pedido', async () => {
      await admin.resolveDisputeFavorBuyer('d-1', 'no llegó', 'admin@x');

      expect(createRefund).toHaveBeenCalledTimes(1);
      const [orderId, amount] = createRefund.mock.calls[0];
      expect({ orderId, amount }).toEqual({ orderId: 'o-1', amount: 500 });
    });

    it('C1b: y ya no devuelve una nota pidiendo que alguien lo haga después', async () => {
      const r = await admin.resolveDisputeFavorBuyer('d-1', 'no llegó', 'admin@x');

      expect(JSON.stringify(r)).not.toMatch(/Initiate refund|POST \/admin\/refunds/i);
    });

    it('AC-01 (control): a favor del VENDEDOR no se mueve un peso', async () => {
      // El control importa: «arreglar» esto reembolsando siempre sería peor que no reembolsar nunca.
      await admin.resolveDisputeFavorSeller('d-1', 'entregado correctamente', 'admin@x');

      expect(createRefund).not.toHaveBeenCalled();
    });
  });

  // ── D-2: el holdback no se suelta con una disputa abierta ──────────────────────────────────────
  describe('C2/AC-02: el cron de liquidación respeta las disputas abiertas', () => {
    let scheduler: AuctionSchedulerService;
    const prisma = {
      auction: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
      bid: { groupBy: jest.fn() },
      order: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      $transaction: jest.fn(),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      prisma.order.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          AuctionSchedulerService,
          { provide: PrismaService, useValue: prisma },
          { provide: WalletService, useValue: { releaseSettlement: jest.fn() } },
          { provide: NotificationsService, useValue: { create: jest.fn() } },
          {
            provide: DistributedLockService,
            useValue: { acquireLock: jest.fn().mockResolvedValue('t'), releaseLock: jest.fn() },
          },
          { provide: SystemConfigService, useValue: { getNumber: jest.fn() } },
          { provide: CommissionsService, useValue: { registrarComision: jest.fn() } },
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        ],
      }).compile();
      scheduler = mod.get(AuctionSchedulerService);
    });

    it('C2: la consulta excluye los pedidos con una disputa viva', async () => {
      // El holdback protege al comprador durante la ventana de disputa. Soltarlo con la disputa
      // abierta es desactivar la protección justo cuando se está usando.
      await scheduler.releaseMaturedSettlements();

      const where = prisma.order.findMany.mock.calls[0][0].where;
      const texto = JSON.stringify(where);

      expect(texto).toMatch(/dispute/i);
      expect(texto).toMatch(/OPEN/);
      expect(texto).toMatch(/IN_MEDIATION/);
    });

    it('AC-02 (control): sigue habiendo las dos vías de maduración de PT-174', async () => {
      // Una forma de «arreglar» C2 sería endurecer el filtro hasta que no libere nunca. Este caso lo
      // impide: las dos ramas de PT-174 —confirmación + 72 h, y el vencimiento a los 14 días— siguen
      // ahí, y siguen siendo un `OR`.
      await scheduler.releaseMaturedSettlements();

      const where = prisma.order.findMany.mock.calls[0][0].where;
      const or = (where.OR ?? where.AND?.flatMap((c: any) => c.OR ?? [])) as any[];

      expect(or).toHaveLength(2);
      expect(or.some((r) => 'shipment' in r)).toBe(true);
      expect(or.some((r) => 'createdAt' in r)).toBe(true);
    });
  });

  // ── D-3: el dinero se conserva ─────────────────────────────────────────────────────────────────
  describe('C3/C4/AC-03: `reversarVenta` conserva el dinero', () => {
    let wallet: WalletService;
    let tx: any;
    const bloqueos: string[] = [];
    const asientos: any[] = [];
    const escrituras: any[] = [];

    /** Monederos en memoria: `reversarVenta` los lee con `findUnique` tras bloquear. */
    let monederos: Record<string, any>;

    beforeEach(async () => {
      jest.clearAllMocks();
      bloqueos.length = 0;
      asientos.length = 0;
      escrituras.length = 0;
      monederos = {
        'b-1': {
          id: 'w-b',
          userId: 'b-1',
          balance: new Decimal(0),
          pendingBalance: new Decimal(0),
        },
        's-1': {
          id: 'w-s',
          userId: 's-1',
          balance: new Decimal(0),
          pendingBalance: new Decimal(450),
        },
      };
      tx = {
        // `$queryRaw` es el `SELECT … FOR UPDATE`. Se anota el orden en que se piden los cerrojos.
        $queryRaw: jest.fn((_s: TemplateStringsArray, userId: string) => {
          bloqueos.push(userId);
          return Promise.resolve([{ id: monederos[userId]?.id }]);
        }),
        wallet: {
          findUnique: jest.fn(({ where }: any) =>
            Promise.resolve(
              monederos[where.userId] ??
                Object.values(monederos).find((m: any) => m.id === where.id) ??
                null,
            ),
          ),
          update: jest.fn((args: any) => {
            escrituras.push(args);
            return Promise.resolve({});
          }),
        },
        ledger: {
          create: jest.fn((args: any) => {
            asientos.push(args.data);
            return Promise.resolve({});
          }),
        },
      };
      const prisma = {
        ...tx,
        $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)),
        wallet: {
          ...tx.wallet,
          // `asegurarMonedero()` (RULE-22) corre FUERA de la transacción: es su punto entero.
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUniqueOrThrow: jest.fn(({ where }: any) => Promise.resolve(monederos[where.userId])),
        },
      };
      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          WalletService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: StructuredLogger,
            useValue: {
              child: () => ({
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn(),
              }),
            },
          },
        ],
      })
        .useMocker(() => ({}))
        .compile();
      wallet = mod.get(WalletService);
    });

    const sumaPorTipo = (tipo: string) =>
      asientos.filter((a) => a.type === tipo).reduce((s, a) => s + Number(a.amount), 0);

    it('C3: lo que se acredita al comprador sale del vendedor — el dinero se conserva', async () => {
      await wallet.reversarVenta('b-1', 's-1', 450, 'o-1');

      // Un asiento de reembolso al comprador y un cargo al vendedor, por el mismo importe.
      expect(sumaPorTipo('REFUND')).toBe(450);
      expect(sumaPorTipo('ADJUSTMENT')).toBe(450);
    });

    it('C3b: se toma primero del holdback, que es exactamente para lo que existe', async () => {
      const r = await wallet.reversarVenta('b-1', 's-1', 450, 'o-1');

      expect(r).toEqual({ tomadoDeRetenido: 450, tomadoDeDisponible: 0, descubierto: 0 });
    });

    it('C4: si el vendedor ya retiro, el comprador cobra igual y queda un descubierto', async () => {
      // El derecho del comprador no depende de la solvencia del vendedor. Negar el reembolso
      // premiaria a quien retire rapido.
      monederos['s-1'].pendingBalance = new Decimal(0);
      monederos['s-1'].balance = new Decimal(100);

      const r = await wallet.reversarVenta('b-1', 's-1', 450, 'o-1');

      expect(r).toEqual({ tomadoDeRetenido: 0, tomadoDeDisponible: 100, descubierto: 350 });
      expect(sumaPorTipo('REFUND')).toBe(450); // el comprador cobra el importe entero
    });

    it('AC-03 (control): los dos monederos se bloquean, y en orden fijo por `userId`', async () => {
      // RULE-24. Sin orden fijo el interbloqueo no aparece en desarrollo: aparece en produccion.
      await wallet.reversarVenta('s-1', 'b-1', 10, 'o-1'); // se piden al reves a proposito

      expect(bloqueos).toEqual([...bloqueos].sort());
      expect(new Set(bloqueos)).toEqual(new Set(['b-1', 's-1']));
    });
  });

  // ── La octava vía al saldo, cerrada ────────────────────────────────────────────────────────────
  describe('C5/AC-04: `createRefund` ya no toca el saldo por su cuenta', () => {
    const fuente = () => readFileSync(REFUNDS_SERVICE, 'utf-8');
    const sinComentarios = () =>
      fuente()
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, ''))
        .join('\n');

    it('C5: no escribe `wallet.update` ni incrementa saldos a mano', () => {
      // Era la octava via al saldo, fuera de `WalletService` y por eso invisible a PT-146: leia con
      // `findUnique` y escribia con `increment`, sin `FOR UPDATE`. Ahora delega.
      const src = sinComentarios();

      expect(src).not.toMatch(/wallet\.update/);
      expect(src).not.toMatch(/balance:\s*\{\s*increment/);
    });

    it('C5b: delega en `WalletService`, que es donde viven el cerrojo y la creacion perezosa', () => {
      expect(sinComentarios()).toMatch(/walletService\.reversarVenta/);
    });

    it('AC-04 (control): el motivo queda escrito en el codigo, no solo aqui', () => {
      // Una guarda que sostiene sola la razon de un cambio se pierde en cuanto alguien lee el
      // servicio sin leer su prueba.
      expect(fuente()).toMatch(/AUD-010/);
    });
  });
});
