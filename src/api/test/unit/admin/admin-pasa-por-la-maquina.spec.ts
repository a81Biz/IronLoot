import { AuctionStateMachine, AuctionStatus } from '@ironloot/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-191 (AUD-011) — **El panel de administración pasa por la máquina de estados.**
 *
 * ## Lo que había
 *
 * `admin.service.ts` escribía `auction.status` a mano en **seis** operaciones —aprobar, rechazar, suspender,
 * cerrar a la fuerza, reabrir y cancelar— sin consultar `AuctionStateMachine`. Su única protección era
 * `assertAuctionModifiable`, que sólo bloquea `CLOSED` y `CANCELLED`; y `cancelAuction` **ni siquiera la
 * llamaba**.
 *
 * Es la forma exacta de **PT-173**, donde `shipments` escribía `order.status` por fuera: *dos puertas al mismo
 * estado y sólo una con cerradura*. Aquí son seis puertas.
 *
 * ## Y la máquina estaba INCOMPLETA, que es la mitad que no se ve
 *
 * Al medir qué rechazaría la máquina, aparecieron cuatro transiciones **legítimas que el mapa no tenía**:
 *
 * | Transición | Quién la usa | Por qué es legítima |
 * |---|---|---|
 * | `PENDING_MODERATION → DRAFT` | **rechazar** | Es el flujo central de moderación: devolver al vendedor |
 * | `PUBLISHED → SUSPENDED` | suspender | Un anuncio publicado que aún no ha arrancado se puede parar |
 * | `PUBLISHED → CLOSED` | cerrar a la fuerza | Cerrar algo que nunca llegó a estar activo. Queda sin ganador, que es correcto |
 * | `SUSPENDED → CANCELLED` | cancelar | Lo suspendido tiene que poder cancelarse |
 *
 * **Si sólo se hubiera cableado la máquina sin completarla, se habría roto la moderación.** Enforzar un mapa
 * incompleto no es enforzar el dominio: es enforzar un error de transcripción del dominio.
 *
 * ## Lo que la máquina SÍ debe rechazar, y ahora rechaza
 *
 * Aprobar o reabrir una subasta **`ACTIVE`** —ya está corriendo—, y cualquier cosa desde `CLOSED` o
 * `CANCELLED`, que son terminales. Antes se aplicaban en silencio.
 */
const RAIZ = raizDelMonorepo();
const ADMIN_SERVICE = join(RAIZ, 'src', 'api', 'src', 'modules', 'admin', 'admin.service.ts');

describe('El panel pasa por la maquina de estados — AUD-011 (PT-191)', () => {
  describe('C1: la maquina tiene las transiciones legitimas que el panel necesita', () => {
    const LEGITIMAS: Array<[AuctionStatus, AuctionStatus, string]> = [
      [AuctionStatus.PENDING_MODERATION, AuctionStatus.DRAFT, 'rechazar devuelve al vendedor'],
      [AuctionStatus.PUBLISHED, AuctionStatus.SUSPENDED, 'suspender antes de arrancar'],
      [AuctionStatus.PUBLISHED, AuctionStatus.CLOSED, 'cerrar a la fuerza sin ganador'],
      [AuctionStatus.SUSPENDED, AuctionStatus.CANCELLED, 'cancelar lo suspendido'],
    ];

    for (const [desde, hasta, porque] of LEGITIMAS) {
      it(`${desde} → ${hasta} (${porque})`, () => {
        expect(AuctionStateMachine.canTransition(desde, hasta)).toBe(true);
      });
    }
  });

  describe('C2: la maquina sigue rechazando lo imposible', () => {
    const IMPOSIBLES: Array<[AuctionStatus, AuctionStatus, string]> = [
      [AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED, 'aprobar algo que ya corre'],
      [AuctionStatus.CLOSED, AuctionStatus.PUBLISHED, 'resucitar una cerrada'],
      [AuctionStatus.CANCELLED, AuctionStatus.PUBLISHED, 'resucitar una cancelada'],
      [AuctionStatus.CLOSED, AuctionStatus.CANCELLED, 'cancelar una cerrada'],
      [AuctionStatus.DRAFT, AuctionStatus.SUSPENDED, 'suspender un borrador'],
    ];

    for (const [desde, hasta, porque] of IMPOSIBLES) {
      it(`${desde} → ${hasta} NO (${porque})`, () => {
        expect(AuctionStateMachine.canTransition(desde, hasta)).toBe(false);
      });
    }
  });

  it('C3: las seis operaciones del panel consultan la maquina', () => {
    // Se comprueba en el fichero y no por comportamiento porque lo que hay que impedir es que alguien **añada
    // una séptima** escribiendo el estado a mano. Un test de comportamiento sólo cubre las seis de hoy.
    const src = readFileSync(ADMIN_SERVICE, 'utf-8');

    for (const op of [
      'approveAuction',
      'rejectAuction',
      'suspendAuction',
      'forceCloseAuction',
      'reopenAuction',
      'cancelAuction',
    ]) {
      const i = src.indexOf(`async ${op}(`);
      expect(i).toBeGreaterThan(-1);

      // El cuerpo del método, hasta el siguiente `async `.
      const siguiente = src.indexOf('\n  async ', i + 1);
      const cuerpo = src.slice(i, siguiente > 0 ? siguiente : i + 1800);

      expect(cuerpo).toMatch(/transicionar|canTransition/);
    }
  });

  it('C4: ninguna operacion del panel escribe `status` sin pasar por la puerta unica', () => {
    // La puerta se llama `transicionar`. Si aparece un `data: { status:` fuera de ella, hay una séptima puerta.
    const src = readFileSync(ADMIN_SERVICE, 'utf-8');
    const sinComentarios = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');

    // **Sólo escrituras, y se distingue por línea.**
    //
    // Dos versiones anteriores fallaron, las dos por medir la forma en vez de la relación — el mismo defecto
    // que este PT corrige en el código:
    //
    //   1. Cogía cualquier `status: 'X'` y acusaba a `count({ where: { status: 'ACTIVE' } })`: **leer no es
    //      escribir**.
    //   2. Miraba hacia atrás el `data:` más cercano… y **`metadata:` contiene `data:`**, así que un
    //      `metadata:` anterior hacía pasar por escritura a un filtro.
    //
    // Se mira **la línea**: en este servicio los filtros se escriben en línea (`where: { status: 'X' }`) y las
    // escrituras van dentro de un `data: {` multilínea, así que la línea de una escritura nunca lleva `where:`.
    const lineas = sinComentarios.split('\n');
    const escrituras: Array<{ texto: string; linea: number }> = [];

    lineas.forEach((l, i) => {
      const m = /status:\s*'(DRAFT|PUBLISHED|ACTIVE|SUSPENDED|CLOSED|CANCELLED)'/.exec(l);
      if (!m) return;
      if (l.includes('where:')) return;
      // Y por si algún día un `where:` se parte en dos líneas.
      if ((lineas[i - 1] ?? '').includes('where:')) return;

      escrituras.push({ texto: m[0], linea: i + 1 });
    });

    // Lo que queda tiene que caer dentro de `transicionar`, el único sitio autorizado a escribir el estado.
    const lPuerta = lineas.findIndex((l) => l.includes('private async transicionar('));
    const lFin = lineas.findIndex((l, i) => i > lPuerta && /^ {2}async /.test(l));

    for (const e of escrituras) {
      const dentro = lPuerta > -1 && e.linea > lPuerta && (lFin < 0 || e.linea < lFin);
      expect({ ...e, dentroDeLaPuerta: dentro }).toEqual({ ...e, dentroDeLaPuerta: true });
    }
  });

  describe('casos de control', () => {
    it('AC-01: la maquina no se ha vuelto permisiva — sigue habiendo transiciones prohibidas', () => {
      // Una forma de «arreglar» esto seria permitirlo todo. Este caso lo impide.
      const todos = Object.values(AuctionStatus) as AuctionStatus[];
      const prohibidas = todos.flatMap((a) =>
        todos.filter((b) => a !== b && !AuctionStateMachine.canTransition(a, b)),
      );

      expect(prohibidas.length).toBeGreaterThan(15);
    });

    it('AC-02: los estados terminales siguen sin salida', () => {
      const todos = Object.values(AuctionStatus) as AuctionStatus[];

      for (const destino of todos) {
        expect(AuctionStateMachine.canTransition(AuctionStatus.CLOSED, destino)).toBe(false);
        expect(AuctionStateMachine.canTransition(AuctionStatus.CANCELLED, destino)).toBe(false);
      }
    });
  });
});
