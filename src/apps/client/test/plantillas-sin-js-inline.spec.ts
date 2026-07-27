import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

/**
 * PT-096 (TD-005 + TD-010) — Ninguna plantilla lleva JavaScript dentro.
 *
 * Los tres sitios declaran `script-src-attr 'none'`, que **bloquea los manejadores inline**. Los
 * 24 que había estaban muertos desde que se añadió la CSP, y nadie lo notó. Verificado en
 * navegador:
 *
 *     Executing inline event handler violates the following Content Security Policy
 *     directive 'script-src-attr 'none''
 *
 * El caso grave era `onsubmit="return confirm('¿Cancelar permanentemente?')"`: si el manejador no
 * corre, **nada devuelve `false`** y el formulario se envía igual. Las acciones destructivas del
 * panel se ejecutaban sin preguntar.
 *
 * Estas guardas son **estáticas** —leen los ficheros— así que corren en milisegundos y no
 * dependen de levantar nada. Viven en la suite de CLIENT porque es el único de los tres sitios
 * con infraestructura de tests (ver F-31: ADMIN no tiene).
 */
describe("Las plantillas no llevan JavaScript dentro (PT-096)", () => {
  const RAIZ = join(__dirname, "..", "..", "..");

  const SITIOS = [
    ["CLIENT", join(RAIZ, "apps", "client", "views")],
    ["BASE", join(RAIZ, "apps", "base", "views")],
    ["ADMIN", join(RAIZ, "admin", "views")],
  ] as const;

  /**
   * Los comentarios de Nunjucks se descartan antes de mirar nada.
   *
   * Sin esto, un comentario que MENCIONE `<script>` —para explicar por qué el código ya no está
   * ahí, por ejemplo— haría fallar la guarda. Le pasó a este mismo PT.
   */
  const sinComentarios = (t: string): string =>
    t.replace(/\{#[\s\S]*?#\}/g, "");

  function plantillas(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return plantillas(ruta);
      return ruta.endsWith(".html") ? [ruta] : [];
    });
  }

  /** Un `<script src=…>` es legítimo; lo que se persigue es el que lleva cuerpo. */
  const CON_CUERPO =
    /<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i;

  /** Atributos de evento en el marcado. `script-src-attr 'none'` los mata en silencio. */
  const MANEJADOR_INLINE =
    /\son(click|submit|change|input|load|focus|blur|keyup|keydown)\s*=/i;

  describe.each(SITIOS)("%s", (nombre, dir) => {
    const ficheros = plantillas(dir);

    it("tiene plantillas que revisar", () => {
      expect(ficheros.length).toBeGreaterThan(0);
    });

    it("ninguna plantilla usa un manejador de evento inline", () => {
      // Es lo que estaba roto: 24 manejadores que la CSP bloqueaba, incluidas las confirmaciones
      // antes de cancelar una subasta.
      const culpables = ficheros
        .filter((f) =>
          MANEJADOR_INLINE.test(sinComentarios(readFileSync(f, "utf8"))),
        )
        .map((f) => f.replace(dir, nombre));

      expect(culpables).toEqual([]);
    });

    it("ninguna plantilla lleva un `<script>` con cuerpo", () => {
      const culpables = ficheros
        .filter((f) => CON_CUERPO.test(sinComentarios(readFileSync(f, "utf8"))))
        .map((f) => f.replace(dir, nombre));

      expect(culpables).toEqual([]);
    });

    it("ninguna plantilla interpola `{{ }}` dentro de un script", () => {
      // Un valor interpolado dentro de un script obliga a que el script viva en la plantilla.
      // Si hace falta pasar un dato, va en un atributo `data-*`.
      const culpables = ficheros
        .filter((f) => {
          const t = sinComentarios(readFileSync(f, "utf8"));
          return [...t.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].some(
            (m) => /\{\{/.test(m[1]),
          );
        })
        .map((f) => f.replace(dir, nombre));

      expect(culpables).toEqual([]);
    });
  });
});
