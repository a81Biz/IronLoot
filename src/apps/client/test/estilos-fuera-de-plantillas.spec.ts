import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, sep } from "path";

/**
 * PT-105 (TD-014) — Los estilos viven en el CSS, no en el marcado.
 *
 * PT-096 retiró `'unsafe-inline'` de `script-src` —donde el riesgo es ejecutar código— y dejó
 * `style-src` con él. PT-103, al comprobar ese cierre, encontró la mitad pendiente y la registró
 * como TD-014. Esto la cierra.
 *
 * El riesgo aquí es menor que el de PT-096: sin `script-src`, quien inyecte marcado sólo puede
 * afeaar la página. Lo que no es menor es el **silencio**: con la CSP ya cerrada, un `style=`
 * nuevo no se aplica y el navegador no dice nada — el elemento simplemente se ve mal. Es el mismo
 * silencio de F-34 en otra directiva, y por eso hace falta una guarda y no sólo una convención.
 */
describe("Los estilos viven en el CSS, no en el marcado (PT-105)", () => {
  const RAIZ = join(__dirname, "..", "..", "..");

  const SITIOS = [
    ["CLIENT", join(RAIZ, "apps", "client", "views")],
    ["BASE", join(RAIZ, "apps", "base", "views")],
    ["ADMIN", join(RAIZ, "admin", "views")],
  ] as const;

  const MAINS = [
    ["CLIENT", join(RAIZ, "apps", "client", "src", "main.ts")],
    ["BASE", join(RAIZ, "apps", "base", "src", "main.ts")],
    ["ADMIN", join(RAIZ, "admin", "src", "main.ts")],
  ] as const;

  /** Los comentarios de Nunjucks se descartan: un comentario que explique por qué el estilo ya
   *  no está ahí no puede hacer fallar la guarda. Le pasó a PT-096. */
  const sinComentarios = (t: string): string =>
    t.replace(/\{#[\s\S]*?#\}/g, "");

  const ATRIBUTO_STYLE = /<[^>]*\sstyle\s*=\s*["'][^"']/i;
  const BLOQUE_STYLE =
    /<style(?![^>]*\ssrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/style>/i;

  function plantillas(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return plantillas(ruta);
      return ruta.endsWith(".html") ? [ruta] : [];
    });
  }

  /** El contenido de `styleSrc: [...]` dentro de un main.ts. */
  const styleSrcDe = (fuente: string): string => {
    const m = fuente.match(/styleSrc\s*:\s*\[([^\]]*)\]/);
    return m ? m[1] : "";
  };

  describe.each(SITIOS)("%s", (_nombre, dir) => {
    const ficheros = plantillas(dir);

    it("ES-00: tiene plantillas que revisar", () => {
      expect(ficheros.length).toBeGreaterThan(0);
    });

    it("ES-01: ninguna plantilla lleva un atributo `style=`", () => {
      const culpables = ficheros
        .filter((f) =>
          ATRIBUTO_STYLE.test(sinComentarios(readFileSync(f, "utf8"))),
        )
        .map((f) =>
          f
            .slice(RAIZ.length + 1)
            .split(sep)
            .join("/"),
        );

      expect(culpables.join("\n")).toBe("");
    });

    it("ES-02: ninguna plantilla lleva un `<style>` con cuerpo", () => {
      const culpables = ficheros
        .filter((f) =>
          BLOQUE_STYLE.test(sinComentarios(readFileSync(f, "utf8"))),
        )
        .map((f) =>
          f
            .slice(RAIZ.length + 1)
            .split(sep)
            .join("/"),
        );

      expect(culpables.join("\n")).toBe("");
    });
  });

  it.each(MAINS)(
    "ES-03: la CSP de %s no lleva `unsafe-inline` en style-src",
    (_n, ruta) => {
      const styleSrc = styleSrcDe(readFileSync(ruta, "utf8"));

      expect(styleSrc).not.toBe("");
      expect(styleSrc).not.toContain("unsafe-inline");
    },
  );

  it("ES-04: la guarda RECHAZA un `style=` inventado (control)", () => {
    expect(
      ATRIBUTO_STYLE.test('<div class="x" style="color:red">hola</div>'),
    ).toBe(true);
  });

  it("ES-05: la guarda NO acusa a un `style=` dentro de un comentario (control)", () => {
    // Pasó en PT-096: el comentario que explicaba el cambio hacía fallar la guarda del cambio.
    const conComentario =
      '{# antes esto era style="color:red" #}\n<div class="rojo"></div>';

    expect(ATRIBUTO_STYLE.test(sinComentarios(conComentario))).toBe(false);
  });
});
