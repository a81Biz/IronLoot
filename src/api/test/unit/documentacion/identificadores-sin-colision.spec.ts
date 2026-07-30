import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-191 — **Un identificador nombra una cosa. Dos filas con el mismo `UC-NN` no son dos filas: son un
 * identificador roto.**
 *
 * ## De dónde sale
 *
 * Del propio grafo de conocimiento. Al reconstruirlo tras cerrar los cinco `AUD`, la extracción se topó
 * con que **`UC-17` y `UC-18` nombraban dos casos de uso distintos cada uno**, cuatro filas aparte en la
 * misma tabla:
 *
 * | Identificador | Una fila dice | La otra dice |
 * |---|---|---|
 * | `UC-17` | Confirmar pago vía webhook | Declarar envío (vendedor) |
 * | `UC-18` | Moderar subastas/lotes/usuarios | Confirmar recepción (comprador) |
 *
 * **Lo introdujo PT-189**, en esta misma jornada, al documentar la entrega y la recepción —que
 * efectivamente faltaban— sobre dos números que ya estaban ocupados. No se comprobó porque **nada lo
 * comprobaba**: `UC` es una de las cuatro clases de identificador que `PT-189` dejó declaradas como *sin
 * guarda* (`ADR` · `RN` · `UC` · `P`, 170 identificadores). Esto cierra una de las cuatro.
 *
 * ## Por qué importa más de lo que parece
 *
 * Un identificador duplicado **rompe hacia atrás**. `Modelo-Funcional-y-Reglas.md` dice *«Sistema:
 * UC-17 (webhook)»* y *«Administrador: UC-18–26»*, y `Matriz-Global-de-Trazabilidad.md` enlaza
 * `RN-50 webhook HMAC → UC-17`. Esas tres referencias eran correctas cuando se escribieron y **dejaron
 * de serlo sin cambiar una letra**: ahora apuntan a dos sitios y no hay forma de saber a cuál.
 *
 * Es la familia de H-016 —*un documento con citas rotas se lee con confianza y es falso*— con un
 * agravante: aquí **ni siquiera hay una cita rota que seguir**. La referencia resuelve, sólo que a dos
 * cosas.
 *
 * ## Qué mide, y qué NO mide
 *
 * Mide **la clave de fila** de cada catálogo maestro: la primera celda de una fila de tabla. No mide las
 * menciones en prosa —un documento puede nombrar `UC-17` cuantas veces quiera— porque lo que tiene que
 * ser único es **la definición**, no la referencia.
 *
 * Distingue sufijos: `RN-64` y `RN-64b` son identificadores distintos y **no** colisionan. Se dice
 * porque la primera versión de esta guarda los acusó, comparando por prefijo — el mismo defecto de medir
 * la forma en vez de la cosa que este repositorio lleva toda la jornada corrigiendo.
 */
const RAIZ = raizDelMonorepo();

/** Los catálogos que **definen** identificadores, con el prefijo que cada uno gobierna. */
const CATALOGOS: Array<{ fichero: string; prefijo: string }> = [
  { fichero: 'docs-v2/transversal/Catalogo-Maestro-de-Casos-de-Uso.md', prefijo: 'UC' },
  { fichero: 'docs-v2/transversal/Catalogo-Maestro-de-Reglas.md', prefijo: 'RN' },
  { fichero: 'docs-v2/transversal/Registro-Maestro-de-ADR.md', prefijo: 'ADR' },
];

/**
 * Claves de fila de un catálogo: la primera celda de cada fila de tabla, cuando es un identificador.
 *
 * El identificador se toma **entero** —dígitos y el sufijo alfabético que lleve— para que `RN-64` y
 * `RN-64b` no se confundan.
 */
function clavesDeFila(ruta: string, prefijo: string): Array<{ id: string; linea: number }> {
  const patron = new RegExp(`^\\|\\s*\\*{0,2}(${prefijo}-\\d+[a-z]?)\\b`);
  const salida: Array<{ id: string; linea: number }> = [];

  readFileSync(join(RAIZ, ruta), 'utf-8')
    .split('\n')
    .forEach((l, i) => {
      const m = patron.exec(l);
      if (m) salida.push({ id: m[1], linea: i + 1 });
    });

  return salida;
}

/** Los identificadores que aparecen más de una vez como clave de fila. */
function colisiones(claves: Array<{ id: string; linea: number }>): Record<string, number[]> {
  const porId: Record<string, number[]> = {};
  for (const { id, linea } of claves) (porId[id] ??= []).push(linea);
  return Object.fromEntries(Object.entries(porId).filter(([, ls]) => ls.length > 1));
}

describe('Un identificador nombra una sola cosa — PT-191', () => {
  for (const { fichero, prefijo } of CATALOGOS) {
    describe(`${prefijo} — ${fichero.split('/').pop()}`, () => {
      const claves = clavesDeFila(fichero, prefijo);

      it(`C1: ningun ${prefijo}-NN se define dos veces`, () => {
        expect(colisiones(claves)).toEqual({});
      });

      it('AC-01 (control): el catalogo se esta leyendo de verdad', () => {
        // Sin esto, un fichero movido o un patrón que no casa daría cero claves y **cero colisiones**:
        // verde por no medir nada. Es el modo exacto en que una guarda se vuelve inútil sin dejar de
        // existir, y hoy ya ocurrió una vez (la guarda de `core` se leía a sí misma).
        expect(claves.length).toBeGreaterThan(20);
      });
    });
  }

  describe('casos de control de la propia medicion', () => {
    it('AC-02: un duplicado fabricado SI se detecta', () => {
      const falsas = [
        { id: 'UC-17', linea: 43 },
        { id: 'UC-18', linea: 44 },
        { id: 'UC-17', linea: 46 },
      ];

      expect(colisiones(falsas)).toEqual({ 'UC-17': [43, 46] });
    });

    it('AC-03: un sufijo hace un identificador DISTINTO — `RN-64` y `RN-64b` no colisionan', () => {
      // La primera versión de esta guarda los acusaba, comparando por prefijo. `RN-64b` es la regla de
      // quién confirma la recepción (PT-174); `RN-64` es el holdback. Son dos reglas.
      const reales = [
        { id: 'RN-64', linea: 105 },
        { id: 'RN-64b', linea: 106 },
      ];

      expect(colisiones(reales)).toEqual({});
    });
  });
});
