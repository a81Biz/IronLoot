import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuctionSchedulerService } from '@/modules/scheduler/auction-scheduler.service';
import { PrismaService } from '@/database/prisma.service';
import { WalletService } from '@/modules/wallet/wallet.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { DistributedLockService } from '@/common/redis/distributed-lock.service';
import { SystemConfigService } from '@/modules/system-config/system-config.service';
import { CommissionsService } from '@/modules/commissions/commissions.service';
import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-174 — La liberación del holdback cuenta desde la CONFIRMACIÓN del comprador.
 *
 * ## Qué había
 *
 * `releaseMaturedSettlements` liberaba con `{ status: OrderStatus.DELIVERED }`: **en cuanto el pedido
 * estaba entregado**. Y hasta PT-174 el único que podía marcarlo entregado era **el vendedor**, así que
 * el vendedor liberaba su propio holdback marcando su propio envío. El holdback protege al comprador
 * durante la ventana de disputa, y lo desactivaba la parte de la que protege.
 *
 * ## Qué hay ahora — opción B, 72 h
 *
 * Decisión de negocio del humano (`changes/PT-174-…/design.md`). Se libera si:
 *
 *   - `shipment.deliveredAt <= ahora − SETTLEMENT_HOLDBACK_HOURS` (72 h por defecto), **o**
 *   - `order.createdAt <= ahora − DISPUTE_WINDOW_DAYS` (14 d) — **el vencimiento**.
 *
 * El vencimiento no es un detalle: es **la mentira simétrica**. Un comprador que nunca confirma no puede
 * retener el dinero del vendedor para siempre. Antes existía por accidente —era el otro brazo del `OR`—;
 * ahora es una regla con su prueba.
 *
 * ## Y se lee de `deliveredAt`, no de `updatedAt`
 *
 * Es la lección de **H-011**, que medía la ventana de disputa desde la última modificación del pedido en
 * vez de desde la entrega. El reloj cuelga del hecho, no de la última vez que alguien tocó la fila.
 *
 * ## Nota sobre la cobertura previa
 *
 * Este cron **no tenía ninguna prueba** antes de PT-174: mueve dinero de `pending_balance` a `balance` y
 * nadie lo vigilaba. Es la primera.
 */
/**
 * Raíz del monorepo. **No se cuentan `..` a mano**: dentro del contenedor el API se monta en `/app`, así
 * que subir cinco niveles daba `/docker-compose.yml` y el caso fallaba por no encontrar el fichero —
 * exactamente el modo en que una guarda se vuelve inútil sin dejar de existir. `raizDelMonorepo()` busca
 * la marca del repositorio, y es lo que usan las demás guardas que leen ficheros de la raíz.
 */
const RAIZ = raizDelMonorepo();

describe('releaseMaturedSettlements — la espera cuelga de la confirmación (PT-174)', () => {
  let service: AuctionSchedulerService;

  const mockPrismaService = {
    auction: { findMany: jest.fn(), updateMany: jest.fn() },
    bid: { groupBy: jest.fn() },
    order: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockWalletService = { releaseSettlement: jest.fn().mockResolvedValue(undefined) };

  const providers = [
    AuctionSchedulerService,
    { provide: PrismaService, useValue: mockPrismaService },
    { provide: WalletService, useValue: mockWalletService },
    { provide: NotificationsService, useValue: { create: jest.fn() } },
    {
      provide: DistributedLockService,
      useValue: { acquireLock: jest.fn().mockResolvedValue('t'), releaseLock: jest.fn() },
    },
    { provide: SystemConfigService, useValue: { getNumber: jest.fn().mockResolvedValue(120) } },
    { provide: CommissionsService, useValue: { registrarComision: jest.fn() } },
    { provide: EventEmitter2, useValue: { emit: jest.fn() } },
  ];

  // **La prueba no depende del entorno ambiente, y eso hay que forzarlo.**
  //
  // `docker-compose` fija `SETTLEMENT_HOLDBACK_HOURS=0` para que la fase 35 de QA no espere tres días.
  // Con eso, un caso que comprueba «el valor por defecto son 72 h» leía el 0 del contenedor y fallaba —
  // no por un defecto del código, sino porque la prueba heredaba la configuración de al lado.
  //
  // Una prueba que cambia de resultado según dónde corra no mide lo que cree medir. Se limpia la
  // variable antes de cada caso y se restaura al final: cada uno declara el valor que necesita.
  const envOriginal = process.env.SETTLEMENT_HOLDBACK_HOURS;

  beforeEach(async () => {
    delete process.env.SETTLEMENT_HOLDBACK_HOURS;
    const module: TestingModule = await Test.createTestingModule({ providers }).compile();
    service = module.get(AuctionSchedulerService);
    jest.clearAllMocks();
    mockPrismaService.order.findMany.mockResolvedValue([]);
    mockPrismaService.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      cb(mockPrismaService),
    );
  });

  afterAll(() => {
    if (envOriginal === undefined) delete process.env.SETTLEMENT_HOLDBACK_HOURS;
    else process.env.SETTLEMENT_HOLDBACK_HOURS = envOriginal;
  });

  /** El `where` con el que el cron elige qué liberar. Es donde vive la regla. */
  const whereDeLaConsulta = () => mockPrismaService.order.findMany.mock.calls[0][0].where;

  it('C1: NO libera por el estado del pedido — libera por tiempo', async () => {
    // El defecto: `{ status: DELIVERED }` liberaba en cuanto se marcaba entregado.
    await service.releaseMaturedSettlements();

    const where = whereDeLaConsulta();
    const ramas = JSON.stringify(where.OR);

    expect(ramas).not.toContain('DELIVERED');
  });

  it('C2: una rama cuelga de `shipment.deliveredAt`, no de `updatedAt`', async () => {
    // Leccion de H-011: el reloj cuelga del hecho (la entrega), no de la ultima modificacion.
    await service.releaseMaturedSettlements();

    const where = whereDeLaConsulta();
    const porEntrega = where.OR.find((r: Record<string, unknown>) => 'shipment' in r);

    expect(porEntrega).toBeDefined();
    expect(porEntrega.shipment.deliveredAt.lte).toBeInstanceOf(Date);
  });

  it('C3: el corte por confirmación son 72 h por defecto', async () => {
    const antes = Date.now();
    await service.releaseMaturedSettlements();

    const corte = whereDeLaConsulta().OR.find((r: Record<string, unknown>) => 'shipment' in r)
      .shipment.deliveredAt.lte;
    const horas = (antes - corte.getTime()) / 3_600_000;

    expect(horas).toBeGreaterThan(71.9);
    expect(horas).toBeLessThan(72.1);
  });

  it('C4: el VENCIMIENTO se conserva — un comprador que calla no retiene el dinero', async () => {
    // La mentira simetrica. Sin esta rama, negar la recepcion bloquearia al vendedor para siempre.
    await service.releaseMaturedSettlements();

    const porVencimiento = whereDeLaConsulta().OR.find(
      (r: Record<string, unknown>) => 'createdAt' in r,
    );

    expect(porVencimiento).toBeDefined();
    const dias = (Date.now() - porVencimiento.createdAt.lte.getTime()) / 86_400_000;
    expect(dias).toBeGreaterThan(13.9);
    expect(dias).toBeLessThan(14.1);
  });

  it('C5: sólo mira lo no liquidado — la idempotencia sigue en `sellerSettledAt`', async () => {
    await service.releaseMaturedSettlements();

    expect(whereDeLaConsulta().sellerSettledAt).toBeNull();
  });

  it('C6: libera de verdad lo que la consulta devuelve, y marca el pedido', async () => {
    mockPrismaService.order.findMany.mockResolvedValue([
      { id: 'order-1', sellerId: 'seller-1', sellerNet: 855 },
    ]);

    await service.releaseMaturedSettlements();

    expect(mockWalletService.releaseSettlement).toHaveBeenCalledWith(
      'seller-1',
      855,
      'order-1',
      expect.anything(),
    );
    expect(mockPrismaService.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({ sellerSettledAt: expect.any(Date) }),
      }),
    );
  });

  describe('casos de control', () => {
    it('AC-01: `SETTLEMENT_HOLDBACK_HOURS=0` libera en el primer tic', async () => {
      // Es lo que permite que la fase 35 de QA no espere 72 h — **configurando, no falseando**. La
      // diferencia con el `UPDATE` a la base que hace hoy `60-withdrawal.js`.
      //
      // QA **declara** este 0 en su `.env`; ya no lo hereda de la reserva del compose, que desde PT-182
      // es 72 (ver C7 — la reserva no puede ser el valor desprotegido).
      process.env.SETTLEMENT_HOLDBACK_HOURS = '0';

      await service.releaseMaturedSettlements();

      const corte = whereDeLaConsulta().OR.find((r: Record<string, unknown>) => 'shipment' in r)
        .shipment.deliveredAt.lte;

      expect(Math.abs(Date.now() - corte.getTime())).toBeLessThan(2_000);
    });

    it('C7: la reserva de `docker-compose` NO es el valor desprotegido', () => {
      // PT-182. La sustitución estuvo en `:-0` unas horas, y era la misma familia que H-029 y H-030: un
      // control que aparenta estar puesto y no lo está. Un despliegue que no declarase la variable
      // liberaba el neto **al instante** de la confirmación —sin ventana para el comprador— y nada lo
      // habría dicho: el cron corre, los asientos cuadran, la espera simplemente no existe.
      //
      // Se comprueba el `docker-compose.yml` y no el servicio a propósito: el servicio ya tiene su
      // reserva de 72 (C3) y nunca la vio nadie fallar, porque el compose **siempre** le pasaba un valor.
      // El agujero vivía en el sitio que este caso mira.
      const compose = readFileSync(join(RAIZ, 'docker-compose.yml'), 'utf-8');
      const linea = compose
        .split(/\r?\n/)
        .find((l: string) => l.includes('SETTLEMENT_HOLDBACK_HOURS=${'));

      expect(linea).toBeDefined();

      const reserva = /:-(\d+)\}/.exec(String(linea))?.[1];

      expect(reserva).toBeDefined();
      expect(Number(reserva)).toBeGreaterThan(0);
    });

    it('AC-02: sin pedidos maduros no se libera nada', async () => {
      await service.releaseMaturedSettlements();

      expect(mockWalletService.releaseSettlement).not.toHaveBeenCalled();
    });

    it('AC-03: un fallo al liberar un pedido no impide liberar los demás', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        { id: 'malo', sellerId: 's1', sellerNet: 10 },
        { id: 'bueno', sellerId: 's2', sellerNet: 20 },
      ]);
      mockWalletService.releaseSettlement.mockRejectedValueOnce(new Error('boom'));

      await service.releaseMaturedSettlements();

      // El segundo se intenta igual: un pedido roto no puede dejar sin cobrar a los demas vendedores.
      expect(mockWalletService.releaseSettlement).toHaveBeenCalledTimes(2);
    });
  });
});
