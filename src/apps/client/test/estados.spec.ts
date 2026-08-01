import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  etiquetaDeEstado,
  badgeDeEstado,
  fechaLegible,
  ESTADOS_CONOCIDOS,
} from "../src/common/vista/estados";

/**
 * PT-212 (R-032 · H-UI-037, H-UI-038, H-UI-045) — El vocabulario del usuario.
 */
describe("estados — etiqueta, badge y fecha (PT-212)", () => {
  describe("etiqueta", () => {
    it("traduce los estados que FAQ-y-Mensajes §3 promete que el usuario verá", () => {
      expect(etiquetaDeEstado("PAID")).toBe("Pagada");
      expect(etiquetaDeEstado("SHIPPED")).toBe("Enviada");
      expect(etiquetaDeEstado("DELIVERED")).toBe("Entregada");
      expect(etiquetaDeEstado("REFUNDED")).toBe("Reembolsada");
      expect(etiquetaDeEstado("IN_MEDIATION")).toBe("En mediación");
      expect(etiquetaDeEstado("DEBIT_ORDER")).toBe("Pago de compra");
    });

    /**
     * Ante lo desconocido devuelve el valor, no un hueco. Un hueco es el silencio que esta tanda
     * persigue: el usuario no puede distinguir «no hay estado» de «hay uno que no sé nombrar».
     */
    it("un estado que el mapa no conoce se muestra tal cual, no vacío", () => {
      expect(etiquetaDeEstado("ESTADO_NUEVO_DEL_API")).toBe(
        "ESTADO_NUEVO_DEL_API",
      );
      expect(etiquetaDeEstado(undefined)).toBe("—");
      expect(etiquetaDeEstado("")).toBe("—");
    });
  });

  describe("badge", () => {
    /**
     * **El defecto que corrige.** Las plantillas usaban `badge-info` para TODOS los estados de orden y
     * `badge-warning` para todos los de disputa: en una tabla de veinte, un reembolso y una compra
     * normal eran visualmente idénticos.
     */
    it("un estado terminal bueno y uno de excepción NO comparten variante", () => {
      expect(badgeDeEstado("DELIVERED")).toBe("badge-success");
      expect(badgeDeEstado("REFUNDED")).toBe("badge-danger");
      expect(badgeDeEstado("CANCELLED")).toBe("badge-danger");
      expect(badgeDeEstado("PENDING_PAYMENT")).toBe("badge-warning");
      expect(badgeDeEstado("DELIVERED")).not.toBe(badgeDeEstado("REFUNDED"));
    });

    it("lo desconocido cae en `muted`, que no afirma nada", () => {
      expect(badgeDeEstado("LO_QUE_SEA")).toBe("badge-muted");
      expect(badgeDeEstado(null)).toBe("badge-muted");
    });

    it("toda variante emitida existe como clase del sistema de diseño", () => {
      const css = readFileSync(
        join(__dirname, "..", "public", "css", "client.css"),
        "utf8",
      );
      for (const valor of ESTADOS_CONOCIDOS) {
        const clase = badgeDeEstado(valor);
        expect(css).toContain(`.${clase}`);
      }
    });
  });

  describe("fecha", () => {
    it("sustituye el ISO con milisegundos por algo legible", () => {
      const salida = fechaLegible("2026-07-31T18:22:05.123Z");
      expect(salida).not.toContain("T");
      expect(salida).not.toContain(".123");
      expect(salida).toMatch(/2026/);
    });

    it("un valor que no es fecha se devuelve tal cual, y la ausencia da guion", () => {
      expect(fechaLegible("mañana")).toBe("mañana");
      expect(fechaLegible(null)).toBe("—");
      expect(fechaLegible(undefined)).toBe("—");
    });
  });

  /**
   * **La guarda que impide la reincidencia.** Sin ella, la próxima tabla vuelve a imprimir el enum y
   * nadie lo nota: no falla nada, sólo se lee peor. Es el mismo modo de fallo que el `style=` que la
   * CSP bloquea en silencio.
   */
  describe("ninguna plantilla imprime un estado crudo", () => {
    const VISTAS = join(__dirname, "..", "views", "pages");

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

    it("todo `{{ x.status }}` o `{{ x.type }}` pasa por `| estado`", () => {
      const crudos: string[] = [];
      for (const { nombre, html } of plantillas(VISTAS)) {
        const sinComentarios = html.replace(/\{#[\s\S]*?#\}/g, " ");
        for (const m of sinComentarios.matchAll(
          /\{\{\s*([\w.]*\.(?:status|type))\s*\}\}/g,
        )) {
          crudos.push(`${nombre}: {{ ${m[1]} }} — falta el filtro | estado`);
        }
      }
      expect(crudos).toEqual([]);
    });

    it("C1 (control): detecta el patrón crudo", () => {
      const html = "<span>{{ order.status }}</span>";
      expect([
        ...html.matchAll(/\{\{\s*([\w.]*\.(?:status|type))\s*\}\}/g),
      ]).toHaveLength(1);
    });

    it("C2 (control): NO acusa al que sí lleva el filtro", () => {
      const html = "<span>{{ order.status | estado }}</span>";
      expect([
        ...html.matchAll(/\{\{\s*([\w.]*\.(?:status|type))\s*\}\}/g),
      ]).toHaveLength(0);
    });
  });
});
