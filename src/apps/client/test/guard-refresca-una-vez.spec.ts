import * as jwt from "jsonwebtoken";

/**
 * PT-194 · tareas 4 y 5 (`TD-025`) — **El guard refresca una vez, y sólo ante expiración.**
 *
 * ## La decisión de seguridad de todo el PT
 *
 * `jwt.verify` falla por muchas razones: expiración, firma inválida, token malformado. **Sólo la
 * expiración refresca.**
 *
 * Refrescar ante *cualquier* fallo convertiría el refresco en una vía para saltarse la verificación:
 * bastaría con presentar un `access_token` basura junto a una cookie de refresco válida y el guard
 * pediría un token nuevo tan contento. `C4` es ese caso, y es el que hay que ver fallar.
 *
 * ## Y la que evita la página en blanco
 *
 * Tras refrescar, el guard escribe la cookie **y actualiza `req.cookies.access_token` en memoria**. Sin
 * eso, las **28** llamadas de `apiGet` de esa misma petición irían con el token viejo: la página
 * renderizaría **vacía**, sin error y sin traza, con la cookie ya correcta para la siguiente. Un arreglo
 * que produce páginas en blanco es peor que el defecto que corrige. Es `C5`.
 *
 * ## Cómo se prueba un token expirado sin esperar quince minutos
 *
 * **Se firma uno con `exp` en el pasado**, con el mismo secreto. Es exactamente lo que el sistema
 * recibiría a los 16 minutos. No se toca el reloj de la máquina ni se espera.
 *
 * **Esto no es falsear la prueba**: se ejerce el mismo camino y sólo se adelanta el reloj — el criterio
 * que este repositorio ya aplica en la fase 35 de QA con `SETTLEMENT_HOLDBACK_HOURS=0`.
 */
const SECRETO = "x".repeat(40);

process.env.JWT_SECRET = SECRETO;
process.env.BASE_URL = "http://base.test";
process.env.API_URL = "http://api.test";

// El módulo del guard lee las variables al cargarse (PT-192), así que se importa después de fijarlas.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ClientAuthGuard } = require("../src/common/guards/client-auth.guard");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const refrescos = require("../src/common/auth/refrescar-sesion");

const firmar = (opciones: jwt.SignOptions) =>
  jwt.sign({ sub: "u-1" }, SECRETO, opciones);

const TOKEN_VALIDO = firmar({ expiresIn: "15m" });
const TOKEN_EXPIRADO = firmar({ expiresIn: -60 }); // caducó hace un minuto
const TOKEN_FALSIFICADO = jwt.sign({ sub: "u-1" }, "otro-secreto-cualquiera", {
  expiresIn: "15m",
});

interface Doble {
  req: { cookies: Record<string, string | undefined> };
  res: {
    redirect: jest.Mock;
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };
  ctx: unknown;
}

function contexto(cookies: Record<string, string | undefined>): Doble {
  const req = { cookies };
  const res = {
    redirect: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
  return {
    req,
    res,
    ctx: {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    },
  };
}

describe("ClientAuthGuard refresca una vez — PT-194 (TD-025)", () => {
  let guard: { canActivate(ctx: unknown): Promise<boolean> | boolean };
  let refrescar: jest.SpyInstance;

  beforeEach(() => {
    guard = new ClientAuthGuard();
    refrescar = jest.spyOn(refrescos, "refrescarSesion");
    refrescar.mockReset();
  });

  afterEach(() => refrescar.mockRestore());

  it("E-1: con el token valido NO se refresca — el camino feliz no paga nada", async () => {
    const { ctx, res } = contexto({
      access_token: TOKEN_VALIDO,
      refresh_token: "r-1",
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(refrescar).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("CA-1/CA-3: token expirado + refresco valido -> continua y escribe la cookie nueva", async () => {
    refrescar.mockResolvedValue({
      accessToken: "access-nuevo",
      refreshToken: "r-1",
    });
    const { ctx, res } = contexto({
      access_token: TOKEN_EXPIRADO,
      refresh_token: "r-1",
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
    const [nombre, valor] = res.cookie.mock.calls[0];
    expect({ nombre, valor }).toEqual({
      nombre: "access_token",
      valor: "access-nuevo",
    });
  });

  it("PT-196: el refresh token ROTADO se persiste — o la sesion se revoca en el siguiente refresco", async () => {
    // **La prueba que impide que la rotacion sea una regresion total.** Con PT-196 el API devuelve un
    // refresh token **distinto** en cada refresco. Si el guard no lo escribe, el navegador conserva el
    // viejo, lo presenta la proxima vez y la deteccion de reuso revoca la sesion: **todos los
    // usuarios, en su segundo refresco**.
    refrescar.mockResolvedValue({
      accessToken: "access-nuevo",
      refreshToken: "refresh-ROTADO",
    });
    const { ctx, res } = contexto({
      access_token: TOKEN_EXPIRADO,
      refresh_token: "refresh-viejo",
    });

    await guard.canActivate(ctx);

    const porNombre = Object.fromEntries(
      res.cookie.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
    );
    expect(porNombre["refresh_token"]).toBe("refresh-ROTADO");
  });

  it("C5: y el token nuevo llega a `req.cookies` de ESA MISMA peticion", async () => {
    // Es lo que evita que la página cargue vacía: `apiGet` lee de aquí, 28 veces.
    refrescar.mockResolvedValue({
      accessToken: "access-nuevo",
      refreshToken: "r-1",
    });
    const { ctx, req } = contexto({
      access_token: TOKEN_EXPIRADO,
      refresh_token: "r-1",
    });

    await guard.canActivate(ctx);

    expect(req.cookies.access_token).toBe("access-nuevo");
  });

  it("CA-5: sin cookie de refresco -> al login, y CERO llamadas al API", async () => {
    const { ctx, res } = contexto({ access_token: TOKEN_EXPIRADO });

    await expect(guard.canActivate(ctx)).resolves.toBe(false);

    expect(refrescar).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalled();
  });

  it("CA-4: refresco `null` -> se borran LAS DOS cookies y al login", async () => {
    refrescar.mockResolvedValue(null);
    const { ctx, res } = contexto({
      access_token: TOKEN_EXPIRADO,
      refresh_token: "r-1",
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(false);

    const borradas = res.clearCookie.mock.calls.map((c: unknown[]) => c[0]);
    expect(borradas.sort()).toEqual(["access_token", "refresh_token"]);
    expect(res.redirect).toHaveBeenCalled();
  });

  it("CA-4b: si el refresco LANZA, tampoco se reintenta — un intento por peticion", async () => {
    // La barrera contra el bucle. Un refresco fallido que no cierra sesión se reintentaría en cada
    // navegación y el usuario quedaría atrapado, con carga sobre el API cada vez.
    refrescar.mockRejectedValue(new Error("API caido"));
    const { ctx, res } = contexto({
      access_token: TOKEN_EXPIRADO,
      refresh_token: "r-1",
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(false);

    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalled();
  });

  it("C4 (CA-11): un token FALSIFICADO va al login SIN refrescar", async () => {
    // **La decisión de seguridad del PT.** Si esto fallara, presentar un `access_token` basura junto a
    // una cookie de refresco válida bastaría para obtener un token nuevo: el refresco se convertiría
    // en una vía para saltarse la verificación.
    const { ctx, res } = contexto({
      access_token: TOKEN_FALSIFICADO,
      refresh_token: "r-1",
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(false);

    expect(refrescar).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalled();
  });

  describe("casos de control", () => {
    it("AC-01: un token BASURA tampoco refresca", async () => {
      const { ctx } = contexto({
        access_token: "esto-no-es-un-jwt",
        refresh_token: "r-1",
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(false);
      expect(refrescar).not.toHaveBeenCalled();
    });

    it("AC-02: sin ninguna cookie -> al login, sin tocar nada", async () => {
      const { ctx, res } = contexto({});

      await expect(guard.canActivate(ctx)).resolves.toBe(false);
      expect(refrescar).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it("AC-03: los tres tokens de prueba son lo que dicen ser", async () => {
      // Sin esto, un error al construirlos —un `expiresIn` mal puesto— haría que varios casos midieran
      // otra cosa y pasaran por el motivo equivocado.
      expect(() => jwt.verify(TOKEN_VALIDO, SECRETO)).not.toThrow();
      expect(() => jwt.verify(TOKEN_EXPIRADO, SECRETO)).toThrow(
        jwt.TokenExpiredError,
      );
      expect(() => jwt.verify(TOKEN_FALSIFICADO, SECRETO)).toThrow(
        jwt.JsonWebTokenError,
      );
    });
  });
});
