import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-191 (AUD-012) — **Lo que `@ironloot/core` exporta, alguien lo usa; y lo que no, está declarado.**
 *
 * ## El hallazgo decía una cosa y medía otra
 *
 * AUD-012: *«el VO `Money` existe en `core` y ningún servicio del API lo importa»*. Y de paso citaba
 * `ProcessRefundUseCase`, que **ya no existe**: PT-042 lo retiró junto a los otros tres casos de uso,
 * con esta razón escrita en `core/src/index.ts` — *«tested but never wired into the API»*.
 *
 * Al medir el conjunto en vez del símbolo, la forma real apareció: **30 de los 42 símbolos exportados
 * por `core` no tenían un solo consumidor fuera de `core`.** El hallazgo no era un descuido puntual;
 * era el 71 % de la librería. Es exactamente el motivo por el que revisar «qué falta» buscando el
 * síntoma nombrado nunca terminaba: **se contestaba el ejemplo en vez de la clase.**
 *
 * ## Por qué una exportación huérfana no es inofensiva
 *
 * Código muerto se ignora. Un **contrato** muerto no: se lee. Y aquí había dos que engañaban:
 *
 * - `core/integrations/payment-provider.interface.ts` declara `IPaymentProvider`… y el API declara el
 *   suyo, distinto, en `modules/payments/interfaces/`. Quien lea `core` para saber qué debe cumplir una
 *   pasarela obtiene una respuesta **que no se aplica en ninguna parte**, y que puede divergir sin que
 *   nada proteste.
 * - `core/domain/payment/ipn-validator.ts` implementaba el IPN de **PayPal** (`cmd=_notify-validate`,
 *   respuesta `VERIFIED`) — un protocolo que esta plataforma **no usa**: PayPal va por Orders v2 y el
 *   IPN vivo es el de Mercado Pago, que se confirma contra su API. No estaba muerto: **estaba
 *   mintiendo sobre un subsistema que mueve dinero.**
 *
 * Es la familia de H-016: *un documento sin citas se lee con desconfianza; uno con citas rotas se lee
 * con confianza y es falso.* Un contrato sin implementadores es la versión ejecutable de eso.
 *
 * ## Qué hace esta guarda, y por qué el inventario está aquí dentro
 *
 * Comprueba que **todo símbolo exportado por `core` tiene al menos un consumidor fuera de `core`**, y
 * lo que no lo tiene está en `HUERFANOS_DECLARADOS` — una lista con fecha y motivo. La lista **no es
 * una excepción, es el pendiente hecho visible**: mientras un símbolo esté ahí, alguien decidió
 * conservarlo y escribió por qué. Lo que la guarda impide es que **crezca**: un símbolo huérfano nuevo
 * rompe la prueba, y retirar uno de la lista sin borrarlo también (`AC-02`), para que la lista no se
 * quede describiendo un pasado.
 *
 * Los 25 que quedan son las **puertas de la arquitectura hexagonal** (`contracts/`, `integrations/`) y
 * cuatro eventos que nadie emite. Retirarlos es abandonar formalmente ese diseño, y **eso es una ADR,
 * no un borrado al final de una sesión**: queda como `TD-024` con la cifra medida, para que se decida
 * con números y no con una impresión.
 */
const RAIZ = raizDelMonorepo();
const CORE = join(RAIZ, 'src', 'packages', 'core', 'src');
const CONSUMIDORES = [
  join(RAIZ, 'src', 'api', 'src'),
  join(RAIZ, 'src', 'api', 'test'),
  join(RAIZ, 'src', 'admin', 'src'),
  join(RAIZ, 'src', 'apps', 'base', 'src'),
  join(RAIZ, 'src', 'apps', 'client', 'src'),
];

/**
 * Símbolos que `core` exporta y que **hoy no usa nadie fuera**, con el motivo por el que siguen.
 *
 * Medido el 2026-07-30. Cada entrada es un pendiente declarado, no un permiso.
 */
const HUERFANOS_DECLARADOS: Record<string, string> = {
  // ── Puertos de la arquitectura hexagonal (TD-024) ────────────────────────────────────────────
  // Los adaptadores nunca se escribieron: el API habla con Prisma directamente. PT-042 ya retiró
  // los casos de uso que los consumían. Retirar también los puertos es abandonar el diseño, y eso
  // se decide con una ADR.
  IAuctionRepository: 'TD-024 — puerto hexagonal sin adaptador',
  AuctionSummary: 'TD-024 — tipo de IAuctionRepository',
  IBidRepository: 'TD-024 — puerto hexagonal sin adaptador',
  BidSummary: 'TD-024 — tipo de IBidRepository',
  IOrderRepository: 'TD-024 — puerto hexagonal sin adaptador',
  OrderSummary: 'TD-024 — tipo de IOrderRepository',
  IWalletRepository: 'TD-024 — puerto hexagonal sin adaptador',
  WalletSummary: 'TD-024 — tipo de IWalletRepository',

  // ── Contratos de integración que el API redeclara por su cuenta (TD-024) ─────────────────────
  // Éstos son los que engañan al leerlos: el contrato vivo está en `modules/payments/interfaces/`.
  IPaymentProvider: 'TD-024 — el contrato vivo lo declara el API',
  PaymentStatus: 'TD-024 — tipo de IPaymentProvider',
  PaymentLink: 'TD-024 — tipo de IPaymentProvider',
  NormalizedPaymentResult: 'TD-024 — tipo de IPaymentProvider',
  PaymentProviderIdentity: 'TD-024 — tipo de IPaymentProvider',
  IEmailService: 'TD-024 — el API usa EmailService directamente',
  IStorageService: 'TD-024 — sin implementadores',
  CfdiData: 'TD-024 — CFDI es un stub declarado',
  StampedCfdi: 'TD-024 — CFDI es un stub declarado',

  // ── Eventos de dominio que nadie emite (TD-024) ──────────────────────────────────────────────
  // `AuctionClosedEvent` SÍ se emite (`auction-scheduler.service.ts`), y por eso no está aquí:
  // el fichero de eventos está medio vivo, que es la razón de listar símbolos y no ficheros.
  BidPlacedEvent: 'TD-024 — evento declarado que nadie emite',
  OrderCreatedEvent: 'TD-024 — evento declarado que nadie emite',
  PaymentCompletedEvent: 'TD-024 — evento declarado que nadie emite',
  RefundProcessedEvent: 'TD-024 — evento declarado que nadie emite',

  // ── DTOs compartidos sin consumidor (TD-024) ─────────────────────────────────────────────────
  PaginationQuery: 'TD-024 — el API usa sus propios DTO de paginación',
  PaginatedResult: 'TD-024 — el API usa sus propios DTO de paginación',

  // ── Tipos consumidos por forma, no por nombre ────────────────────────────────────────────────
  // `validateBid()` SÍ se usa; sus tipos no se nombran en la llamada porque TypeScript es
  // estructural. No son huérfanos: son un límite de medir por nombre, y se declara en vez de
  // disimularlo bajando el listón de la guarda.
  BidValidationContext: 'falso positivo — tipo de validateBid(), que sí se usa',
  BidValidationResult: 'falso positivo — tipo de validateBid(), que sí se usa',
};

/** Ficheros `.ts` de un árbol, sin specs ni `node_modules`. */
function ficherosTs(raiz: string, incluirSpecs = false): string[] {
  const salida: string[] = [];
  const recorrer = (dir: string) => {
    let entradas: string[];
    try {
      entradas = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entradas) {
      if (e === 'node_modules' || e === 'dist' || e === 'coverage') continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (e.endsWith('.ts') && (incluirSpecs || !e.endsWith('.spec.ts'))) salida.push(p);
    }
  };
  recorrer(raiz);
  return salida;
}

/** Los símbolos que `core` exporta, con el fichero donde nacen. */
function simbolosExportados(): Map<string, string> {
  const mapa = new Map<string, string>();
  const patron = /^export\s+(?:abstract\s+)?(?:class|interface|enum|const|function|type)\s+(\w+)/gm;
  for (const f of ficherosTs(CORE)) {
    const src = readFileSync(f, 'utf-8');
    for (const m of src.matchAll(patron)) mapa.set(m[1], f);
  }
  return mapa;
}

/**
 * Los símbolos de `core` nombrados en algún sitio FUERA de `core`.
 *
 * **Este fichero se excluye de la exploración, y no es un detalle.** `HUERFANOS_DECLARADOS` nombra los
 * 25 símbolos, así que la guarda se contaba a sí misma como consumidor: encontraba **cero** huérfanos y
 * `C1` pasaba en vacío. Verde por no medir nada.
 *
 * Es el tercer caso de la misma familia en esta jornada —guardas que se acusan o se absuelven leyendo
 * su propio texto—, y la lección es siempre la misma: **una guarda que nombra lo que vigila forma parte
 * del corpus que vigila.** Lo delató `C3`, que compara la cuenta contra la lista en vez de conformarse
 * con «no hay huérfanos nuevos»: sin ese caso, esto habría quedado verde y falso.
 */
const ESTE_FICHERO = 'core-sin-superficie-huerfana.spec.ts';

function simbolosConsumidos(candidatos: Iterable<string>): Set<string> {
  const vistos = new Set<string>();
  const pendientes = [...candidatos];
  for (const raiz of CONSUMIDORES) {
    for (const f of ficherosTs(raiz, true)) {
      if (f.endsWith(ESTE_FICHERO)) continue;
      // **Sin comentarios: una mención en prosa no es un consumidor.**
      //
      // `IPaymentProvider` salía consumido por una sola línea, y era un comentario de `test-app.ts`
      // que decía *«cumple el contrato de IPaymentProvider»* — una frase, no un `implements`, y
      // además falsa: el contrato que ese doble cumple es el `PaymentProvider` del API. Contar la
      // prosa habría absuelto justo al símbolo más engañoso de la lista.
      const src = readFileSync(f, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, ''))
        .join('\n');
      for (const s of pendientes) {
        if (vistos.has(s)) continue;
        if (new RegExp(`\\b${s}\\b`).test(src)) vistos.add(s);
      }
    }
  }
  return vistos;
}

describe('`@ironloot/core` no crece en superficie huerfana — AUD-012 (PT-191)', () => {
  const exportados = simbolosExportados();
  const consumidos = simbolosConsumidos(exportados.keys());
  const huerfanos = [...exportados.keys()].filter((s) => !consumidos.has(s));

  it('C1: ningun simbolo exportado queda huerfano sin declararlo', () => {
    // El caso que cierra AUD-012 y, sobre todo, el que impide que la clase vuelva a crecer en
    // silencio. Un simbolo nuevo sin consumidores rompe aqui, con su nombre y su fichero.
    const nuevos = huerfanos
      .filter((s) => !(s in HUERFANOS_DECLARADOS))
      .map((s) => `${s}  (${exportados.get(s)?.replace(CORE, 'core')})`);

    expect(nuevos).toEqual([]);
  });

  it('C2: `Money` y el validador de IPN ya no existen — eran los dos que enganaban', () => {
    // `Money` es lo que AUD-012 nombra. El validador de IPN salio al medir el conjunto, y era peor:
    // describia el protocolo de **PayPal** para un sistema que no lo usa.
    expect(exportados.has('Money')).toBe(false);
    expect(exportados.has('MoneyDto')).toBe(false);
    expect(exportados.has('validateIpnResponse')).toBe(false);
    expect(exportados.has('buildIpnVerificationPayload')).toBe(false);
  });

  it('C3: el pendiente que queda esta contado, no estimado', () => {
    // Sin una cifra, «hay codigo muerto en core» es una impresion. `TD-024` se decide con esto.
    expect(huerfanos.length).toBe(Object.keys(HUERFANOS_DECLARADOS).length);
    expect(huerfanos.length).toBeLessThanOrEqual(25);
  });

  describe('casos de control', () => {
    it('AC-01: la guarda ve consumo real — lo que SI se usa no aparece como huerfano', () => {
      // Sin esto, una guarda que no encontrara ningun consumidor (ruta mal construida, arbol vacio)
      // declararia huerfano **todo** y seguiria en verde tras «declararlos». Es el modo exacto en que
      // una guarda se vuelve inutil sin dejar de existir.
      for (const vivo of [
        'AuctionStateMachine',
        'OrderStateMachine',
        'DisputeStateMachine',
        'WalletCalculation',
        'AuctionClosedEvent',
      ]) {
        expect({
          simbolo: vivo,
          exportado: exportados.has(vivo),
          consumido: consumidos.has(vivo),
        }).toEqual({ simbolo: vivo, exportado: true, consumido: true });
      }
    });

    it('AC-02: la lista de declarados no describe un pasado', () => {
      // Si un simbolo declarado consigue un consumidor —o se retira—, tiene que salir de la lista.
      // Sin este caso, la lista se quedaria enumerando huerfanos que ya no existen y nadie lo sabria:
      // el mismo defecto que RULE-38 corrige en la documentacion.
      const sobran = Object.keys(HUERFANOS_DECLARADOS).filter((s) => !huerfanos.includes(s));

      expect(sobran).toEqual([]);
    });

    it('AC-03: la lista no es un permiso — cada entrada dice por que', () => {
      const sinMotivo = Object.entries(HUERFANOS_DECLARADOS)
        .filter(([, motivo]) => motivo.trim().length < 15)
        .map(([s]) => s);

      expect(sinMotivo).toEqual([]);
    });
  });
});
