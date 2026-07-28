import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuctionSchedulerService } from '../../src/modules/scheduler/auction-scheduler.service';

/**
 * PT-131 — Una subasta valida segun el contrato de HOY.
 *
 * Diez ficheros e2e construian su `CreateAuctionDto` a mano, cada uno con sus fechas. Todos
 * enviaban `startsAt` en el PASADO y duraciones de segundos:
 *
 *     startsAt: new Date(Date.now() - 1000 * 60)   // 1 minuto antes
 *     endsAt:   new Date(Date.now() + 1000 * 2)    // 2 segundos de duracion
 *
 * `CreateAuctionDto` exige desde hace tiempo **fecha de inicio futura** (`isFutureDate`) y
 * **duracion minima de 1 hora** (`isAfterStartDate`). Resultado: 400 en el `beforeAll` que monta el
 * escenario, y con el `beforeAll` roto se cae la suite entera. De ahi 42 fallos en 10 suites.
 *
 * Los specs se escribieron contra un contrato anterior y **nadie los ejecutaba**: el job de CI no
 * podia terminar (H-015), asi que llevaban el tiempo suficiente sin correr para que el contrato
 * cambiara debajo de ellos. Un mecanismo que no se ejecuta no avisa de nada; se pudre en silencio.
 *
 * **Por que un helper y no diez parches**: corregidos uno a uno, el proximo cambio del DTO vuelve a
 * romper diez ficheros. Asi rompe uno — y `auction-helper.spec.ts` lo dice antes que ningun e2e.
 */
export interface OpcionesDeSubasta {
  title?: string;
  description?: string;
  startingPrice?: number;
  /** Duracion en horas. Minimo 1 — es lo que exige el DTO. */
  duracionHoras?: number;
  /** Minutos hasta el inicio. Debe ser > 0: el DTO rechaza fechas pasadas. */
  empiezaEnMinutos?: number;
}

export interface SubastaDto {
  title: string;
  description: string;
  startingPrice: number;
  startsAt: string;
  endsAt: string;
  images: string[];
}

/** Margen sobre el instante de creacion. Un `startsAt` justo en el borde puede quedar en el pasado
 *  entre que se construye el objeto y llega al validador. */
const MARGEN_MINUTOS = 2;

/** Lo que exige `CreateAuctionDto`: la duracion no puede bajar de una hora. */
export const DURACION_MINIMA_HORAS = 1;

export function subastaValida(o: OpcionesDeSubasta = {}): SubastaDto {
  const empiezaEn = o.empiezaEnMinutos ?? MARGEN_MINUTOS;
  const duracion = Math.max(o.duracionHoras ?? DURACION_MINIMA_HORAS, DURACION_MINIMA_HORAS);

  const startsAt = new Date(Date.now() + empiezaEn * 60_000);
  const endsAt = new Date(startsAt.getTime() + duracion * 3_600_000);

  return {
    title: o.title ?? 'Subasta de prueba',
    description: o.description ?? 'Descripcion de prueba',
    startingPrice: o.startingPrice ?? 100,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    images: [],
  };
}

/**
 * Adelanta en la base el final de una subasta para que el cron pueda cerrarla dentro del test.
 *
 * **Se salta la validacion a proposito, y por eso lleva esta nota.** El DTO exige una hora de
 * duracion; varios escenarios necesitan que la subasta CIERRE para probar el pedido, el envio o la
 * valoracion. Tres salidas se consideraron (PT-131, decision D5):
 *
 *   (a) crear por la via publica —validaciones incluidas— y adelantar `endsAt` DESPUES.   <- esta
 *   (b) hacer configurable la duracion minima y bajarla en `NODE_ENV=test`.
 *   (c) exponer un endpoint de cierre forzado solo en test.
 *
 * (b) relaja una regla de dominio por entorno, y una regla relajada por entorno acaba relajada
 * donde no debe. (c) anade superficie que alguien acabara alcanzando. (a) es la unica que no toca
 * el producto: la subasta se crea pasando por el validador de verdad, y solo despues se mueve el
 * reloj.
 */
export async function adelantarCierre(
  prisma: PrismaClient,
  auctionId: string,
  segundosEnElPasado = 1,
): Promise<void> {
  await prisma.auction.update({
    where: { id: auctionId },
    data: { endsAt: new Date(Date.now() - segundosEnElPasado * 1000) },
  });
}

/**
 * Retrasa en la base el inicio de una subasta ya publicada, para que este **en curso**.
 *
 * Misma tension que `adelantarCierre`, y misma salida. Casi todos los escenarios e2e —pujar,
 * cerrar, pedir, enviar, valorar— necesitan una subasta ACTIVA, y el DTO prohibe crearla con
 * `startsAt` en el pasado. Los specs viejos lo hacian igualmente, y por eso empezaron a devolver
 * 400 el dia que se añadio `isFutureDate`.
 *
 * Se crea por la via publica —pasando por el validador de verdad— y solo despues se mueve el reloj.
 * La alternativa era relajar la regla de dominio en `NODE_ENV=test`, y una regla relajada por
 * entorno acaba relajada donde no debe.
 */
export async function ponerEnCurso(
  prisma: PrismaClient,
  auctionId: string,
  minutosEnElPasado = 1,
): Promise<void> {
  await prisma.auction.update({
    where: { id: auctionId },
    data: { startsAt: new Date(Date.now() - minutosEnElPasado * 60_000) },
  });
}

/**
 * Cierra una subasta de verdad y devuelve el pedido que genera el cierre.
 *
 * **`POST /api/v1/orders` ya no existe.** `OrdersController` solo expone `@Get()` y `@Get(':id')`:
 * los pedidos los crea el cierre de la subasta (`auction-scheduler.service.ts:146`), no una
 * peticion del comprador. Media docena de specs seguian creandolos a mano y recibian 404.
 *
 * Es la capa mas gorda del sedimento de PT-131, y la mas informativa: no es que el spec enviara un
 * dato mal, es que probaba **un flujo que el producto ya no tiene**. El pedido dejo de ser algo que
 * el ganador pide y paso a ser algo que el sistema produce.
 *
 * Aqui se hace lo que hace el sistema: se adelanta el final y se invoca el cierre. No se simula el
 * resultado — se ejecuta el cierre real, con su transaccion, sus fondos y sus avisos.
 */
export async function cerrarYObtenerPedido(
  app: INestApplication,
  prisma: PrismaClient,
  auctionId: string,
): Promise<{ id: string; totalAmount: unknown; buyerId: string; sellerId: string } | null> {
  await adelantarCierre(prisma, auctionId);

  // El cron corre cada minuto; en un test se invoca directamente para no esperarlo.
  await app.get(AuctionSchedulerService).closeExpiredAuctions();

  return prisma.order.findUnique({ where: { auctionId } }) as never;
}
