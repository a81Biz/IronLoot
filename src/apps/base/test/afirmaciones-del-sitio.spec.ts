import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * PT-208 (R-030 · H-UI-027, H-UI-028, H-UI-041) — **Lo que el sitio público afirma tiene que ser
 * comprobable contra una regla de negocio.**
 *
 * La portada afirmaba tres cosas que el sistema no hace, en el texto que más gente lee:
 *
 *   1. **«Socios y aliados estratégicos: … DHL, FedEx»** — `RN-35` dice literalmente *«Sin integración
 *      de transportista real: `carrier`/`trackingNumber` son campos manuales»*. Dos marcas ajenas
 *      afirmando una alianza que no existe.
 *   2. **«entrega garantizada»** y **«Tus fondos quedan retenidos hasta confirmar la entrega»** —
 *      `RN-30` captura al ganador **al cierre**, y lo que se retiene tras la entrega es el neto **del
 *      vendedor** (`RN-64`). Describía al comprador una protección tipo escrow que no recibe.
 *   3. Un **formulario de suscripción con `action="#"`** en un sitio cuyo propio `main.ts` declara
 *      *«BASE has no SSR POST routes»*: recogía un correo que no llegaba a nadie, sin consentimiento
 *      ni enlace a la privacidad.
 *
 * ## Por qué una guarda sobre texto, que es lo que este repositorio evita
 *
 * `CLAUDE.md` avisa de que una guarda que lee prosa se acusa a sí misma. Por eso ésta **no juzga
 * redacción**: comprueba tres hechos concretos y falsables —una marca de transportista presentada como
 * socio, una promesa de custodia hasta la entrega, y un formulario sin destino—. Los tres se pueden
 * afirmar o negar mirando una `RN-XX`, y los tres ya ocurrieron.
 */
const VISTAS = join(__dirname, "..", "views");

function plantillas(
  dir: string,
  prefijo = "",
): { nombre: string; html: string }[] {
  const out: { nombre: string; html: string }[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory())
      out.push(...plantillas(join(dir, e.name), `${prefijo}${e.name}/`));
    else if (e.name.endsWith(".html"))
      out.push({
        nombre: `${prefijo}${e.name}`,
        html: readFileSync(join(dir, e.name), "utf8"),
      });
  }
  return out;
}

/** El marcado sin los comentarios de plantilla: la guarda no lee su propia explicación. */
export function sinComentarios(html: string): string {
  return html.replace(/\{#[\s\S]*?#\}/g, " ");
}

/** Transportistas que el producto NO integra (`RN-35`). Nombrarlos como socio es afirmar una alianza. */
const TRANSPORTISTAS = ["DHL", "FedEx", "Estafeta", "UPS"];

describe("El sitio público no afirma lo que el sistema no hace — PT-208", () => {
  const todas = plantillas(VISTAS);

  it("se han leído plantillas — si no, la guarda no comprueba nada", () => {
    expect(todas.length).toBeGreaterThan(10);
  });

  it("ninguna sección de socios nombra a un transportista (RN-35)", () => {
    const acusados: string[] = [];
    for (const { nombre, html } of todas) {
      const limpio = sinComentarios(html);
      const bloque = limpio.match(
        /<section class="partners">[\s\S]*?<\/section>/,
      );
      if (!bloque) continue;
      for (const t of TRANSPORTISTAS)
        if (bloque[0].includes(t))
          acusados.push(
            `${nombre}: presenta «${t}» como socio, y RN-35 dice que no hay integración`,
          );
    }
    expect(acusados).toEqual([]);
  });

  it("no se promete custodia del dinero del comprador hasta la entrega (RN-30 / RN-64)", () => {
    const prohibidas = [
      /entrega garantizada/i,
      /retenidos.{0,40}hasta confirmar la entrega/i,
    ];
    const acusados: string[] = [];
    for (const { nombre, html } of todas) {
      const limpio = sinComentarios(html);
      for (const p of prohibidas)
        if (p.test(limpio))
          acusados.push(`${nombre}: «${limpio.match(p)?.[0]}»`);
    }
    expect(acusados).toEqual([]);
  });

  it("ningún formulario declara un destino que no existe", () => {
    const acusados: string[] = [];
    for (const { nombre, html } of todas)
      for (const m of sinComentarios(html).matchAll(
        /<form[^>]*action="([^"]*)"[^>]*>/g,
      ))
        if (m[1] === "#" || m[1].trim() === "")
          acusados.push(
            `${nombre}: <form action="${m[1]}"> — recoge datos que no van a ninguna parte`,
          );
    expect(acusados).toEqual([]);
  });

  describe("casos de control", () => {
    it("C1: detecta el bloque de socios que había", () => {
      const html = '<section class="partners"><span>DHL</span></section>';
      expect(
        html.match(/<section class="partners">[\s\S]*?<\/section>/)?.[0],
      ).toContain("DHL");
    });

    it("C2: detecta la promesa de custodia que había", () => {
      expect(
        /retenidos.{0,40}hasta confirmar la entrega/i.test(
          "Tus fondos quedan retenidos de forma segura hasta confirmar la entrega.",
        ),
      ).toBe(true);
    });

    it("C3: NO se acusa a sí misma leyendo el comentario que explica el defecto", () => {
      expect(
        sinComentarios("{# antes decia «entrega garantizada» #}<p>hola</p>"),
      ).not.toMatch(/entrega garantizada/);
    });

    it("C4: un formulario con destino real no se acusa", () => {
      const acusa = [
        ...'<form method="GET" action="/auctions">'.matchAll(
          /<form[^>]*action="([^"]*)"[^>]*>/g,
        ),
      ].some((m) => m[1] === "#" || m[1].trim() === "");
      expect(acusa).toBe(false);
    });
  });
});
