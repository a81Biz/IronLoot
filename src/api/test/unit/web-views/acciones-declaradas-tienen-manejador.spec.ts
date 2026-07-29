import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-160 (RULE-30) — Toda `data-accion` declarada en una plantilla tiene quien la atienda.
 *
 * ## Lo que se midió el 2026-07-29
 *
 * ADMIN despacha acciones con un puente: la plantilla escribe `data-accion="conciliar"`,
 * `ui-behaviours.js` busca esa clave en `window.accionesAdmin`, y el script de la página la
 * registra. Es un buen mecanismo — el marcado declara QUÉ quiere y el script decide CÓMO, sin
 * volver a meter código en el HTML, que es lo que la CSP sin `'unsafe-inline'` impide.
 *
 * **Nadie registraba nada.** Las tres acciones declaradas en todo ADMIN estaban muertas:
 *
 *   - `abrir-rechazo`  · `moderation.html` — el botón «Rechazar» no abría el modal
 *   - `cerrar-rechazo` · `moderation.html`
 *   - `conciliar`      · `reconciliation.html` — el botón no consultaba nada
 *
 * En el panel que aprueba y rechaza subastas.
 *
 * ## Por qué era invisible
 *
 * `ui-behaviours.js` comprueba `typeof accion === 'function'` antes de llamar y **calla** si no la
 * encuentra. Es lo correcto para no reventar la página, y es exactamente lo que hace que el fallo no
 * deje rastro: sin excepción, sin log, sin nada en consola. Sólo un botón que no responde.
 *
 * ## La causa de fondo, que es la que importa
 *
 * PT-096 sacó el JavaScript de las plantillas para poder retirar `'unsafe-inline'` de la CSP, y lo
 * movió **«tal cual»** — con la intención correcta de no mezclar mudanza con cambio de
 * comportamiento. Pero «tal cual» dejó fuera los `onclick=` que cableaban esas funciones, porque los
 * `onclick` vivían en el HTML, no en el bloque `<script>`.
 *
 * Es la tercera vez que aparece: PT-139 encontró dos controles muertos por lo mismo (los `data-bs-*`
 * de Bootstrap sin Bootstrap), y esta es la tercera y cuarta y quinta. **Se corrigieron dos casos y
 * no se escribió el mecanismo**, así que quedaron tres esperando. Esta guarda es el mecanismo.
 *
 * Familia directa de F-34 —los 24 manejadores muertos, incluidos los `confirm()` que debían
 * preguntar antes de una acción destructiva— y de RULE-19.
 */
const RAIZ = raizDelMonorepo();

const VISTAS = join(RAIZ, 'src/admin/views');
const JS = join(RAIZ, 'src/admin/public/js');

function ficheros(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const salida: string[] = [];

  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) salida.push(...ficheros(p, ext));
    else if (e.name.endsWith(ext)) salida.push(p);
  }

  return salida;
}

/** Las acciones que un marcado declara: `data-accion="abrir-rechazo"`. */
export function accionesDeclaradas(html: string): string[] {
  return [...new Set([...html.matchAll(/data-accion=["']([^"']+)["']/g)].map((m) => m[1]))];
}

/**
 * Las acciones que un script registra.
 *
 * Se aceptan las dos formas que el repositorio usa —índice y propiedad— porque exigir una sola
 * obligaría a reescribir código correcto para contentar a una prueba.
 */
export function accionesRegistradas(js: string): string[] {
  const sinComentarios = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  return [
    ...new Set([
      ...[...sinComentarios.matchAll(/accionesAdmin\[["']([^"']+)["']\]\s*=/g)].map((m) => m[1]),
      ...[...sinComentarios.matchAll(/accionesAdmin\.(\w[\w-]*)\s*=/g)].map((m) => m[1]),
    ]),
  ];
}

describe('Toda `data-accion` tiene manejador — RULE-30 (PT-160)', () => {
  const plantillas = ficheros(VISTAS, '.html');
  const scripts = ficheros(JS, '.js');

  const declaradas = new Map<string, string>();
  for (const p of plantillas) {
    for (const a of accionesDeclaradas(readFileSync(p, 'utf8'))) {
      if (!declaradas.has(a)) declaradas.set(a, p.replace(RAIZ, '').replace(/\\/g, '/'));
    }
  }

  const registradas = new Set(scripts.flatMap((s) => accionesRegistradas(readFileSync(s, 'utf8'))));

  it('se han leido plantillas y scripts — si no, la guarda no compara nada', () => {
    // Sin esto, un cambio de rutas dejaría la guarda pasando en vacío: cero declaradas, cero
    // huérfanas, verde. Es como una guarda deja de proteger sin que nadie lo note.
    expect(plantillas.length).toBeGreaterThan(5);
    expect(scripts.length).toBeGreaterThan(3);
  });

  it('C1: ninguna accion declarada se queda sin manejador', () => {
    const huerfanas = [...declaradas.entries()]
      .filter(([a]) => !registradas.has(a))
      .map(([a, donde]) => `${a} (declarada en ${donde}) no la registra ningun script`);

    expect(huerfanas).toEqual([]);
  });

  it('C2: se declara al menos una accion — si no, C1 pasa en vacio', () => {
    expect(declaradas.size).toBeGreaterThan(0);
  });

  describe('casos de control', () => {
    it('AC-01: una accion declarada y no registrada se detecta', () => {
      const declaradasDePrueba = accionesDeclaradas('<button data-accion="fantasma">x</button>');
      const registradasDePrueba = accionesRegistradas("accionesAdmin['otra'] = f;");

      expect(declaradasDePrueba).toEqual(['fantasma']);
      expect(registradasDePrueba).not.toContain('fantasma');
    });

    it('AC-02: se acepta la forma de indice y la de propiedad', () => {
      const js = [
        "accionesAdmin['abrir-rechazo'] = abrir;",
        'accionesAdmin.conciliar = cargar;',
      ].join('\n');

      expect(accionesRegistradas(js).sort()).toEqual(['abrir-rechazo', 'conciliar']);
    });

    it('AC-03: un comentario que nombra una accion no la registra', () => {
      // El patron de siempre: una guarda que lee prosa se acusa a si misma. Le paso a tres guardas
      // de este repositorio antes de servir para nada.
      const js = [
        "// antes esto era accionesAdmin['vieja'] = f;",
        "/* accionesAdmin['tampoco'] = g; */",
        "accionesAdmin['real'] = h;",
      ].join('\n');

      expect(accionesRegistradas(js)).toEqual(['real']);
    });
  });
});
