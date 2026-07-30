import {
  escribirCookiesDeSesion,
  OPCIONES_BASE,
} from "../src/common/auth/escribir-cookies-de-sesion";
import {
  VIDA_ACCESO_MS,
  VIDA_REFRESCO_MS,
} from "../src/common/config/vida-de-sesion";

/**
 * PT-196 · tarea 1 (rotación del refresh token) — **Las dos cookies, con las opciones exactas de BASE.**
 *
 * ## Por qué esto es una pieza y no dos líneas repetidas
 *
 * Hay dos llamantes —el guard y el interceptor del proxy— y las opciones de cookie tienen que
 * coincidir **exactamente** con las que BASE usó al escribirlas en el login. Un `sameSite` o un
 * `domain` distinto **no sustituye** la cookie: crea una segunda, y el navegador manda las dos.
 *
 * Ese fallo se manifiesta como *«a veces funciona»* —según cuál de las dos gane— y es de los peores de
 * diagnosticar, porque nada falla del todo.
 *
 * ## Y por qué importa ahora y no antes
 *
 * Hasta PT-196 el CLIENT sólo reescribía `access_token`; el `refresh_token` se escribía una vez en el
 * login y no se tocaba. **Con la rotación, cada refresco entrega uno nuevo**: si no se persiste, el
 * navegador conserva el viejo, lo presenta en el siguiente refresco y —con detección de reuso— **la
 * sesión se revoca**. Todos los usuarios, en su segundo refresco.
 *
 * Ésta es la tarea que impide que PT-196 sea una regresión total.
 */
describe("escribirCookiesDeSesion — PT-196", () => {
  const res = { cookie: jest.fn() };

  beforeEach(() => res.cookie.mockReset());

  const tokens = { accessToken: "a-nuevo", refreshToken: "r-nuevo" };

  it("C1: escribe LAS DOS cookies", () => {
    escribirCookiesDeSesion(res as never, tokens);

    const nombres = res.cookie.mock.calls.map((c) => c[0]).sort();
    expect(nombres).toEqual(["access_token", "refresh_token"]);
  });

  it("C2: cada una con su propia vida", () => {
    // Escribir las dos con la vida del acceso dejaría al refresh token caducando cada 15 minutos:
    // la sesión volvería a durar quince minutos por otro camino.
    escribirCookiesDeSesion(res as never, tokens);

    const porNombre = Object.fromEntries(
      res.cookie.mock.calls.map((c) => [c[0], c[2]]),
    );
    expect(porNombre["access_token"].maxAge).toBe(VIDA_ACCESO_MS);
    expect(porNombre["refresh_token"].maxAge).toBe(VIDA_REFRESCO_MS);
  });

  it("C3: y con los valores que le llegan, no con los de la cookie anterior", () => {
    escribirCookiesDeSesion(res as never, tokens);

    const porNombre = Object.fromEntries(
      res.cookie.mock.calls.map((c) => [c[0], c[1]]),
    );
    expect(porNombre).toEqual({
      access_token: "a-nuevo",
      refresh_token: "r-nuevo",
    });
  });

  describe("las opciones tienen que ser las de BASE", () => {
    it("C4: `httpOnly` — el refresh token no puede leerse desde JS", () => {
      expect(OPCIONES_BASE.httpOnly).toBe(true);
    });

    it("C5: `path` en la raiz, para que viaje a todas las rutas del portal", () => {
      expect(OPCIONES_BASE.path).toBe("/");
    });

    it("C6: `sameSite` sale de la MISMA variable que en BASE", () => {
      // Si aquí se pusiera un literal y en BASE una variable, un despliegue que cambiara la variable
      // dejaría dos cookies distintas conviviendo.
      const anterior = process.env.COOKIE_SAMESITE;
      process.env.COOKIE_SAMESITE = "Strict";
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const recargado = require("../src/common/auth/escribir-cookies-de-sesion");
      expect(recargado.OPCIONES_BASE.sameSite).toBe("Strict");

      if (anterior === undefined) delete process.env.COOKIE_SAMESITE;
      else process.env.COOKIE_SAMESITE = anterior;
      jest.resetModules();
    });

    describe("casos de control", () => {
      it("AC-01: `domain` solo se incluye si esta configurado", () => {
        // Escribir `domain: undefined` no es lo mismo que no escribirlo: Express lo serializa distinto
        // y la cookie deja de coincidir con la que BASE puso.
        const anterior = process.env.COOKIE_DOMAIN;
        delete process.env.COOKIE_DOMAIN;
        jest.resetModules();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sinDominio = require("../src/common/auth/escribir-cookies-de-sesion");
        expect("domain" in sinDominio.OPCIONES_BASE).toBe(false);

        if (anterior === undefined) delete process.env.COOKIE_DOMAIN;
        else process.env.COOKIE_DOMAIN = anterior;
        jest.resetModules();
      });

      it("AC-02: las dos vidas son DISTINTAS — si no, C2 no mediria nada", () => {
        expect(VIDA_REFRESCO_MS).toBeGreaterThan(VIDA_ACCESO_MS);
      });
    });
  });
});
