import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-139 (RULE-19) — Todo `{% block X %}` de una plantilla esta declarado en su layout.
 *
 * Nunjucks **descarta en silencio** el contenido de un bloque que el padre no declara. No hay error,
 * no hay aviso en consola, no falla ninguna suite: simplemente el contenido no llega a la pagina.
 *
 * `reconciliation.html` metia su `<script>` dentro de `{% block title %}`, y `layouts/admin.html`
 * declara solo `head`, `content` y `scripts`. Resultado: `pages-reconciliation.js` existe —1749 B,
 * extraido en PT-096— y **nunca se carga**. El boton «Conciliar» no hace nada desde entonces.
 *
 * De donde salio el error: BASE y CLIENT **si** declaran `{% block title %}` en sus layouts. Alguien
 * copio el idioma correcto de otro sitio a un layout que no lo soporta.
 *
 * Es la firma de F-34 —la puja en vivo apagada varios dias con la suite entera en verde— y de la
 * regla de CSP sin `'unsafe-inline'`: **fallan en silencio, y el silencio es lo que los hace durar**.
 */
const RAIZ = raizDelMonorepo();

/** Los tres sitios que renderizan Nunjucks. */
const SITIOS = ['src/admin/views', 'src/apps/base/views', 'src/apps/client/views'];

function plantillas(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((e) => {
    const r = join(dir, e);
    if (statSync(r).isDirectory()) return plantillas(r);
    return r.endsWith('.html') ? [r] : [];
  });
}

/** Los bloques que una plantilla **usa**. */
export function bloquesUsados(html: string): string[] {
  return [...new Set([...html.matchAll(/\{%\s*block\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]))];
}

/** El layout del que hereda una plantilla, si hereda de alguno. */
export function layoutDe(html: string): string | null {
  return html.match(/\{%\s*extends\s+['"]([^'"]+)['"]/)?.[1] ?? null;
}

/**
 * Los bloques que un layout **declara**, siguiendo su propia cadena de `extends`.
 *
 * Un layout puede heredar de otro: los bloques del abuelo tambien valen.
 */
function bloquesDeclarados(
  rutaLayout: string,
  baseViews: string,
  vistos = new Set<string>(),
): string[] {
  if (vistos.has(rutaLayout) || !existsSync(rutaLayout)) return [];
  vistos.add(rutaLayout);

  const html = readFileSync(rutaLayout, 'utf8');
  const propios = bloquesUsados(html);

  const padre = layoutDe(html);
  if (!padre) return propios;

  return [...propios, ...bloquesDeclarados(join(baseViews, padre), baseViews, vistos)];
}

describe('Todo bloque de plantilla existe en su layout — RULE-19 (PT-139)', () => {
  const casos = SITIOS.flatMap((sitio) => {
    const baseViews = join(RAIZ, sitio);
    return plantillas(baseViews)
      .filter((p) => !p.replace(/\\/g, '/').includes('/layouts/'))
      .map((p) => ({ sitio, ruta: p, rel: p.replace(RAIZ, '').replace(/\\/g, '/'), baseViews }));
  });

  it('hay plantillas que revisar', () => {
    // Si esto fallara, lo de abajo pasaria vacuamente.
    expect(casos.length).toBeGreaterThan(20);
  });

  it('ninguna plantilla usa un bloque que su layout no declara', () => {
    const huerfanos = casos.flatMap(({ ruta, rel, baseViews }) => {
      const html = readFileSync(ruta, 'utf8');
      const padre = layoutDe(html);
      if (!padre) return []; // una plantilla suelta no hereda nada; no hay contrato que romper

      const declarados = new Set(bloquesDeclarados(join(baseViews, padre), baseViews));
      return bloquesUsados(html)
        .filter((b) => !declarados.has(b))
        .map((b) => `${rel} usa {% block ${b} %} — ${padre} no lo declara`);
    });

    expect(huerfanos).toEqual([]);
  });

  describe('casos de control', () => {
    it('C1: un bloque que el layout NO declara se acusa', () => {
      expect(bloquesUsados('{% block inventado %}hola{% endblock %}')).toEqual(['inventado']);
    });

    it('C2: los bloques del layout se leen igual', () => {
      expect(
        bloquesUsados('{% block head %}{% endblock %}{% block content %}{% endblock %}'),
      ).toEqual(['head', 'content']);
    });

    it('C3: el `extends` se resuelve', () => {
      expect(layoutDe('{% extends "layouts/admin.html" %}')).toBe('layouts/admin.html');
    });

    it('C4: una plantilla sin `extends` no revienta', () => {
      expect(layoutDe('<h1>suelta</h1>')).toBeNull();
    });

    it('C5: no se cuelan duplicados', () => {
      expect(bloquesUsados('{% block a %}{% endblock %}{% block a %}{% endblock %}')).toEqual([
        'a',
      ]);
    });

    it('C6: `{% endblock %}` no se confunde con una declaracion', () => {
      expect(bloquesUsados('{% block x %}texto{% endblock %}')).toEqual(['x']);
    });
  });
});
