import { AdminApiClient } from "../src/shared/admin-api-client.service";

/**
 * PT-101 (F-31) — Cómo el panel se autentica contra el API.
 *
 * Obtiene un JWT de vida corta, lo renueva antes de que expire, y **cae a `X-Admin-Key`** si el
 * login falla. Esa reserva es una decisión de seguridad: significa que el panel sigue operando
 * con una clave estática cuando el camino fuerte no está disponible.
 *
 * Nada fijaba hasta ahora **cuándo** se aplica esa reserva. Estos tests lo hacen: si alguien la
 * ampliara sin querer —por ejemplo, cayendo a la clave también cuando el JWT es válido pero la
 * llamada devuelve 403— el cambio dejaría de pasar desapercibido.
 */
describe("AdminApiClient (PT-101)", () => {
  const ORIGINAL_ENV = { ...process.env };
  let fetchMock: jest.SpyInstance;
  let cliente: AdminApiClient;

  /** Respuesta de login con un token que vive `segundos`. */
  const login = (segundos: number, token = "jwt-1") => ({
    ok: true,
    status: 200,
    json: async () => ({ access_token: token, expires_in: segundos }),
  });

  const cuerpo = (datos: unknown) => ({
    ok: true,
    status: 200,
    json: async () => datos,
  });

  /** Cabeceras con las que se hizo la llamada número `n` (0 = login). */
  const cabecerasDe = (n: number) =>
    (fetchMock.mock.calls[n]?.[1] as { headers?: Record<string, string> })
      ?.headers ?? {};

  beforeEach(() => {
    process.env.ADMIN_API_URL = "http://api:3000";
    process.env.ADMIN_API_KEY = "clave-de-reserva";
    fetchMock = jest.spyOn(global, "fetch");
    cliente = new AdminApiClient();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it("A-01: con login correcto, usa el JWT", async () => {
    fetchMock
      .mockResolvedValueOnce(login(3600) as never)
      .mockResolvedValueOnce(cuerpo({ ok: 1 }) as never);

    await cliente.call("GET", "/admin/users");

    expect(cabecerasDe(1)["Authorization"]).toBe("Bearer jwt-1");
  });

  it("A-02: un token vigente NO se vuelve a pedir", async () => {
    fetchMock
      .mockResolvedValueOnce(login(3600) as never)
      .mockResolvedValueOnce(cuerpo({}) as never)
      .mockResolvedValueOnce(cuerpo({}) as never);

    await cliente.call("GET", "/a");
    await cliente.call("GET", "/b");

    // 1 login + 2 llamadas. Si pidiera token cada vez, serían 4.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("A-03: un token a punto de expirar SÍ se renueva", async () => {
    // El cliente renueva con 60 s de margen: un token de 30 s ya nace caducado a sus ojos.
    fetchMock
      .mockResolvedValueOnce(login(30, "jwt-viejo") as never)
      .mockResolvedValueOnce(cuerpo({}) as never)
      .mockResolvedValueOnce(login(3600, "jwt-nuevo") as never)
      .mockResolvedValueOnce(cuerpo({}) as never);

    await cliente.call("GET", "/a");
    await cliente.call("GET", "/b");

    expect(cabecerasDe(3)["Authorization"]).toBe("Bearer jwt-nuevo");
  });

  // ── La reserva ────────────────────────────────────────────────────────

  it("A-04: si el login falla, cae a la clave estática", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 } as never)
      .mockResolvedValueOnce(cuerpo({}) as never);

    await cliente.call("GET", "/admin/users");

    const h = cabecerasDe(1);
    expect(h["Authorization"]).toBeUndefined();
    expect(Object.values(h)).toContain("clave-de-reserva");
  });

  it("A-05: si el login lanza (red caída), también cae a la clave", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(cuerpo({}) as never);

    await cliente.call("GET", "/admin/users");

    expect(Object.values(cabecerasDe(1))).toContain("clave-de-reserva");
  });

  it("A-06: la reserva NO se aplica cuando el JWT es válido", async () => {
    // Es el límite que importa. Si alguien ampliara la reserva a «cualquier fallo», el panel
    // pasaría a operar con la clave estática sin que nadie lo notara.
    fetchMock
      .mockResolvedValueOnce(login(3600) as never)
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      } as never);

    await cliente.call("GET", "/admin/users");

    const h = cabecerasDe(1);
    expect(h["Authorization"]).toBe("Bearer jwt-1");
    expect(Object.values(h)).not.toContain("clave-de-reserva");
  });

  it("A-07: un login fallido no deja token corrupto para la llamada siguiente", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500 } as never)
      .mockResolvedValueOnce(cuerpo({}) as never)
      .mockResolvedValueOnce(login(3600, "jwt-recuperado") as never)
      .mockResolvedValueOnce(cuerpo({}) as never);

    await cliente.call("GET", "/a");
    await cliente.call("GET", "/b");

    // Se recupera solo en cuanto el login vuelve a funcionar.
    expect(cabecerasDe(3)["Authorization"]).toBe("Bearer jwt-recuperado");
  });
});
