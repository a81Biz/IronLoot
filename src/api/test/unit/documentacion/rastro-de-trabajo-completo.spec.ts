import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-169 (RULE-34) — El rastro de trabajo no tiene huecos, en las dos direcciones.
 *
 * ## El defecto
 *
 * `coherencia-de-registros.spec.ts` (RULE-20) vigila dos direcciones y **le faltaban las simetricas**.
 * Las dos fallaron el mismo dia, 2026-07-29:
 *
 *   1. **PT-167 no existia en `HISTORY.log`.** Solo en el mensaje del commit `58fd605`. STATE 7 declara
 *      esa entrada obligatoria. Un PT que no esta en la historia es trabajo que, para el marco, no ha
 *      ocurrido — y era el ultimo commit de la rama.
 *   2. **PT-166 quedo `VALIDATION_PENDING` fuera del registro de pendientes.** Su entrada es posterior
 *      al cierre en bloque con VoBo (que enumera PT-148…165), asi que nadie lo valido; mientras
 *      `PENDING_TASKS.md` y `HANDOFF.md` afirmaban *«Nada mas esta pendiente»*.
 *
 * Y C1 —«ningun PT marcado PENDING/BLOCKED figura terminado»— **pasaba en vacio**: con
 * `PENDING_TASKS.md` sin filas pendientes no hay nada que comparar. Una guarda que pasa en vacio no
 * dice que todo este bien; dice que no ha mirado.
 *
 * ## Lo que esta guarda comprueba
 *
 * - **C1**: todo PT que la historia deja `VALIDATION_PENDING` y que **ninguna entrada posterior
 *   declara cerrado** figura en `PENDING_TASKS.md`. Es el invariante que PT-166 rompio.
 * - **C2**: todo grupo de la historia tiene evidencia.
 *
 * ## Por que C2 cuenta por GRUPO y no por PT — y por que se dice aqui
 *
 * `HISTORY.log` usa **cabeceras agrupadas** (`## PT-159 / PT-160 / PT-162`) con **una carpeta de
 * evidencia por grupo**. Contar por PT da **siete falsos positivos** entre PT-151 y PT-165, y quien
 * los persiga creara siete carpetas para satisfacer una metrica mal definida. Se midio y se corrigio
 * antes de fijar la regla (F-167-E).
 *
 * ## La linea base, declarada y no silenciosa
 *
 * Medido el 2026-07-29: de **131** grupos, **34** no tienen evidencia en disco, repartidos por toda la
 * historia (PT-026 … PT-145). No hay corte limpio que sirva de ventana, y **fabricar evidencia desde
 * la descripcion de un PT seria inventar ejecucion** — FDGE dice que la evidencia *es* la ejecucion.
 *
 * Asi que se declaran, en `evidence-baseline.json`, con el mismo criterio que `security-baseline.json`
 * usa para las vulnerabilidades triadas: **la lista solo puede bajar**. Un grupo nuevo sin evidencia
 * falla; un hueco viejo esta contado y a la vista. Un tope silencioso se lee como «cubierto todo»
 * cuando no lo esta (RULE-26), y por eso C3, C4 y C5 vigilan la propia linea base: que no crezca, que
 * no se use para tapar lo de hoy, y que no envejezca declarando huecos ya cerrados.
 */
const RAIZ = raizDelMonorepo();

const HISTORIA = join(RAIZ, 'docs/implementation/HISTORY.log');
const PENDIENTES = join(RAIZ, 'docs/implementation/PENDING_TASKS.md');
const EVIDENCIA = join(RAIZ, 'docs/implementation/evidence');
const LINEA_BASE = join(RAIZ, 'docs/implementation/evidence-baseline.json');

/** Los huecos de evidencia declarados. Solo puede bajar — lo vigilan C3, C4 y C5. */
const lineaBase: { grupos_sin_evidencia: string[] } = JSON.parse(readFileSync(LINEA_BASE, 'utf8'));

interface Entrada {
  cabecera: string;
  cuerpo: string;
  pts: string[];
  estado: string;
}

const id = (n: number) => `PT-${String(n).padStart(3, '0')}`;

/**
 * Los PT que un texto nombra, expandiendo rangos (`PT-148…PT-162`, `PT-105 ... PT-108`).
 *
 * El rango importa: el cierre en bloque con VoBo enumera quince PT como un rango, y sin expandirlo la
 * guarda acusaria a catorce PT ya validados.
 */
export function ptsNombrados(texto: string): string[] {
  const encontrados = new Set<string>();

  for (const m of texto.matchAll(/PT-(\d{3})\s*(?:…|\.\.\.)\s*PT-(\d{3})/g)) {
    const [desde, hasta] = [Number(m[1]), Number(m[2])].sort((a, b) => a - b);
    for (let n = desde; n <= hasta; n++) encontrados.add(id(n));
  }
  for (const m of texto.matchAll(/PT-(\d{3})/g)) encontrados.add(id(Number(m[1])));

  return [...encontrados];
}

/**
 * La clave estable de un grupo en la linea base.
 *
 * **Tiene que expandir rangos igual que `ptsNombrados`.** La primera version de la linea base se genero
 * sin expandirlos: `## PT-124 … PT-126` daba `PT-124/PT-126` en el fichero y `PT-124/PT-125/PT-126` en
 * la guarda, y la fila declarada no casaba con nada. Una linea base cuya clave se calcula de dos formas
 * distintas no declara nada.
 */
export function clave(e: Entrada): string {
  return [...e.pts].sort().join('/');
}

/** `HISTORY.log` partido en entradas `## ...`, con su `Status:` y los PT de su cabecera. */
export function entradasDeHistoria(log: string): Entrada[] {
  const lineas = log.split('\n');
  const entradas: Entrada[] = [];

  for (let i = 0; i < lineas.length; i++) {
    if (!lineas[i].startsWith('## ')) continue;

    const resto = lineas.slice(i + 1);
    const fin = resto.findIndex((l) => l.startsWith('## '));
    const cuerpo = (fin === -1 ? resto : resto.slice(0, fin)).join('\n');

    entradas.push({
      cabecera: lineas[i],
      cuerpo,
      pts: ptsNombrados(lineas[i]),
      estado: cuerpo.match(/^Status:\s*(.+)$/m)?.[1] ?? 'REGISTRADO',
    });
  }

  return entradas;
}

/**
 * Un VoBo **de totalidad**: el humano no enumera, declara que cierra todo lo que esperaba validacion.
 *
 * Existen tres en la historia y son literales: *«toda la validacion pendiente»*, *«dalos a todos por
 * validados con mi VoBo»*, *«las validaciones dalas por validado»*. Tratarlos como si sólo cerraran lo
 * que su cabecera enumera acusaria a **treinta** PT que una persona dio por validados — un falso
 * positivo masivo, y el tipo de ruido que termina con la guarda desactivada.
 */
const VOBO_TOTAL =
  /toda la validaci[oó]n pendiente|dalos a todos por validados|todos por validados|las validaciones dalas por validado/i;

/**
 * Los PT que siguen esperando validacion al final de la historia.
 *
 * Se recorre en **orden cronologico**, que es lo que un log append-only permite y exige: una entrada
 * deja PT pendientes, una posterior los cierra. Es la unica lectura fiel — y evita el corte arbitrario
 * («aplicar la regla desde PT-140») que habria sido un tope silencioso disfrazado de umbral.
 */
export function pendientesVivos(entradas: Entrada[]): string[] {
  const pendientes = new Set<string>();

  for (const e of entradas) {
    const texto = `${e.cabecera}\n${e.cuerpo}`;

    if (/VALIDATION_PENDING/.test(e.estado)) {
      for (const p of e.pts) pendientes.add(p);
    }

    // Un VoBo de totalidad cierra todo lo acumulado hasta aqui. Lo dice el humano, no la guarda.
    if (VOBO_TOTAL.test(texto)) {
      pendientes.clear();
      continue;
    }

    // Un cierre enumerado cierra lo que nombra — cabecera y cuerpo, porque las entradas de VoBo
    // enumeran en el cuerpo (`## CIERRE …` no lleva PT en la cabecera).
    const declaraCierre = /\b(CLOSED|DONE|VALIDATED)\b/.test(e.estado) || /VoBo/i.test(texto);
    if (declaraCierre) {
      for (const p of [...e.pts, ...ptsNombrados(e.cuerpo)]) pendientes.delete(p);
    }
  }

  return [...pendientes].sort();
}

/** La evidencia que existe en disco, por PT. */
export function evidenciaEnDisco(): Set<string> {
  if (!existsSync(EVIDENCIA)) return new Set();

  return new Set(readdirSync(EVIDENCIA).filter((d) => /^PT-\d{3}$/.test(d)));
}

describe('El rastro de trabajo no tiene huecos — RULE-34 (PT-169)', () => {
  const log = existsSync(HISTORIA) ? readFileSync(HISTORIA, 'utf8') : '';
  const entradas = entradasDeHistoria(log);
  const evidencia = evidenciaEnDisco();

  it('se leyeron entradas, cierres y evidencia — si no, C1 y C2 pasan en vacio', () => {
    expect(entradas.length).toBeGreaterThan(50);
    // Que haya VoBo de totalidad es parte del contrato que C1 interpreta: si dejara de haberlo, C1
    // cambiaria de significado sin avisar.
    expect(
      entradas.filter((e) => VOBO_TOTAL.test(`${e.cabecera}\n${e.cuerpo}`)).length,
    ).toBeGreaterThan(0);
    expect(evidencia.size).toBeGreaterThan(50);
  });

  it('C1: todo PT que sigue esperando validacion figura en PENDING_TASKS', () => {
    const md = readFileSync(PENDIENTES, 'utf8');
    const enPendientes = new Set(ptsNombrados(md));

    const huerfanos = pendientesVivos(entradas).filter((p) => !enPendientes.has(p));

    expect(huerfanos).toEqual([]);
  });

  it('C2: ningun grupo NUEVO se queda sin evidencia — contada por grupo', () => {
    const declarados = new Set<string>(lineaBase.grupos_sin_evidencia);

    const sinEvidencia = entradas
      // Las entradas sin PT en la cabecera no son trabajo: son cierres y validaciones
      // (`## CIERRE CON VoBo HUMANO`). Exigirles evidencia produce una clave vacia y un falso
      // positivo — lo dio esta misma guarda en su primera corrida.
      .filter((e) => e.pts.length > 0)
      // Una carpeta de cualquiera de los PT del grupo sirve: es la convencion real del fichero.
      .filter((e) => !e.pts.some((p) => evidencia.has(p)))
      .map((e) => clave(e))
      .filter((k) => !declarados.has(k));

    expect([...new Set(sinEvidencia)].sort()).toEqual([]);
  });

  it('C3: la linea base solo puede BAJAR — nunca crecer', () => {
    // El numero medido al declararla. Si sube, alguien añadio un hueco a la lista en vez de cerrarlo,
    // que es como una linea base deja de ser un limite y se convierte en una excusa.
    expect(lineaBase.grupos_sin_evidencia.length).toBeLessThanOrEqual(34);
  });

  it('C4: la linea base no cubre a PT-166 ni a PT-167 — se resolvieron, no se declararon', () => {
    // Sin esto, «arreglar» F-167-C y F-167-E seria tan facil como añadir dos filas a la linea base.
    const texto = lineaBase.grupos_sin_evidencia.join(' ');

    expect(texto).not.toContain('PT-166');
    expect(texto).not.toContain('PT-167');
  });

  it('C5: lo declarado en la linea base sigue siendo cierto', () => {
    // Una linea base que declara huecos ya cerrados envejece igual que un comentario: hay que
    // limpiarla. Si un grupo declarado YA tiene evidencia, su fila sobra.
    const sobrantes = lineaBase.grupos_sin_evidencia.filter((clave: string) =>
      clave.split('/').some((p) => evidencia.has(p)),
    );

    expect(sobrantes).toEqual([]);
  });

  describe('casos de control', () => {
    it('AC-01: un rango se expande — sin esto C1 acusaria a catorce PT validados', () => {
      expect(ptsNombrados('los quince PT (PT-148…PT-162)')).toHaveLength(15);
      expect(ptsNombrados('PT-105 ... PT-108')).toEqual(['PT-105', 'PT-106', 'PT-107', 'PT-108']);
    });

    it('AC-02: una cabecera agrupada da todos sus PT', () => {
      const e = entradasDeHistoria('## PT-159 / PT-160 / PT-162 — tres\nStatus: DONE\n');

      expect(e[0].pts).toEqual(['PT-159', 'PT-160', 'PT-162']);
    });

    it('AC-03: un VALIDATION_PENDING sin cierre posterior se detecta', () => {
      const e = entradasDeHistoria('## PT-166 — algo\nStatus: VALIDATION_PENDING\n');

      expect(pendientesVivos(e)).toEqual(['PT-166']);
    });

    it('AC-04: una entrada de VoBo cierra lo que enumera en el CUERPO', () => {
      const e = entradasDeHistoria(
        '## PT-166 — algo\nStatus: VALIDATION_PENDING\n\n## CIERRE\nStatus: CLOSED\nVoBo humano sobre PT-166.\n',
      );

      expect(pendientesVivos(e)).toEqual([]);
    });

    it('AC-08: un VoBo de totalidad cierra lo acumulado, aunque no enumere', () => {
      const e = entradasDeHistoria(
        '## PT-500 — x\nStatus: VALIDATION_PENDING\n\n## CIERRE\nStatus: CLOSED\nEl humano dio por revisada toda la validacion pendiente.\n',
      );

      expect(pendientesVivos(e)).toEqual([]);
    });

    it('AC-09: el orden importa — lo pendiente DESPUES de un VoBo total sigue pendiente', () => {
      // Es exactamente el caso de PT-166: su entrada es posterior al cierre en bloque, asi que el
      // VoBo no lo alcanza. Un calculo sin orden lo habria dado por cerrado.
      const e = entradasDeHistoria(
        '## CIERRE\nStatus: CLOSED\nVoBo sobre toda la validacion pendiente.\n\n## PT-166 — despues\nStatus: VALIDATION_PENDING\n',
      );

      expect(pendientesVivos(e)).toEqual(['PT-166']);
    });

    it('AC-05: un grupo con evidencia en cualquiera de sus PT no se acusa', () => {
      const e = entradasDeHistoria('## PT-158 / PT-155 / PT-156 — tres\nStatus: DONE\n');

      // La evidencia del grupo vive en `PT-155`. Contar por PT acusaria a PT-158 y PT-156.
      expect(e[0].pts.some((p) => evidencia.has(p))).toBe(true);
    });

    it('AC-06: un grupo sin evidencia en ninguno de sus PT SI se acusa', () => {
      const e = entradasDeHistoria('## PT-901 / PT-902 — inventado\nStatus: DONE\n');

      expect(e[0].pts.some((p) => evidencia.has(p))).toBe(false);
    });

    it('AC-10: una entrada sin PT en cabecera no exige evidencia', () => {
      // `## CIERRE CON VoBo HUMANO` no es trabajo: es un cierre. Sin este filtro produce una clave
      // vacia y un falso positivo — lo dio esta guarda en su primera corrida.
      const e = entradasDeHistoria('## CIERRE CON VoBo HUMANO\nStatus: CLOSED\n');

      expect(e[0].pts).toEqual([]);
    });

    it('AC-11: la clave de un grupo con rango expande el rango', () => {
      // El segundo fallo real: la linea base decia `PT-124/PT-126` y la guarda calculaba
      // `PT-124/PT-125/PT-126`. La fila declarada no casaba con nada.
      const e = entradasDeHistoria('## PT-124 … PT-126 — VALIDACION\nStatus: CLOSED\n');

      expect(clave(e[0])).toBe('PT-124/PT-125/PT-126');
    });

    it('AC-07: `Status:` con prosa detras se sigue leyendo', () => {
      // La historia real tiene `Status: VALIDATION_PENDING — evidencia ejecutada, pendiente de
      // palabra humana`. Un `\w+` estricto lo leeria igual, pero uno anclado al final lo perderia.
      const e = entradasDeHistoria('## PT-900 — x\nStatus: VALIDATION_PENDING — con prosa\n');

      expect(/VALIDATION_PENDING/.test(e[0].estado)).toBe(true);
    });
  });
});
