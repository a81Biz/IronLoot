import {
  refrescarSesion,
  TOPE_REFRESCO_MS,
  __limpiarEnVuelo,
} from "../src/common/auth/refrescar-sesion";

/**
 * PT-194 · tareas 1, 2 y 3 (`TD-025`) — **La pieza que refresca, y sus dos garantías.**
 *
 * ## Qué es
 *
 * El **único** sitio del CLIENT que conoce la ruta `/auth/refresh`. Hay dos llamantes —el guard, para
 * la navegación, y el proxy, para las llamadas del navegador—; si cada uno construyera su propia
 * llamada, la deduplicación sería imposible y la ruta estaría escrita dos veces. Es el defecto que
 * `PT-173` y `AUD-011` corrigieron en otro sitio: *dos puertas a lo mismo y sólo una con cerradura*.
 *
 * ## `null` y `throw` no son lo mismo, y por eso se prueban por separado
 *
 * - **`null`** — la sesión murió: revocada, expirada, o el usuario ya no puede entrar. El API lo dijo.
 * - **`throw`** — no se pudo preguntar: el API no contestó o tardó demasiado.
 *
 * Las dos llevan al login, pero **no significan lo mismo**. Colapsarlas en `null` sería el `catch` mudo
 * que persigue el checkpoint D3: dentro de un mes, *«los usuarios se salen»* sería indistinguible de
 * *«el API está caído»*, y se buscaría en el sitio equivocado.
 *
 * ## La deduplicación se prueba contando llamadas, no leyendo el código
 *
 * `CA-7` dice «cinco concurrentes → un refresco». Eso sólo se puede afirmar **contando**, y el caso de
 * control es el que le da sentido: con **dos tokens distintos** tienen que salir **dos** llamadas.
 * Agrupar por usuario en vez de por token mezclaría dos sesiones independientes —móvil y escritorio— y
 * una revocada arrastraría a la otra.
 */
const API = "http://api.test";
const TOKEN = "refresh-abc";

/** Respuesta que el API devuelve al refrescar bien. */
const TOKENS_OK = {
  accessToken: "access-nuevo",
  refreshToken: TOKEN,
  expiresIn: 900,
};

describe("refrescarSesion — PT-194 (TD-025)", () => {
  let fetchDoble: jest.Mock;

  beforeEach(() => {
    __limpiarEnVuelo();
    fetchDoble = jest.fn();
    (globalThis as unknown as { fetch: unknown }).fetch = fetchDoble;
    process.env.API_URL = API;
  });

  const respuesta = (status: number, cuerpo: unknown = {}) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(cuerpo),
    });

  // ── PT-194.1 — los tres desenlaces ────────────────────────────────────────────────────────────
  describe("PT-194.1: los tres desenlaces del refresco", () => {
    it("C1: 200 devuelve los tokens nuevos", async () => {
      fetchDoble.mockReturnValue(respuesta(200, { tokens: TOKENS_OK }));

      await expect(refrescarSesion(TOKEN)).resolves.toEqual({
        accessToken: "access-nuevo",
        refreshToken: TOKEN,
      });
    });

    it("C2: 401 devuelve `null` — la sesion murio, y el API lo dijo", async () => {
      fetchDoble.mockReturnValue(respuesta(401));

      await expect(refrescarSesion(TOKEN)).resolves.toBeNull();
    });

    it("C3: 500 LANZA — no se pudo preguntar, que no es lo mismo que un no", async () => {
      // Tratar un 500 como `null` diría «tu sesión ha caducado» cuando lo que pasa es que el API está
      // roto. El usuario acabaría en el login sin motivo y nadie sabría por qué.
      fetchDoble.mockReturnValue(respuesta(500));

      await expect(refrescarSesion(TOKEN)).rejects.toThrow(/refresc/i);
    });

    it("C4: la red caida LANZA, no devuelve null", async () => {
      fetchDoble.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(refrescarSesion(TOKEN)).rejects.toThrow();
    });

    it("C5: llama a la ruta del API, con el token en el cuerpo", async () => {
      fetchDoble.mockReturnValue(respuesta(200, { tokens: TOKENS_OK }));

      await refrescarSesion(TOKEN);

      const [url, opciones] = fetchDoble.mock.calls[0];
      expect(String(url)).toBe(`${API}/api/v1/auth/refresh`);
      expect(opciones.method).toBe("POST");
      expect(JSON.parse(opciones.body)).toEqual({ refreshToken: TOKEN });
    });
  });

  // ── PT-194.2 — deduplicacion en vuelo ─────────────────────────────────────────────────────────
  describe("PT-194.2: la deduplicacion se cuenta, no se supone", () => {
    it("C6: cinco llamadas concurrentes con el MISMO token -> UNA al API", async () => {
      let resolver: (v: unknown) => void = () => undefined;
      fetchDoble.mockReturnValue(new Promise((r) => (resolver = r)));

      const cinco = Promise.all(
        Array.from({ length: 5 }, () => refrescarSesion(TOKEN)),
      );
      resolver({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ tokens: TOKENS_OK }),
      });
      const resultados = await cinco;

      expect(fetchDoble).toHaveBeenCalledTimes(1);
      // Y las cinco reciben lo mismo: engancharse a la promesa no puede dar respuestas distintas.
      expect(new Set(resultados.map((r) => r?.accessToken))).toEqual(
        new Set(["access-nuevo"]),
      );
    });

    it("AC-01 (control): dos tokens DISTINTOS -> DOS llamadas", async () => {
      // Es el caso que impide agrupar por usuario. Un usuario puede tener sesión en el móvil y en el
      // escritorio; son independientes, y una revocada no puede arrastrar a la otra.
      fetchDoble.mockReturnValue(respuesta(200, { tokens: TOKENS_OK }));

      await Promise.all([
        refrescarSesion("token-movil"),
        refrescarSesion("token-escritorio"),
      ]);

      expect(fetchDoble).toHaveBeenCalledTimes(2);
    });

    it("AC-02 (control): tras resolverse, un refresco POSTERIOR vuelve a llamar", async () => {
      // Sin esto, la deduplicación sería una caché: el segundo refresco devolvería el token viejo
      // para siempre. Se comparte la llamada **en vuelo**, no su resultado.
      fetchDoble.mockReturnValue(respuesta(200, { tokens: TOKENS_OK }));

      await refrescarSesion(TOKEN);
      await refrescarSesion(TOKEN);

      expect(fetchDoble).toHaveBeenCalledTimes(2);
    });

    it("AC-03 (control): un fallo tampoco se queda pegado", async () => {
      // Si la promesa fallida no se retirara del mapa, la sesión quedaría envenenada: todo refresco
      // posterior heredaría el error aunque el API ya se hubiera recuperado.
      fetchDoble.mockRejectedValueOnce(new Error("caido"));
      await expect(refrescarSesion(TOKEN)).rejects.toThrow();

      fetchDoble.mockReturnValue(respuesta(200, { tokens: TOKENS_OK }));
      await expect(refrescarSesion(TOKEN)).resolves.not.toBeNull();
      expect(fetchDoble).toHaveBeenCalledTimes(2);
    });
  });

  // ── PT-194.3 — tope de espera ─────────────────────────────────────────────────────────────────
  describe("PT-194.3: el API es un tercero, y declara su tope", () => {
    it("C7: un `fetch` que nunca resuelve LANZA en vez de colgar la pagina", async () => {
      // Se comprueba que la señal de aborto llega al `fetch`: es lo que corta. Medir el tiempo real
      // haría la prueba lenta y dependiente de la máquina.
      fetchDoble.mockImplementation(
        (_url: string, opciones: { signal?: AbortSignal }) => {
          return new Promise((_, rechazar) => {
            opciones.signal?.addEventListener("abort", () =>
              rechazar(
                Object.assign(new Error("abortado"), { name: "AbortError" }),
              ),
            );
          });
        },
      );

      const prometido = refrescarSesion(TOKEN, 20);

      await expect(prometido).rejects.toThrow();
    });

    it("AC-04 (control): el tope por defecto existe y es una consulta, no una operacion", async () => {
      // Refrescar es **consultar**: si se corta, no queda nada a medias — la sesión en la BD sigue
      // intacta y el usuario va al login. Por eso hereda el tope corto (PT-183/PT-184) y no el largo
      // de «crear o capturar», donde abandonar deja un cobro sin saber qué pasó.
      expect(TOPE_REFRESCO_MS).toBeGreaterThan(0);
      expect(TOPE_REFRESCO_MS).toBeLessThanOrEqual(10_000);
    });
  });
});
