import { AdminAuthGuard } from "../src/auth/auth.guard";
import type { ExecutionContext } from "@nestjs/common";

/**
 * PT-101 (F-31) — El guardia del panel de administración.
 *
 * Catorce líneas que deciden quién entra al sitio que aprueba retiros, suspende usuarios y
 * cancela subastas. Hasta ahora **ninguna estaba probada**, porque ADMIN no tenía dónde poner
 * una prueba.
 *
 * Su modo de fallo es silencioso en la dirección peligrosa: si `canActivate` devolviera `true`
 * de más, nadie se entera hasta que alguien entra. Un rechazo indebido, en cambio, se nota al
 * instante porque el panel deja de abrirse.
 *
 * Por eso los casos que importan son los de **rechazo**, y en particular el de sesión a medias.
 */
describe("AdminAuthGuard (PT-101)", () => {
  let guard: AdminAuthGuard;
  let redirect: jest.Mock;

  /** Contexto mínimo: el guardia sólo mira la petición y la respuesta. */
  const contexto = (session: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ session }),
        getResponse: () => ({ redirect }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new AdminAuthGuard();
    redirect = jest.fn();
  });

  it("G-01: con sesión de administrador, deja pasar", () => {
    expect(guard.canActivate(contexto({ isAdmin: true }))).toBe(true);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("G-02: sin sesión, NO deja pasar", () => {
    expect(guard.canActivate(contexto(undefined))).toBe(false);
  });

  it("G-03: con sesión pero SIN `isAdmin`, NO deja pasar", () => {
    // Es el caso que un `if (req.session)` ingenuo dejaría entrar: la sesión existe —cualquier
    // visitante tiene una en cuanto express-session actúa— pero nadie se ha autenticado.
    expect(guard.canActivate(contexto({}))).toBe(false);
    expect(guard.canActivate(contexto({ usuario: "alguien" }))).toBe(false);
  });

  it("G-04: con `isAdmin: false` explícito, NO deja pasar", () => {
    expect(guard.canActivate(contexto({ isAdmin: false }))).toBe(false);
  });

  it("G-05: al rechazar, redirige a /login en vez de lanzar", () => {
    // Lanzar mostraría una página de error del framework, que además confirma que la ruta
    // existe. Redirigir es mejor experiencia y dice menos.
    guard.canActivate(contexto(undefined));

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("G-06: un valor cualquiera en `isAdmin` no vale como sí", () => {
    // `isAdmin: 'true'` (cadena) o `isAdmin: 1` podrían colarse si alguien escribe la sesión
    // desde otro sitio. Aquí se documenta qué hace hoy el guardia con ellos.
    const resultados = [
      guard.canActivate(contexto({ isAdmin: "false" })),
      guard.canActivate(contexto({ isAdmin: 0 })),
      guard.canActivate(contexto({ isAdmin: null })),
    ];

    // PT-101 — Ninguno abre el panel. Antes de endurecer el guardia, `'false'` SI lo abria:
    // una cadena no vacia es verdadera, y la comprobacion era por veracidad. No era explotable
    // —solo el login escribe esa sesion, y escribe un booleano— pero es la frontera del contexto
    // de mas privilegio, y la correccion costaba una palabra.
    expect(resultados).toEqual([false, false, false]);
  });
});
