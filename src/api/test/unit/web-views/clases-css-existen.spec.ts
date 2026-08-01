import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-224 (R-041 · H-UI-036) — **Una clase que ningún CSS define no falla: se ve mal.**
 *
 * Las dos páginas 404 —BASE y CLIENT— estaban escritas con clases de DaisyUI: `hero`, `min-h-screen`,
 * `bg-base-200`, `max-w-md`, `text-5xl`, `py-6`, `font-bold`, `text-4xl`, `text-error`, `mb-4`, `p-5`,
 * `text-xl`. **Ninguna de las doce existe** en `base.css` (1.182 líneas) ni en `client.css` (805).
 *
 * El proyecto retiró el framework por ADR-002 (`PRD §4`, SSR Nunjucks sin framework frontend) y el
 * marcado se quedó. Resultado: **la pantalla de error aparece rota justo cuando el usuario ya está
 * desorientado**, lo que sugiere un fallo grave del sitio y no una URL incorrecta.
 *
 * ## Es la misma familia que la CSP
 *
 * `CLAUDE.md` ya lo dice de los estilos en línea: *«un `style=` o un manejador `onclick=` nuevo no
 * funcionará y el navegador no dirá nada — sólo se verá mal»*. Una clase inexistente es exactamente eso,
 * por otra vía, y **no había nada que lo vigilara**.
 *
 * ## Lo que la guarda tolera, declarado
 *
 * Las clases que **añade el JavaScript** en tiempo de ejecución no aparecen en el marcado, así que este
 * sentido de la comprobación no las ve. El sentido contrario —CSS definido y nunca usado— no se
 * comprueba: sobra código muerto, pero no rompe nada al usuario, y una guarda con falsos positivos
 * acaba borrada (PT-103).
 */
const RAIZ = raizDelMonorepo();

interface Sitio {
  nombre: string;
  vistas: string;
  css: string[];
}

const SITIOS: Sitio[] = [
  {
    nombre: 'BASE',
    vistas: join(RAIZ, 'src/apps/base/views'),
    css: [join(RAIZ, 'src/apps/base/public/css/base.css')],
  },
  {
    nombre: 'CLIENT',
    vistas: join(RAIZ, 'src/apps/client/views'),
    css: [join(RAIZ, 'src/apps/client/public/css/client.css')],
  },
];

/**
 * Las clases que declara el marcado.
 *
 * Se retiran antes las etiquetas de Nunjucks: sin eso, un `class="a {% if x %}b{% endif %}"` produce las
 * «clases» `if`, `x` y `endif`, y la guarda se acusa a sí misma leyendo prosa de plantilla — el patrón
 * que PT-128 y PT-132 ya pagaron.
 */
export function clasesDelMarcado(html: string): string[] {
  const limpio = html.replace(/\{%[\s\S]*?%\}/g, ' ').replace(/\{\{[\s\S]*?\}\}/g, ' ');
  const out = new Set<string>();
  for (const m of limpio.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) out.add(c);
  }
  return [...out];
}

/** Las clases que define una hoja de estilos. */
export function clasesDelCss(css: string): Set<string> {
  return new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));
}

function plantillas(dir: string, prefijo = ''): { nombre: string; html: string }[] {
  const out: { nombre: string; html: string }[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...plantillas(join(dir, e.name), `${prefijo}${e.name}/`));
    else if (e.name.endsWith('.html'))
      out.push({ nombre: `${prefijo}${e.name}`, html: readFileSync(join(dir, e.name), 'utf8') });
  }
  return out;
}

describe('Toda clase del marcado existe en el CSS del sitio — PT-224', () => {
  it.each(SITIOS.map((s) => [s.nombre, s] as const))(
    '%s: ninguna plantilla usa una clase que ningún CSS define',
    (nombreSitio, sitio) => {
      const definidas = new Set<string>();
      for (const ruta of sitio.css)
        for (const c of clasesDelCss(readFileSync(ruta, 'utf8'))) definidas.add(c);

      const vistas = plantillas(sitio.vistas);

      // Sin estas dos, un renombrado de carpeta deja la guarda comparando el vacío y saliendo en verde.
      expect(vistas.length).toBeGreaterThan(10);
      expect(definidas.size).toBeGreaterThan(50);

      const huerfanas: string[] = [];
      for (const { nombre, html } of vistas)
        for (const clase of clasesDelMarcado(html))
          if (!definidas.has(clase)) huerfanas.push(`${nombreSitio} ${nombre}: .${clase}`);

      expect(huerfanas).toEqual([]);
    },
  );

  describe('casos de control', () => {
    it('C1: detecta una clase que el CSS no define', () => {
      const definidas = clasesDelCss('.btn { color: red; }');
      expect(clasesDelMarcado('<div class="btn min-h-screen">')).toEqual(['btn', 'min-h-screen']);
      expect(definidas.has('min-h-screen')).toBe(false);
    });

    it('C2: NO confunde las etiquetas de Nunjucks con clases', () => {
      expect(clasesDelMarcado('<div class="a {% if x %}b{% endif %}">')).toEqual(['a', 'b']);
      expect(clasesDelMarcado('<div class="n {{ extra }}">')).toEqual(['n']);
    });

    it('C3: lee las clases de un selector compuesto', () => {
      expect([...clasesDelCss('.nav-item.active { }')]).toEqual(['nav-item', 'active']);
    });
  });
});
