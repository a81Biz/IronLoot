import { readFileSync } from "fs";
import { join } from "path";
import {
  RETIROS_PATH,
  cuerpoDeRetiro,
  estadoDeCobro,
} from "../src/common/bff/retiro-view";

/**
 * PT-216 (R-027 · H-UI-005, H-UI-006) — La cadena de cobro del vendedor.
 */
describe("retiro-view (PT-216)", () => {
  describe("el contrato del retiro", () => {
    /**
     * **El defecto, reproducido.** El formulario enviaba `{ amount, account }` a un endpoint deprecado
     * que espera `referenceId`. Con `whitelist: true, forbidNonWhitelisted: true` en el `ValidationPipe`
     * global, `account` es propiedad no permitida y `referenceId` falta: **400 garantizado**.
     */
    it("R1: usa el endpoint vigente, no el deprecado", () => {
      expect(RETIROS_PATH).toBe("/api/v1/wallet/withdrawals");
      expect(RETIROS_PATH).not.toContain("/wallet/withdraw?");
      // El deprecado es `/wallet/withdraw` sin la `s`.
      expect(RETIROS_PATH.endsWith("/withdraw")).toBe(false);
    });

    it("R2: el cuerpo lleva `paymentMethodId`, nunca `account`", () => {
      const cuerpo = cuerpoDeRetiro("1500.50", "pm-123");
      expect(cuerpo).toEqual({ amount: 1500.5, paymentMethodId: "pm-123" });
      expect(Object.keys(cuerpo)).toEqual(["amount", "paymentMethodId"]);
      expect(cuerpo).not.toHaveProperty("account");
      expect(cuerpo).not.toHaveProperty("referenceId");
    });

    it("R3: el monto viaja como número — un string lo rechazaría `@IsNumber()`", () => {
      expect(typeof cuerpoDeRetiro("100", "pm").amount).toBe("number");
    });

    it("R4: sin método seleccionado NO se inventa uno", () => {
      // Cadena vacía, no `undefined`: `undefined` desaparece al serializar y el API vería un cuerpo
      // sin la clave, que es justo el modo de fallo que este PT corrige.
      expect(cuerpoDeRetiro(10, undefined).paymentMethodId).toBe("");
      expect(
        JSON.parse(JSON.stringify(cuerpoDeRetiro(10, undefined))),
      ).toHaveProperty("paymentMethodId");
    });
  });

  describe("las puertas, resueltas antes de enseñar el formulario", () => {
    it("R5: sin KYC aprobado no se puede solicitar", () => {
      const e = estadoDeCobro({ status: "PENDING", approved: false }, [
        { id: "m1", isVerified: true },
      ]);
      expect(e.kycAprobado).toBe(false);
      expect(e.puedeSolicitar).toBe(false);
    });

    it("R6: con KYC aprobado pero sin método verificado, tampoco", () => {
      const e = estadoDeCobro({ status: "APPROVED", approved: true }, [
        { id: "m1", isVerified: false },
      ]);
      expect(e.hayMetodoVerificado).toBe(false);
      expect(e.puedeSolicitar).toBe(false);
    });

    it("R7: con las dos puertas franqueadas, sí", () => {
      const e = estadoDeCobro({ status: "APPROVED", approved: true }, [
        { id: "m1", isVerified: true },
      ]);
      expect(e.puedeSolicitar).toBe(true);
    });

    it("R8: sin datos del API no se asume que se pueda — falla cerrado", () => {
      expect(estadoDeCobro(null, null).puedeSolicitar).toBe(false);
      expect(estadoDeCobro(null, null).metodos).toEqual([]);
    });
  });

  /**
   * **La guarda de reincidencia.** El defecto vivía en el JavaScript de navegador, no en el servidor: un
   * `fetch` con las claves equivocadas. Si el JS vuelve a construir el cuerpo a mano, esta prueba lo dice.
   */
  describe("el JS del retiro no construye el cuerpo a mano", () => {
    const JS = join(
      __dirname,
      "..",
      "public",
      "js",
      "pages",
      "pages-wallet-withdraw.js",
    );

    it("R9: no queda ninguna referencia a la clave `account` ni al endpoint deprecado", () => {
      const fuente = readFileSync(JS, "utf8").replace(/\/\/.*$/gm, "");
      expect(fuente).not.toMatch(/account\s*:/);
      expect(fuente).not.toMatch(/['"`]\/api\/v1\/wallet\/withdraw['"`]/);
    });

    it("R10: propaga el mensaje del servidor en vez de una cadena fija", () => {
      // **Sin comentarios**, igual que R9. La primera versión leía el fichero entero y se acusaba a sí
      // misma: el comentario que explica el defecto **cita la cadena** «Error al procesar.», que es
      // justo lo que la prueba busca. Es el patrón que este repositorio ya pagó en PT-128 y PT-132 —
      // una guarda que lee prosa se acusa a sí misma— y aquí volvió a aparecer.
      const fuente = readFileSync(JS, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

      // El defecto era `res.ok ? … : 'Error al procesar.'`, que descartaba cuatro diagnósticos
      // accionables distintos (RN-65) y dejaba al usuario sin saber qué corregir.
      expect(fuente).not.toContain("Error al procesar.");
      expect(fuente).toMatch(/\.message/);
    });
  });
});
