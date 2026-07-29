import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-168 (RULE-33) — Los derivados de PTSA no contradicen el estado de los `H-XXX`.
 *
 * ## El defecto
 *
 * `CLAUDE.md` declara quien manda para cada clase de pendiente: para «hallazgos de auditoria» manda
 * `PTSA/Hallazgos/H-XXX.md`, y `ESTADO_ACTUAL.md` y `RESUMEN.md` son **derivados que no se editan a
 * mano**. Medido el 2026-07-29, los derivados decian lo contrario que la autoridad:
 *
 *   - `ESTADO_ACTUAL.md`  «Hallazgos activos: 5» y «Cerrados: 20 (H-001 … H-020)»
 *   - `RESUMEN.md`        D2 = 80 imputado a H-021/H-022 · D4 = 94 imputado a H-023/H-024
 *   - `PENDIENTES.md`     los cuatro en «Lo abierto de peso», responsable «Agente, bajo FDGE»
 *
 * Los cuatro estaban `CERRADA` con VoBo humano, y sus correcciones **verificadas ejecutando**: el
 * veredicto de coherencia da tres estados y sale con 1 cuando no puede medir, los dos checkpoints
 * corren dentro del contenedor, y el `warn` de arranque del DTO duplicado ya no sale.
 *
 * ## Por que importa mas que un numero desfasado
 *
 * Un derivado que declara pendiente lo que esta hecho **hace crecer la lista mientras el trabajo se
 * cierra**, que es justo lo contrario de lo que el registro existe para mostrar. Es el sintoma que
 * abrio PT-140 —cuarenta y cuatro tareas `BLOCKED` ya fusionadas— y el que el humano señalo el mismo
 * dia que se cerro la tanda. `PENDIENTES.md` es el caso peor de los tres, porque su propia cabecera
 * declara que es **estado y no log** y que se poda: volvio a acumular en una sola jornada.
 *
 * Y en PTSA no es solo cosmetico: `[A8]` hace de la cobertura declarada un requisito del score, y la
 * frescura capa la clasificacion. Un derivado falso es una entrada falsa del calculo.
 *
 * ## Lo que esta guarda comprueba, y lo que NO
 *
 * Comprueba que **ningun hallazgo cerrado se presente como activo** en los tres derivados, y que el
 * numero que `ESTADO_ACTUAL.md` anuncia sea el que lista. NO comprueba los scores: recalcularlos es
 * una emision de PTSA, y PTSA no se auto-activa. Que el Health este pendiente de recalculo se dice
 * en el propio fichero; esta guarda vigila los hechos, no la aritmetica.
 *
 * Tampoco toca `AUDIT_LOG.md` ni el cuerpo de los `H-XXX`: son append-only y `[A6]` los protege.
 */
const RAIZ = raizDelMonorepo();

const HALLAZGOS = join(RAIZ, 'PTSA/Hallazgos');
const ESTADO_ACTUAL = join(RAIZ, 'PTSA/ESTADO_ACTUAL.md');
const RESUMEN = join(RAIZ, 'PTSA/RESUMEN.md');
const PENDIENTES = join(RAIZ, 'PTSA/PENDIENTES.md');

/** Los estados que significan «ya no penaliza». El resto cuenta como activo. */
const CERRADOS = ['CERRADA', 'CLOSED'];

/**
 * El `estado:` del frontmatter de cada hallazgo. Es **la autoridad**: lo que diga esto es lo que
 * los derivados tienen que decir.
 */
export function estadoDeHallazgos(dir: string): Map<string, string> {
  const estados = new Map<string, string>();
  if (!existsSync(dir)) return estados;

  for (const f of readdirSync(dir).filter((n) => /^H-\d+\.md$/.test(n))) {
    const md = readFileSync(join(dir, f), 'utf8');
    // Solo el frontmatter: el cuerpo lleva `## Revision` y `## Cierre`, que nombran estados en prosa.
    const frontmatter = md.split('---')[1] ?? '';
    const estado = frontmatter.match(/^estado:\s*(\S+)/m)?.[1];
    if (estado) estados.set(f.replace('.md', ''), estado.toUpperCase());
  }

  return estados;
}

/** Los `H-XXX` que un texto nombra, sin repetir. */
export function idsDeHallazgo(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\bH-\d{3}\b/g)].map((m) => m[0]))];
}

/**
 * El cuerpo de una seccion `## Titulo`, hasta el siguiente `## `.
 *
 * Devuelve `null` si no la encuentra — y quien la use **debe** tratar ese caso como fallo. Una
 * seccion renombrada que devuelva cadena vacia dejaria la comprobacion pasando en vacio, que es el
 * defecto que C1 de `coherencia-de-registros` tuvo hoy.
 */
export function seccion(md: string, tituloParcial: string): string | null {
  const lineas = md.split('\n');
  const inicio = lineas.findIndex(
    (l) => /^##\s/.test(l) && l.toLowerCase().includes(tituloParcial.toLowerCase()),
  );
  if (inicio === -1) return null;

  const resto = lineas.slice(inicio + 1);
  const fin = resto.findIndex((l) => /^##\s/.test(l));

  return (fin === -1 ? resto : resto.slice(0, fin)).join('\n');
}

/**
 * Las filas de datos de las tablas de un texto — sin cabeceras ni separadores.
 *
 * **La afirmacion «esto esta activo» vive en la fila de la tabla, no en la prosa de alrededor.** Una
 * seccion de activos dice legitimamente «Cerrados: 23 (H-001 … H-024)» y explica de donde venia un
 * score; acusar eso seria un falso positivo, y un falso positivo tambien mata un control: enseña a
 * ignorar la guarda. Se mira lo que se declara en tabla, que es lo que un lector lee como estado.
 */
export function filasDeTabla(texto: string): string {
  return texto
    .split('\n')
    .filter((l) => /^\s*\|/.test(l))
    .filter((l) => !/^\s*\|[\s|:-]*$/.test(l))
    .join('\n');
}

describe('Los derivados de PTSA no contradicen los hallazgos — RULE-33 (PT-168)', () => {
  const estados = estadoDeHallazgos(HALLAZGOS);
  const activos = [...estados.entries()]
    .filter(([, e]) => !CERRADOS.includes(e))
    .map(([id]) => id)
    .sort();
  const cerrados = [...estados.entries()].filter(([, e]) => CERRADOS.includes(e)).map(([id]) => id);

  it('hay hallazgos que leer — si no, todo lo de abajo pasa en vacio', () => {
    expect(estados.size).toBeGreaterThanOrEqual(20);
    expect(cerrados.length).toBeGreaterThan(0);
  });

  it('C1: `ESTADO_ACTUAL.md` no presenta como activo ningun hallazgo cerrado', () => {
    const md = readFileSync(ESTADO_ACTUAL, 'utf8');
    const cuerpo = seccion(md, 'Hallazgos activos');

    // Si la seccion se renombra, esto falla en vez de pasar en vacio. Es deliberado.
    expect(cuerpo).not.toBeNull();

    const listados = idsDeHallazgo(filasDeTabla(cuerpo as string));
    expect(listados.filter((id) => cerrados.includes(id))).toEqual([]);
  });

  it('C2: el numero que `ESTADO_ACTUAL.md` anuncia es el que hay activo', () => {
    const md = readFileSync(ESTADO_ACTUAL, 'utf8');
    const anunciado = md.match(/##\s*Hallazgos activos:\s*(\d+)/i)?.[1];

    expect(anunciado).toBeDefined();
    expect(Number(anunciado)).toBe(activos.length);
  });

  it('C3: `PENDIENTES.md` no lista como abierto ningun hallazgo cerrado', () => {
    const md = readFileSync(PENDIENTES, 'utf8');
    const cuerpo = seccion(md, 'Lo abierto de peso');

    expect(cuerpo).not.toBeNull();

    const listados = idsDeHallazgo(filasDeTabla(cuerpo as string));
    expect(listados.filter((id) => cerrados.includes(id))).toEqual([]);
  });

  it('C4: `RESUMEN.md` no imputa a una dimension un hallazgo cerrado', () => {
    const md = readFileSync(RESUMEN, 'utf8');
    const cuerpo = seccion(md, 'SCORES POR DIMENSION') ?? seccion(md, 'SCORES POR DIMENSIÓN');

    expect(cuerpo).not.toBeNull();

    // Solo las filas de la tabla de dimensiones: la prosa de alrededor cita hallazgos cerrados a
    // proposito, para explicar de donde venia el score. Acusar eso seria un falso positivo.
    const filas = (cuerpo as string)
      .split('\n')
      .filter((l) => /^\|\s*D[1-5]\b/.test(l))
      .join('\n');

    expect(idsDeHallazgo(filas).filter((id) => cerrados.includes(id))).toEqual([]);
  });

  describe('casos de control', () => {
    it('AC-01: un cerrado presentado como activo se detecta', () => {
      const falso = '| **H-021** | D2 | ALTA | el instrumento afirma sin medir |';

      expect(idsDeHallazgo(falso).filter((id) => cerrados.includes(id))).toEqual(['H-021']);
    });

    it('AC-02: el hallazgo realmente activo NO se acusa', () => {
      // Un falso positivo tambien mata un control: si acusara a H-005, el equipo aprenderia a
      // ignorar esta guarda.
      const legitimo = '| **H-005** | D1 | ALTA | CFDI/PAC sin integrar |';

      expect(idsDeHallazgo(legitimo).filter((id) => cerrados.includes(id))).toEqual([]);
    });

    it('AC-03: una seccion que no existe devuelve null, no cadena vacia', () => {
      expect(seccion('# Titulo\n\ntexto suelto', 'Hallazgos activos')).toBeNull();
    });

    it('AC-04: la seccion se corta en el siguiente `##`', () => {
      const md = '## Hallazgos activos: 1\n\nH-005 aqui\n\n## Otra cosa\n\nH-021 aqui';

      expect(idsDeHallazgo(seccion(md, 'Hallazgos activos') as string)).toEqual(['H-005']);
    });

    it('AC-05: el estado se lee del frontmatter, no del cuerpo', () => {
      // Los cuerpos dicen «Estado: `ABIERTA`. El agente no cierra hallazgos» y luego «## Cierre».
      // Leer el cuerpo daria el estado de deteccion, no el vigente.
      const h021 = estados.get('H-021');

      expect(h021).toBeDefined();
      expect(CERRADOS).toContain(h021 as string);
    });

    it('AC-06: un frontmatter sin `estado:` no se inventa', () => {
      expect(estadoDeHallazgos(join(RAIZ, 'PTSA/no-existe')).size).toBe(0);
    });

    it('AC-07: la prosa que nombra cerrados NO se acusa; la fila de tabla SI', () => {
      // El caso real que hizo aparecer `filasDeTabla`: la seccion de activos dice el recuento de
      // cerrados y explica de donde venia un score. Eso es legitimo. Declararlo en la tabla, no.
      const seccionReal = [
        '| ID | Dim | Sev |',
        '|---|---|---|',
        '| **H-005** | D1 | ALTA |',
        '',
        '**Cerrados**: 23 (H-001 … H-004, H-006 … H-024). Ninguno reabierto.',
      ].join('\n');

      expect(
        idsDeHallazgo(filasDeTabla(seccionReal)).filter((id) => cerrados.includes(id)),
      ).toEqual([]);
      // Y sin el filtro, la prosa lo habria hecho fallar — que es por lo que el filtro existe.
      expect(
        idsDeHallazgo(seccionReal).filter((id) => cerrados.includes(id)).length,
      ).toBeGreaterThan(0);
    });

    it('AC-08: `filasDeTabla` descarta el separador y conserva los datos', () => {
      const tabla = '| ID |\n|---|\n| H-005 |';

      expect(filasDeTabla(tabla)).toBe('| ID |\n| H-005 |');
    });
  });
});
