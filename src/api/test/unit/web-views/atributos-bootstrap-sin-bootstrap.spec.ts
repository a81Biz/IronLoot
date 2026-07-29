import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-139 (RULE-19, segunda mitad) — Ninguna plantilla usa `data-bs-*` si Bootstrap no esta cargado.
 *
 * `refunds.html` abria su modal con `data-bs-toggle="modal"` y lo cerraba con `data-bs-dismiss`.
 * **ADMIN no tiene Bootstrap en ninguna parte**: su layout carga `ui-behaviours.js` y `admin.js`, y
 * ninguno maneja modales.
 *
 * El boton «+ Crear reembolso» no abria nada. Sin error en consola, sin fallo de suite: los
 * `data-bs-*` son atributos inertes para un navegador que no tiene quien los lea.
 *
 * **Reembolsos toca dinero**, y esa pantalla llevaba asi desde que se escribio.
 */
const RAIZ = raizDelMonorepo();

/** Cada sitio, con las carpetas donde puede vivir su JavaScript. */
const SITIOS = [
  { nombre: 'admin', vistas: 'src/admin/views', js: ['src/admin/public/js'] },
  { nombre: 'base', vistas: 'src/apps/base/views', js: ['src/apps/base/public/js'] },
  { nombre: 'client', vistas: 'src/apps/client/views', js: ['src/apps/client/public/js'] },
];

function ficheros(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((e) => {
    const r = join(dir, e);
    if (statSync(r).isDirectory()) return ficheros(r, ext);
    return r.endsWith(ext) ? [r] : [];
  });
}

/** Los atributos `data-bs-*` que usa una plantilla, con su nombre completo. */
export function atributosBootstrap(html: string): string[] {
  return [...new Set([...html.matchAll(/\b(data-bs-[a-z-]+)=/g)].map((m) => m[1]))];
}

/**
 * ¿Hay Bootstrap en este sitio?
 *
 * Se busca en las plantillas —un `<script src>` o un `<link>` a Bootstrap— y en su JavaScript. No se
 * mira `node_modules`: que un paquete este instalado no significa que el navegador lo reciba, y esa
 * confusion es justo la que produce este defecto.
 */
export function tieneBootstrap(textos: string[]): boolean {
  return textos.some((t) => /bootstrap(\.bundle)?(\.min)?\.(js|css)|bootstrap@\d/i.test(t));
}

describe('Ningun `data-bs-*` sin Bootstrap — RULE-19 (PT-139)', () => {
  const sitios = SITIOS.map((s) => {
    const plantillas = ficheros(join(RAIZ, s.vistas), '.html');
    const scripts = s.js.flatMap((d) => ficheros(join(RAIZ, d), '.js'));
    const contenidos = [...plantillas, ...scripts].map((f) => readFileSync(f, 'utf8'));
    return { ...s, plantillas, hayBootstrap: tieneBootstrap(contenidos) };
  });

  it('hay sitios que revisar', () => {
    expect(sitios.every((s) => s.plantillas.length > 0)).toBe(true);
  });

  it.each(sitios)('$nombre: sin Bootstrap, sin `data-bs-*`', (sitio) => {
    if (sitio.hayBootstrap) return; // si esta cargado, los atributos son legitimos

    const culpables = sitio.plantillas.flatMap((p) => {
      const attrs = atributosBootstrap(readFileSync(p, 'utf8'));
      return attrs.length
        ? [`${p.replace(RAIZ, '').replace(/\\/g, '/')} -> ${attrs.join(', ')}`]
        : [];
    });

    expect(culpables).toEqual([]);
  });

  describe('casos de control', () => {
    it('C1: `data-bs-toggle` se detecta', () => {
      expect(atributosBootstrap('<button data-bs-toggle="modal">x</button>')).toEqual([
        'data-bs-toggle',
      ]);
    });

    it('C2: varios atributos distintos, sin duplicar', () => {
      const html = '<div data-bs-target="#m" data-bs-dismiss="modal" data-bs-target="#n">';

      expect(atributosBootstrap(html)).toEqual(['data-bs-target', 'data-bs-dismiss']);
    });

    it('C3: un `data-` normal no se acusa', () => {
      // Los `data-*` propios son la forma correcta de colgar comportamiento; solo molestan los de
      // una libreria que no esta.
      expect(atributosBootstrap('<div data-auction-id="7" data-estado="activo">')).toEqual([]);
    });

    it('C4: se detecta Bootstrap cargado por `<script src>`', () => {
      expect(tieneBootstrap(['<script src="/vendor/bootstrap.bundle.min.js"></script>'])).toBe(
        true,
      );
    });

    it('C5: se detecta por hoja de estilos', () => {
      expect(tieneBootstrap(['<link rel="stylesheet" href="/css/bootstrap.min.css">'])).toBe(true);
    });

    it('C6: una mencion en un comentario NO cuenta como cargado', () => {
      // Si contara, bastaria un comentario para desactivar la guarda — y este repositorio ya sabe
      // que un comentario dice que alguien penso en ello, no que sea cierto (F-34).
      expect(tieneBootstrap(['<!-- aqui iria bootstrap algun dia -->'])).toBe(false);
    });
  });
});
