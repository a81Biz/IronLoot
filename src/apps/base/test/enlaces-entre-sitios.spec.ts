import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * PT-207 (R-026 · H-UI-009) — **Un enlace a una ruta que el otro sitio no sirve devuelve 404.**
 *
 * El detalle público de subasta cerraba con «¿No tienes cuenta? Regístrate gratis» apuntando a
 * `{{ clientUrl }}/auth/register`. **El registro vive en BASE**, no en el portal privado: el CLIENT
 * sólo declara `/auth/logout`.
 *
 * Comprobado en vivo el 2026-07-31: `GET http://localhost:5175/auth/register` → **404**.
 *
 * Es el CTA de conversión en la única página donde un visitante anónimo ya demostró interés por un lote
 * concreto, y aterrizaba en un 404 **de otro dominio** — que además estaba sin estilos (PT-224).
 *
 * ## Por qué una guarda y no sólo el arreglo
 *
 * `clientUrl` se interpola en catorce sitios de BASE. Que el correcto sea uno u otro no lo dice el
 * compilador ni el linter: lo dice saber qué ruta sirve cada sitio. Sin guarda, el siguiente enlace de
 * autenticación que alguien mande al portal vuelve a producir un 404 silencioso.
 */
const VISTAS = join(__dirname, "..", "views");

/** Rutas que sirve BASE y que, por tanto, NUNCA deben enviarse al portal privado. */
const RUTAS_DE_BASE = [
  "/auth/register",
  "/auth/login",
  "/auth/recovery",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/verify-email-pending",
  "/about",
  "/contact",
  "/privacy",
  "/static/terms",
];

function plantillas(
  dir: string,
  prefijo = "",
): { nombre: string; contenido: string }[] {
  const out: { nombre: string; contenido: string }[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory())
      out.push(...plantillas(join(dir, e.name), `${prefijo}${e.name}/`));
    else if (e.name.endsWith(".html"))
      out.push({
        nombre: `${prefijo}${e.name}`,
        contenido: readFileSync(join(dir, e.name), "utf8"),
      });
  }
  return out;
}

/** Los destinos `{{ clientUrl }}/…` que una plantilla declara. */
export function destinosAlPortal(contenido: string): string[] {
  return [
    // El destino puede llevar interpolaciones —`/auctions/{{ auction.id }}`—, y dentro de `{{ }}` hay
    // espacios. Cortar en el primer espacio dejaba el destino en `/auctions/{{`, que no casa con nada.
    ...contenido.matchAll(
      /\{\{\s*clientUrl\s*\}\}(\/(?:[^"'\s{]|\{\{[^}]*\}\})*)/g,
    ),
  ].map((m) => m[1].replace(/\{\{[^}]*\}\}/g, ":param").replace(/\/$/, ""));
}

describe("BASE no manda al portal privado rutas que sirve él mismo — PT-207", () => {
  const todas = plantillas(VISTAS);

  it("se han leído plantillas — si no, la guarda no compara nada", () => {
    expect(todas.length).toBeGreaterThan(10);
  });

  it("ningún enlace `{{ clientUrl }}/…` apunta a una ruta de BASE", () => {
    const rotos: string[] = [];
    for (const { nombre, contenido } of todas) {
      for (const destino of destinosAlPortal(contenido)) {
        if (RUTAS_DE_BASE.includes(destino)) {
          rotos.push(
            `${nombre}: {{ clientUrl }}${destino} — esa ruta la sirve BASE, no el portal`,
          );
        }
      }
    }
    expect(rotos).toEqual([]);
  });

  describe("casos de control", () => {
    it("C1: detecta el enlace exacto que producía el 404", () => {
      expect(
        destinosAlPortal(
          '<a href="{{ clientUrl }}/auth/register">Regístrate</a>',
        ),
      ).toEqual(["/auth/register"]);
    });

    it("C2: NO acusa a un destino legítimo del portal", () => {
      const destinos = destinosAlPortal(
        '<a href="{{ clientUrl }}/seller/onboarding">Vender</a>',
      );
      expect(destinos).toEqual(["/seller/onboarding"]);
      expect(RUTAS_DE_BASE).not.toContain(destinos[0]);
    });

    it("C3: normaliza los destinos con interpolación", () => {
      expect(
        destinosAlPortal('href="{{ clientUrl }}/auctions/{{ auction.id }}"'),
      ).toEqual(["/auctions/:param"]);
    });
  });
});
