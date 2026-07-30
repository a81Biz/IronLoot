import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-191 (AUD-006) — **El canal público sólo difunde lo que el REST público ya sirve.**
 *
 * ## El hallazgo, y por qué la respuesta no es «autentícalo»
 *
 * AUD-006: *«el WebSocket no autentica el handshake: `handleConnection` sólo registra, y `joinAuction`
 * acepta cualquier UUID»*. Es cierto, y **es deliberado**: PT-039 lo declaró namespace público de sólo
 * lectura porque la puja en vivo tiene que verse **sin cuenta** en BASE. Exigir un JWT en el socket
 * apagaría el feed para los visitantes, que es a quienes está dirigido.
 *
 * El problema no era la decisión: era que la decisión estaba **escrita en un comentario y en ningún
 * sitio más**. «No difundimos datos privados» es una afirmación, y esta jornada ha ido encontrando
 * afirmaciones falsas con aval. Lo que faltaba es lo que hace esta guarda: **volverla comprobable**.
 *
 * ## Lo que se midió
 *
 * | Emisión | Carga | Veredicto |
 * |---|---|---|
 * | `emitNewBid` | `{ id, amount, createdAt }` | limpia — **la afirmación de PT-039 era cierta** |
 * | `emitAuctionExtended` | `{ newEndsAt }` | limpia |
 * | `emitAuctionEnded` | `{ winnerId, amount }` | **difunde un id de usuario, y no la llamaba nadie** |
 * | `EventsGateway.emitAuctionEvent` | `data` **libre** | **namespace entero sin un solo llamante** |
 *
 * Y para comparar, el REST **público** de al lado (`GET /auctions/:id/bids`, marcado `@Public()`) sirve
 * `bidder: { id, username, avatarUrl }`. Es decir: **el socket es más estricto que el REST que
 * refleja**, no menos. La invariante defendible no es «el socket no manda PII» —el REST sí la manda—
 * sino *lo que emite el socket ⊆ lo que el REST público ya da*, y eso se cumple con margen.
 *
 * ## Qué se retiró, y por qué no se «arregló»
 *
 * `emitAuctionEnded` y `EventsGateway` entero: **cero llamantes**, precedente ADR-047. Los dos eran
 * armas cargadas apuntando a este hallazgo — un segundo namespace público, con el mismo nombrado de
 * salas (`auction:${id}`) y un emisor **genérico** que acepta cualquier objeto. El día que alguien lo
 * usara para `emitAuctionEvent(id, 'order:paid', { buyerEmail })`, AUD-006 pasaría de superficie sin
 * autenticar a fuga real, y nada habría protestado.
 *
 * `emitAuctionEnded` no se conservó «por si acaso»: quien necesite anunciar el cierre lo escribirá a
 * propósito y chocará con `C2`, que es exactamente cuando conviene pararse a pensar.
 */
const RAIZ = raizDelMonorepo();
const API = join(RAIZ, 'src', 'api', 'src');
const GATEWAY = join(API, 'modules', 'auctions', 'auctions.gateway.ts');

/**
 * Campos que **no** pueden salir por un canal sin autenticar.
 *
 * No es una lista de «palabras feas»: es lo que identifica a una persona o describe su dinero, que es
 * lo que un espectador anónimo de una sala de subasta no tiene por qué recibir.
 */
const PROHIBIDOS = [
  'bidderId',
  'buyerId',
  'sellerId',
  'winnerId',
  'userId',
  'email',
  'phone',
  'clabe',
  'balance',
  'heldFunds',
  'pendingBalance',
  'walletId',
  'token',
  'password',
];

/** Ficheros `.ts` de un árbol. */
function ficherosTs(raiz: string): string[] {
  const salida: string[] = [];
  const recorrer = (dir: string) => {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === 'dist') continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (e.endsWith('.ts')) salida.push(p);
    }
  };
  recorrer(raiz);
  return salida;
}

/** Fuente sin comentarios: una mención en prosa no es una emisión. */
function sinComentarios(ruta: string): string {
  return readFileSync(ruta, 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('El canal publico no difunde datos privados — AUD-006 (PT-191)', () => {
  it('C1: ninguna carga emitida por el gateway publico lleva un campo privado', () => {
    // Se mide la **llamada**, no el gateway: el payload lo construye quien emite, así que mirar sólo
    // `auctions.gateway.ts` dejaría fuera justo el sitio donde se decide qué viaja.
    const acusaciones: string[] = [];

    for (const f of ficherosTs(API)) {
      const src = sinComentarios(f);
      for (const m of src.matchAll(/emit(?:NewBid|AuctionExtended|AuctionEnded|AuctionEvent)\(/g)) {
        // La llamada completa: desde el paréntesis hasta que se equilibran.
        let i = m.index! + m[0].length - 1;
        let nivel = 0;
        const inicio = i;
        for (; i < src.length; i++) {
          if (src[i] === '(') nivel++;
          else if (src[i] === ')' && --nivel === 0) break;
        }
        const llamada = src.slice(inicio, i + 1);

        for (const campo of PROHIBIDOS) {
          if (new RegExp(`\\b${campo}\\b`).test(llamada)) {
            acusaciones.push(`${f.replace(API, 'api')} — ${campo} en ${m[0]}…)`);
          }
        }
      }
    }

    expect(acusaciones).toEqual([]);
  });

  it('C2: el gateway publico no ofrece un emisor generico ni difunde ganadores', () => {
    // Un emisor que acepta cualquier objeto convierte C1 en indecidible: el payload deja de estar en
    // el código y pasa a estar en quien llame. Por eso se retiraron los dos.
    const src = sinComentarios(GATEWAY);

    expect(src).not.toMatch(/emitAuctionEnded/);
    expect(src).not.toMatch(/emitAuctionEvent/);
  });

  it('C3: no queda un segundo namespace publico sin llamantes', () => {
    // `EventsGateway` duplicaba el nombrado de salas de `AuctionsGateway` sin que nadie lo usara.
    // Dos puertas públicas a la misma sala y sólo una vigilada es el patrón de PT-173 y de AUD-011.
    expect(existsSync(join(API, 'modules', 'notifications', 'events.gateway.ts'))).toBe(false);

    const modulo = sinComentarios(join(API, 'modules', 'notifications', 'notifications.module.ts'));
    expect(modulo).not.toMatch(/EventsGateway/);
  });

  it('C4: el namespace sigue siendo publico a proposito, y dice por que', () => {
    // El arreglo **no** puede ser autenticar el socket: eso apagaría la puja en vivo para los
    // visitantes de BASE, que es a quienes está dirigida. Este caso impide «arreglarlo» rompiéndolo.
    const bruto = readFileSync(GATEWAY, 'utf-8');

    expect(bruto).toMatch(/namespace: 'auctions'/);
    expect(bruto).toMatch(/AUD-006/);
  });

  describe('casos de control', () => {
    it('AC-01: la guarda ve un campo prohibido cuando lo hay', () => {
      // Sin esto, C1 estaría verde tanto si mide como si no encuentra ninguna llamada. Se le da una
      // llamada falsificada y tiene que reconocerla.
      const falsa = `this.auctionsGateway.emitNewBid(id, { amount: 1, bidderId: user.id });`;
      const encontrados = PROHIBIDOS.filter((c) => new RegExp(`\\b${c}\\b`).test(falsa));

      expect(encontrados).toEqual(['bidderId']);
    });

    it('AC-02: y NO acusa a los campos legitimos que hoy viajan', () => {
      // El otro sentido: una guarda que acusara `amount` o `createdAt` obligaría a vaciar el feed.
      const real = `this.auctionsGateway.emitNewBid(auctionId, { id: result.id, amount: Number(result.amount), createdAt: result.createdAt });`;
      const encontrados = PROHIBIDOS.filter((c) => new RegExp(`\\b${c}\\b`).test(real));

      expect(encontrados).toEqual([]);
    });

    it('AC-03: las emisiones que quedan siguen existiendo — no se cerro el canal', () => {
      // La forma perezosa de pasar C1 es dejar de emitir. La puja en vivo tiene que seguir saliendo.
      const src = sinComentarios(GATEWAY);

      expect(src).toMatch(/emitNewBid/);
      expect(src).toMatch(/emitAuctionExtended/);
    });
  });
});
