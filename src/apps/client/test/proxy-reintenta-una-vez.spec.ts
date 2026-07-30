import { interceptarRespuesta } from "../src/common/bff/reintentar-tras-refresco";

/**
 * PT-194 · tareas 7 y 8 (`TD-025`) — **El proxy reintenta una vez, y no rompe lo que ya funcionaba.**
 *
 * ## Los dos caminos del portal, y por qué hacen falta los dos
 *
 * El guard cubre la **navegación de página**. Esto cubre las **llamadas del navegador**: el JS de
 * página hace `fetch('/api/v1/...')`, el proxy inyecta el token de la cookie y —hasta ahora— **dejaba
 * pasar el 401 tal cual**. Cablear sólo el guard dejaría el portal a medias: la página carga y sus
 * llamadas fallan.
 *
 * ## El riesgo real de este cambio no son los 401: son los demás
 *
 * Pasar a `selfHandleResponse` cambia cómo se devuelve **toda** respuesta, no sólo las que fallan. Un
 * error aquí no rompe el refresco —rompe el portal entero, silenciosamente, devolviendo cuerpos
 * truncados o cabeceras perdidas—. Por eso la tarea 8 va **inmediatamente después** de la 7 y no al
 * final: cuanto más tarde se descubra, más cambios habrá encima.
 *
 * `C5` y `C6` son esa regresión, y son los casos que más valen de este fichero.
 *
 * ## Y no se redirige una llamada XHR
 *
 * Si el refresco falla, se devuelve el **401**. El JS de página decide qué hacer; un `fetch` que
 * recibe un 302 al login acabaría metiendo el HTML del login dentro de un `JSON.parse`.
 */
const CUERPO_OK = Buffer.from(JSON.stringify({ balance: 100 }));

interface Contexto {
  req: {
    cookies: Record<string, string | undefined>;
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  res: { cookie: jest.Mock; statusCode: number };
}

/**
 * **`res.statusCode` empieza con el estado que trae la respuesta del API, no en 200.**
 *
 * `responseInterceptor` de `http-proxy-middleware` copia estado y cabeceras de `proxyRes` a `res`
 * **antes** de llamar al interceptor. La primera version de este doble lo inicializaba en 200 y hacia
 * fallar `C3` por modelar mal el entorno, no por un defecto del codigo — el error clasico de que la
 * prueba mida otra cosa. Modelarlo bien ademas mejora la comprobacion: ahora `C3` verifica que el 401
 * **se conserva**, que es lo que de verdad importa.
 */
function contexto(
  cookies: Record<string, string | undefined> = {},
  statusProxy = 200,
): Contexto {
  return {
    req: { cookies, method: "GET", url: "/api/v1/wallet/balance", headers: {} },
    res: { cookie: jest.fn(), statusCode: statusProxy },
  };
}

describe("El proxy reintenta una vez — PT-194 (TD-025)", () => {
  let refrescar: jest.Mock;
  let reintentar: jest.Mock;

  beforeEach(() => {
    refrescar = jest.fn();
    reintentar = jest.fn();
  });

  const llamar = (status: number, ctx: Contexto, cuerpo: Buffer = CUERPO_OK) =>
    interceptarRespuesta(
      cuerpo,
      { statusCode: status },
      ctx.req as never,
      ctx.res as never,
      { refrescar, reintentar },
    );

  // ── PT-194.7 — el reintento ───────────────────────────────────────────────────────────────────
  it("C1: 401 + refresco valido -> reintenta UNA vez y devuelve el cuerpo bueno", async () => {
    refrescar.mockResolvedValue({ accessToken: "nuevo", refreshToken: "r-1" });
    reintentar.mockResolvedValue({
      status: 200,
      cuerpo: Buffer.from('{"balance":250}'),
    });
    const ctx = contexto({ access_token: "viejo", refresh_token: "r-1" });

    const salida = await llamar(401, ctx);

    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(reintentar).toHaveBeenCalledTimes(1);
    expect(salida.toString()).toBe('{"balance":250}');
  });

  it("C2: y escribe la cookie nueva, para que la siguiente peticion no refresque", async () => {
    refrescar.mockResolvedValue({ accessToken: "nuevo", refreshToken: "r-1" });
    reintentar.mockResolvedValue({ status: 200, cuerpo: CUERPO_OK });
    const ctx = contexto({ access_token: "viejo", refresh_token: "r-1" });

    await llamar(401, ctx);

    const [nombre, valor] = ctx.res.cookie.mock.calls[0];
    expect({ nombre, valor }).toEqual({
      nombre: "access_token",
      valor: "nuevo",
    });
  });

  it("PT-196: el refresh token ROTADO tambien se persiste por este camino", async () => {
    // Los dos caminos o ninguno: si solo el guard persistiera, una carga de pagina cuyo primer 401
    // llegase por `fetch` dejaria el token viejo en el navegador.
    refrescar.mockResolvedValue({
      accessToken: "a-nuevo",
      refreshToken: "refresh-ROTADO",
    });
    reintentar.mockResolvedValue({ status: 200, cuerpo: CUERPO_OK });
    const ctx = contexto(
      { access_token: "viejo", refresh_token: "r-viejo" },
      401,
    );

    await llamar(401, ctx);

    const porNombre = Object.fromEntries(
      ctx.res.cookie.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
    );
    expect(porNombre["refresh_token"]).toBe("refresh-ROTADO");
  });

  it("C3: 401 + refresco fallido -> devuelve el 401, NO una redireccion", async () => {
    // Un `fetch` que recibe un 302 al login acabaría metiendo el HTML del login en un `JSON.parse`.
    refrescar.mockResolvedValue(null);
    const ctx = contexto({ access_token: "viejo", refresh_token: "r-1" }, 401);

    const salida = await llamar(
      401,
      ctx,
      Buffer.from('{"message":"Unauthorized"}'),
    );

    expect(reintentar).not.toHaveBeenCalled();
    // El 401 que trajo el API **se conserva**: no se toca el estado en el camino de paso.
    expect(ctx.res.statusCode).toBe(401);
    expect(salida.toString()).toContain("Unauthorized");
  });

  it("C4: 401 TRAS el reintento -> se devuelve, y NO hay un segundo intento", async () => {
    // La barrera contra el bucle, en el otro camino.
    refrescar.mockResolvedValue({ accessToken: "nuevo", refreshToken: "r-1" });
    reintentar.mockResolvedValue({
      status: 401,
      cuerpo: Buffer.from('{"message":"nope"}'),
    });
    const ctx = contexto({ access_token: "viejo", refresh_token: "r-1" });

    await llamar(401, ctx);

    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(reintentar).toHaveBeenCalledTimes(1);
  });

  it("CA-5: 401 SIN cookie de refresco -> ni se intenta", async () => {
    const ctx = contexto({ access_token: "viejo" });

    await llamar(401, ctx);

    expect(refrescar).not.toHaveBeenCalled();
  });

  it("C7: si el refresco LANZA, se devuelve el 401 — no se propaga el error al navegador", async () => {
    refrescar.mockRejectedValue(new Error("API caido"));
    const ctx = contexto({ access_token: "viejo", refresh_token: "r-1" });

    const salida = await llamar(
      401,
      ctx,
      Buffer.from('{"message":"Unauthorized"}'),
    );

    expect(salida.toString()).toContain("Unauthorized");
    expect(reintentar).not.toHaveBeenCalled();
  });

  // ── PT-194.8 — la regresión, que es el riesgo de verdad ───────────────────────────────────────
  describe("PT-194.8: `selfHandleResponse` no rompe lo que ya funcionaba", () => {
    it("C5 (E-3): una respuesta 200 atraviesa el proxy IDENTICA", async () => {
      const ctx = contexto({ access_token: "bueno" });

      const salida = await llamar(200, ctx);

      expect(salida).toBe(CUERPO_OK);
      expect(refrescar).not.toHaveBeenCalled();
      expect(ctx.res.cookie).not.toHaveBeenCalled();
    });

    it("C6: y una 404 tambien — no se toca nada que no sea un 401", async () => {
      const cuerpo404 = Buffer.from('{"message":"Not Found"}');
      const ctx = contexto(
        { access_token: "bueno", refresh_token: "r-1" },
        404,
      );

      const salida = await llamar(404, ctx, cuerpo404);
      // Y el estado tampoco se toca.
      expect(ctx.res.statusCode).toBe(404);

      expect(salida).toBe(cuerpo404);
      expect(refrescar).not.toHaveBeenCalled();
    });

    it("AC-01 (control): un 500 tampoco dispara el refresco", async () => {
      // Refrescar ante cualquier error convertiría un API caído en una tormenta de refrescos.
      const ctx = contexto({ access_token: "bueno", refresh_token: "r-1" });

      await llamar(500, ctx);

      expect(refrescar).not.toHaveBeenCalled();
    });

    it("AC-02 (control): un cuerpo binario vuelve byte a byte", async () => {
      // Es lo que rompería sin querer al pasar por `selfHandleResponse`: una imagen o un PDF
      // convertidos a texto y de vuelta salen corruptos, y nadie lo nota hasta que alguien descarga.
      const binario = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0xfe]);
      const ctx = contexto({ access_token: "bueno" });

      const salida = await llamar(200, ctx, binario);

      expect(Buffer.compare(salida, binario)).toBe(0);
    });
  });
});
