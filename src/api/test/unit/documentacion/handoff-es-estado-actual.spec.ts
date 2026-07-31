import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-200 — **El documento que dice ser el estado actual tiene que serlo.**
 *
 * ## De dónde sale
 *
 * `HANDOFF.md` declara en su tercera línea: *«Se **sobrescribe**: es el estado de ahora, no la
 * historia»*, y `CLAUDE.md` lo repite como regla del framework — *«HANDOFF.md represents current state
 * only»*. Medido el 2026-07-30: **428 líneas, 13 secciones, siete tituladas «Antes de eso»**.
 *
 * Al acumular arrastró **nueve afirmaciones que ya eran falsas**, y todas se leían como vigentes porque
 * el documento entero se presenta como vigente:
 *
 * | Decía | Era |
 * |---|---|
 * | API **138** suites | 137 |
 * | Guardas de documentación **15** suites / **159** pruebas | 18 / 184 |
 * | **150** encabezados en `HISTORY.log` | 151 |
 * | Hallazgos: **35** registrados | 36 |
 * | Veredictos **20 · 0 · 1 · 15** | **35 · 0 · 1 · 0** |
 * | Tres inventarios *«sin guarda — no son mecánicamente enumerables»* | **los tres tienen guarda** desde PT-198 |
 * | Deuda: 2 abiertas **de 24** | de **19** — `TD-018…023` no han existido nunca |
 *
 * ## Por qué era el peor sitio posible para que pasara
 *
 * **Es el primer fichero que abre quien retoma el trabajo.** Le decía que tres inventarios no se podían
 * enumerar (se pueden, y hay guarda), que quedaban quince hallazgos por medir (cero) y que la deuda
 * tenía veinticuatro entradas (diecinueve). Las tres mandan a hacer trabajo que no existe, o a no hacer
 * el que toca.
 *
 * Y era el **único** registro de la tabla *«Dónde vive un pendiente»* de `CLAUDE.md` sin guarda.
 *
 * ## Lo que comprueba, y lo que NO
 *
 * Comprueba **la cabecera de estado**: las etiquetas de formato fijo que declaran una cifra medible, y
 * que el documento no acumule secciones históricas.
 *
 * **NO comprueba el recuento de pruebas** (1366, 1113, 144…). Verificarlo exigiría ejecutar las cinco
 * suites dentro de una prueba, y eso convierte una guarda de documentación en una corrida completa. Se
 * dice aquí porque *lo que no se cita, no se protege*, y quien lea esta guarda debe saber que esa cifra
 * la sostiene una corrida manual, no un automatismo.
 *
 * Y **no lee el cuerpo del documento**: una guarda sobre prosa produce falsos positivos, y un falso
 * positivo enseña a desconfiar de la guarda — que es la forma silenciosa de perderla.
 */
const RAIZ = raizDelMonorepo();
const HANDOFF = join(RAIZ, 'docs', 'implementation', 'HANDOFF.md');

const leer = (p: string) => readFileSync(p, 'utf-8');

/**
 * Lee una cifra declarada por su etiqueta. **Si la etiqueta no está, devuelve `null` y el caso falla
 * nombrándola** — nunca pasa en vacío. Es el modo en que la guarda de `core` pasó sin comprobar nada.
 */
export function cifraDeclarada(texto: string, etiqueta: RegExp): number | null {
  const m = etiqueta.exec(texto);

  return m ? Number(m[1]) : null;
}

/** Los `TD-XXX` del registro, y cuáles siguen abiertos según su propia línea `**Status:**`. */
export function deudaTecnica(doc: string): { total: number; abiertas: string[] } {
  const lineas = doc.split('\n');
  const total: string[] = [];
  const abiertas: string[] = [];

  for (let i = 0; i < lineas.length; i++) {
    const m = /^### (TD-\d{3})\b/.exec(lineas[i]);
    if (!m) continue;
    total.push(m[1]);
    // El estado va en la línea siguiente. Ojo: el formato es `**Status:**`, con los dos puntos DENTRO
    // de la negrita — buscar `**Status**` no encuentra ninguna, que ya me costó un veredicto falso hoy.
    const estado = lineas[i + 1] ?? '';
    if (!/CERRADA|CLOSED|MITIGADA|RESUELTA/i.test(estado)) abiertas.push(m[1]);
  }

  return { total: total.length, abiertas };
}

describe('HANDOFF.md es el estado actual, no la historia — PT-200', () => {
  const handoff = leer(HANDOFF);

  it('C1: no acumula secciones historicas', () => {
    // Siete «Antes de eso» es lo que había. La historia vive en `HISTORY.log`, que es append-only y la
    // tiene íntegra con su fecha: duplicarla aquí no añadía nada y **sólo podía envejecer**.
    const historicas = handoff
      .split('\n')
      .filter((l) => /^#{2,3}\s+(Antes de eso|Lo último|Lo anterior)\b/i.test(l));

    expect(historicas).toEqual([]);
  });

  it('C2: las reglas duras que declara son las DEFINIDAS, no las mencionadas', () => {
    // **La primera versión contaba menciones y daba 38.** Las reglas son **36**: los números **18** y
    // **21** son huecos de numeración declarados en `11-Conventions.md:584` —se reservaron en paquetes
    // de propuesta que no llegaron a definirlos—. Contar cada mención que aparece en el texto es medir
    // la forma; lo que hay son encabezados.
    //
    // Y los números van sin su prefijo **a propósito**: escribirlos completos hace que
    // `reglas-citadas-existen.spec.ts` acuse a este comentario por citar reglas sin declarar. Octava vez
    // en la jornada — **una guarda que nombra lo que vigila forma parte del corpus que vigila.**
    const declaradas = cifraDeclarada(handoff, /\*\*Reglas duras\*\*: \*\*(\d+)\*\*/);
    const reales = new Set(
      [
        ...leer(join(RAIZ, 'docs', 'enterprise-documentation', '11-Conventions.md')).matchAll(
          /^#{2,4} .*\bRULE-(\d{2})\b/gm,
        ),
      ].map((m) => m[1]),
    ).size;

    expect(declaradas).not.toBeNull();
    expect(declaradas).toBe(reales);
  });

  it('C3: las guardas de documentacion que declara son las que hay', () => {
    const declaradas = cifraDeclarada(
      handoff,
      /\*\*Guardas de documentación\*\*: \*\*(\d+)\*\* suites/,
    );
    const reales = readdirSync(join(RAIZ, 'src', 'api', 'test', 'unit', 'documentacion')).filter(
      (f) => f.endsWith('.spec.ts'),
    ).length;

    expect(declaradas).not.toBeNull();
    expect(declaradas).toBe(reales);
  });

  it('C4: los encabezados que declara son los que publica el INDICE DE ESTADO', () => {
    // **No se recuenta aquí, se lee del índice.** Tres definiciones distintas conviven en este fichero
    // si uno se descuida: 159 líneas `## PT-`, 148 PT distintos y **151** encabezados —que es lo que
    // cuenta el generador, porque un encabezado agrupado vale por varios PT (su `AC-04`)—. Escribir un
    // tercer recuento aquí crearía una cuarta verdad; lo que manda es el índice, y que el índice esté
    // regenerado lo vigila `indice-de-estado-al-dia.spec.ts`.
    const declarados = cifraDeclarada(handoff, /\*\*(\d+) encabezados/);
    const indice = cifraDeclarada(
      leer(join(RAIZ, 'docs', 'implementation', 'HISTORY.log')),
      /\*\*(\d+)\*\* encabezados · \*\*\d+\*\* realmente abiertos/,
    );

    expect(indice).not.toBeNull();
    expect(declarados).not.toBeNull();
    expect(declarados).toBe(indice);
  });

  it('C5: los hallazgos PTSA que declara son los que hay en fichero', () => {
    const declarados = cifraDeclarada(handoff, /\*\*Hallazgos PTSA\*\*: \*\*(\d+)\*\* registrados/);
    const reales = readdirSync(join(RAIZ, 'PTSA', 'Hallazgos')).filter((f) =>
      /^H-\d{3}\.md$/.test(f),
    ).length;

    expect(declarados).not.toBeNull();
    expect(declarados).toBe(reales);
  });

  it('C6: la deuda tecnica que declara coincide con el registro', () => {
    const doc = leer(join(RAIZ, 'docs', 'enterprise-documentation', '10-Technical-Debt.md'));
    const { total, abiertas } = deudaTecnica(doc);
    const declAbiertas = cifraDeclarada(handoff, /\*\*Deuda técnica\*\*: \*\*(\d+)\*\* abiertas/);
    const declTotal = cifraDeclarada(handoff, /abiertas de \*\*(\d+)\*\* registradas/);

    expect(declAbiertas).not.toBeNull();
    expect(declTotal).not.toBeNull();
    expect(declAbiertas).toBe(abiertas.length);
    expect(declTotal).toBe(total);
  });

  describe('casos de control', () => {
    it('AC-01: una cifra ausente devuelve null y NO se lee como cero', () => {
      // Sin esto, borrar la etiqueta haría pasar la guarda: `undefined === undefined`. Es exactamente
      // como una guarda deja de vigilar sin dejar de existir.
      expect(
        cifraDeclarada('sin etiquetas aquí', /\*\*Reglas duras\*\*: \*\*(\d+)\*\*/),
      ).toBeNull();
      expect(
        cifraDeclarada('**Reglas duras**: **36** `RULE-NN`', /\*\*Reglas duras\*\*: \*\*(\d+)\*\*/),
      ).toBe(36);
    });

    it('AC-02: C1 sabe acusar — con la seccion puesta, la encuentra', () => {
      const conHistoria = '# HANDOFF\n\n## Antes de eso: los registros dejaron de mentir\n\ntexto';
      const historicas = conHistoria
        .split('\n')
        .filter((l) => /^#{2,3}\s+(Antes de eso|Lo último|Lo anterior)\b/i.test(l));

      expect(historicas).toHaveLength(1);
    });

    it('AC-03: el lector de deuda distingue abierta de cerrada', () => {
      const muestra = [
        '### TD-100 — algo',
        '**Status:** ✅ **CERRADA 2026-07-30 por PT-000.**',
        '',
        '### TD-101 — otra cosa',
        '**Status:** Open, riesgo aceptado.',
      ].join('\n');

      expect(deudaTecnica(muestra)).toEqual({ total: 2, abiertas: ['TD-101'] });
    });

    it('AC-04: el registro de deuda no esta vacio — sin esto C6 compararia 0 con 0', () => {
      const { total } = deudaTecnica(
        leer(join(RAIZ, 'docs', 'enterprise-documentation', '10-Technical-Debt.md')),
      );

      expect(total).toBeGreaterThan(15);
    });

    it('AC-05: el HANDOFF leido no esta vacio', () => {
      expect(handoff.length).toBeGreaterThan(1000);
    });
  });
});
