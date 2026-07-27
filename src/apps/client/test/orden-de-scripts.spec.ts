import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

/**
 * PT-102 (F-34) — Una plantilla carga sus dependencias antes de usarlas.
 *
 * La puja en vivo estuvo apagada y **nadie se enteró**. `pages-auction-detail.js` llamaba a
 * `io('/auctions', …)` cuando `io` todavía no existía, porque su `<script>` iba **delante** del
 * de socket.io; el `ReferenceError` lo recogía un `catch` vacío rotulado *«live feed is
 * optional»*. La página funcionaba. El producto, no.
 *
 * Lo introdujo PT-096 al sacar el JavaScript de las plantillas: el contenido se movió tal cual,
 * pero la **posición** también era un contrato, y esa se perdió. Antes del refactor el CDN iba
 * primero.
 *
 * Lo que fija esta guarda: si una plantilla carga un script propio que usa un global definido por
 * un script externo, el externo va **antes** y **ambos llevan `defer`**. Es estática —lee
 * ficheros— así que corre en milisegundos, en el hook de pre-commit y en cualquier CI, sin red ni
 * Docker. La prueba de dos navegadores (`32-puja-en-vivo.cjs`) comprueba lo otro: que el usuario
 * vea subir el precio.
 */

/** Un global que define un script externo, y cómo reconocer ese script. */
interface Externo {
  /** El global que publica; p. ej. `io`. */
  global: string;
  /** Trozo identificable de su URL. */
  urlContiene: string;
}

const EXTERNOS: Externo[] = [
  { global: "io", urlContiene: "socket.io" },
  { global: "Chart", urlContiene: "chart.js" },
];

interface Etiqueta {
  src: string;
  defer: boolean;
  /** Posición en el documento, para poder comparar quién va antes. */
  orden: number;
}

/** Las etiquetas `<script src=…>` en el orden en que el navegador las ejecutará. */
export function etiquetasDeScript(html: string): Etiqueta[] {
  const sinComentarios = html.replace(/\{#[\s\S]*?#\}/g, "");
  const etiquetas: Etiqueta[] = [];
  const re = /<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>/gi;
  let m: RegExpExecArray | null;
  let orden = 0;
  while ((m = re.exec(sinComentarios)) !== null) {
    const atributos = `${m[1]} ${m[3]}`;
    etiquetas.push({
      src: m[2],
      defer: /\bdefer\b/i.test(atributos),
      orden: orden++,
    });
  }
  return etiquetas;
}

/** Una infracción concreta, redactada para que se entienda sin abrir el fichero. */
export interface Infraccion {
  plantilla: string;
  motivo: string;
}

/**
 * El análisis, aislado de los ficheros a propósito: así puede probarse contra un caso de control
 * inventado. Una guarda que solo ha visto verde no ha demostrado que sepa ver rojo.
 *
 * @param leerPropio devuelve el contenido de un script propio (`/js/...`), o `null` si no existe.
 */
export function infracciones(
  nombre: string,
  html: string,
  leerPropio: (src: string) => string | null,
): Infraccion[] {
  const etiquetas = etiquetasDeScript(html);
  const fallos: Infraccion[] = [];

  for (const externo of EXTERNOS) {
    const elExterno = etiquetas.find((e) =>
      e.src.toLowerCase().includes(externo.urlContiene),
    );
    if (!elExterno) continue;

    // Scripts propios de esta plantilla que usan el global del externo.
    const usuarios = etiquetas.filter((e) => {
      if (e === elExterno || !e.src.startsWith("/")) return false;
      const cuerpo = leerPropio(e.src);
      if (cuerpo === null) return false;
      return new RegExp(`\\b${externo.global}\\s*\\(`).test(cuerpo);
    });

    for (const usuario of usuarios) {
      if (usuario.orden < elExterno.orden) {
        fallos.push({
          plantilla: nombre,
          motivo:
            `${usuario.src} usa \`${externo.global}\` y se ejecuta ANTES que ` +
            `${elExterno.src}, que es quien lo define`,
        });
      }
      if (!usuario.defer || !elExterno.defer) {
        fallos.push({
          plantilla: nombre,
          motivo:
            `${usuario.src} depende de ${elExterno.src}: ambos deben llevar \`defer\` ` +
            `(hoy: ${usuario.src}=${usuario.defer}, ${elExterno.src}=${elExterno.defer}). ` +
            `Sin él el orden lo decide la posición, y la posición se mueve`,
        });
      }
    }
  }

  return fallos;
}

describe("Una plantilla carga sus dependencias antes de usarlas (PT-102)", () => {
  const RAIZ = join(__dirname, "..", "..", "..");
  const VISTAS = join(RAIZ, "apps", "client", "views");
  const PUBLICO = join(RAIZ, "apps", "client", "public");

  function plantillas(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return plantillas(ruta);
      return ruta.endsWith(".html") ? [ruta] : [];
    });
  }

  const leerPropio = (src: string): string | null => {
    const ruta = join(PUBLICO, src.replace(/^\//, "").split("?")[0]);
    return existsSync(ruta) ? readFileSync(ruta, "utf8") : null;
  };

  const ficheros = plantillas(VISTAS);

  it("OS-03: ninguna plantilla de CLIENT usa un global antes de cargarlo", () => {
    const fallos = ficheros.flatMap((f) =>
      infracciones(
        f.slice(RAIZ.length + 1).replace(/\\/g, "/"),
        readFileSync(f, "utf8"),
        leerPropio,
      ),
    );

    expect(fallos.map((x) => `${x.plantilla}: ${x.motivo}`).join("\n")).toBe(
      "",
    );
  });

  it("OS-01: en el detalle de subasta, socket.io se carga antes que la puja", () => {
    // El caso concreto de F-34, fijado por su nombre para que un fallo diga qué se rompió.
    const html = readFileSync(
      join(VISTAS, "pages", "auction", "detail.html"),
      "utf8",
    );
    const etiquetas = etiquetasDeScript(html);
    const cdn = etiquetas.findIndex((e) => e.src.includes("socket.io"));
    const puja = etiquetas.findIndex((e) => e.src.includes("auction-detail"));

    expect(cdn).toBeGreaterThanOrEqual(0);
    expect(puja).toBeGreaterThanOrEqual(0);
    expect(cdn).toBeLessThan(puja);
  });

  it("OS-02: ambos scripts del detalle llevan `defer`", () => {
    const html = readFileSync(
      join(VISTAS, "pages", "auction", "detail.html"),
      "utf8",
    );
    const relevantes = etiquetasDeScript(html).filter(
      (e) => e.src.includes("socket.io") || e.src.includes("auction-detail"),
    );

    expect(relevantes).toHaveLength(2);
    expect(relevantes.every((e) => e.defer)).toBe(true);
  });

  it("OS-04: el SRI de socket.io sigue en su sitio (PT-089)", () => {
    // `defer` no es excusa para perder la integridad: si el CDN se compromete, el navegador debe
    // rechazar el fichero en vez de ejecutarlo.
    const html = readFileSync(
      join(VISTAS, "pages", "auction", "detail.html"),
      "utf8",
    );
    const etiqueta = html.match(/<script[^>]*socket\.io[^>]*>/i)?.[0] ?? "";

    expect(etiqueta).toContain("integrity=");
    expect(etiqueta).toContain("crossorigin=");
  });

  it("OS-05: el análisis RECHAZA el orden invertido (caso de control)", () => {
    // Sin esto, los cuatro tests de arriba podrían estar pasando por no mirar nada.
    // Es exactamente la forma que tenía `detail.html` cuando la puja en vivo estaba apagada.
    const roto = `
      <script src="/js/pages/pages-auction-detail.js"></script>
      <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"
              integrity="sha384-x" crossorigin="anonymous"></script>`;

    const fallos = infracciones(
      "control.html",
      roto,
      () => "const socket = io('/auctions', {});",
    );

    expect(fallos.length).toBeGreaterThan(0);
    expect(fallos.map((f) => f.motivo).join(" ")).toContain("ANTES");
  });

  it("OS-06: el análisis ACEPTA el orden correcto con `defer` (caso de control)", () => {
    const bien = `
      <script src="https://cdn.socket.io/4.7.5/socket.io.min.js" defer
              integrity="sha384-x" crossorigin="anonymous"></script>
      <script src="/js/pages/pages-auction-detail.js" defer></script>`;

    expect(
      infracciones("control.html", bien, () => "io('/auctions', {});"),
    ).toEqual([]);
  });
});
