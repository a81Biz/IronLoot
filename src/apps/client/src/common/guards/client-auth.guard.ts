import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Response, Request } from "express";
import * as jwt from "jsonwebtoken";
import { variableObligatoria } from "../config/variable-obligatoria";
import { refrescarSesion, type Tokens } from "../auth/refrescar-sesion";
import { VIDA_ACCESO_MS } from "../config/vida-de-sesion";

// PT-186 (H-035) — Aqui BASE_URL es a donde se manda a alguien que no ha iniciado sesion. Con reserva a
// `localhost:5174`, un despliegue sin la variable redirigia a una direccion que solo existe en la maquina de
// quien desplego: el usuario acabaria en una pagina que no carga, sin saber por que.
const BASE_URL = variableObligatoria("BASE_URL");
// PT-040 (AUD-026): no weak fallback secret. If JWT_SECRET is unset the guard fails closed
// (jwt.verify throws → redirect to login) instead of trusting a known placeholder.
//
// PT-192 (AUD-026) — **Y eso fallaba cerrado en la PETICIÓN, no en el arranque.** Era
// `process.env.JWT_SECRET || ""`: sin la variable, el CLIENT arrancaba `healthy` y rebotaba al login a
// todo el mundo, **para siempre y sin un error en ningún log**. El usuario inicia sesión en BASE, recibe
// una cookie válida y el portal privado lo devuelve al login: el síntoma manda a mirar la cookie, el
// dominio o el `SameSite` — a cualquier sitio menos a una variable que nadie declaró. Es el modo de
// fallo de H-035, y aquí es peor porque es el secreto con el que se decide quién eres.
//
// La asimetría lo delataba: **una línea más arriba**, `BASE_URL` ya usaba `variableObligatoria()`.
//
// Se exige además la longitud mínima, la misma que el API (`jwt-secret.ts`, PT-126): un secreto de
// cuatro caracteres firma igual de bien. Y hay un segundo modo que esto no cubre pero conviene saber:
// si este `JWT_SECRET` **difiere** del del API, el CLIENT rechaza tokens válidos con el mismo síntoma.
// Por eso el mensaje de abajo lo nombra.
const LONGITUD_MINIMA = 32;
const JWT_SECRET = variableObligatoria(
  "JWT_SECRET",
  "Es el secreto con el que se verifican las sesiones, y tiene que ser **el mismo** que el del API: " +
    "sin él este sitio arranca y rebota al login a todo el mundo, sin error en ningún log.",
);
if (JWT_SECRET.length < LONGITUD_MINIMA) {
  // El valor NO se incluye en el mensaje: esto acaba en un log.
  throw new Error(
    `[CLIENT] JWT_SECRET tiene ${JWT_SECRET.length} caracteres y hacen falta al menos ` +
      `${LONGITUD_MINIMA}. Tiene que ser **el mismo** que el del API: si difieren, este sitio rechaza ` +
      `sesiones perfectamente válidas y el usuario sólo ve que vuelve al login.`,
  );
}
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

/** Opciones con las que se borran las cookies. Deben coincidir con las que las escribieron. */
const OPCIONES_BORRADO = { domain: COOKIE_DOMAIN, path: "/" };

@Injectable()
export class ClientAuthGuard implements CanActivate {
  /**
   * PT-194 (`TD-025`) — **Verificar → refrescar UNA vez → login.**
   *
   * Antes era *verificar → fallar → login*, y con `JWT_ACCESS_EXPIRY=15m` eso significaba que **la
   * sesión efectiva del portal duraba quince minutos**, aunque el sistema tuviera escrito y guardado
   * todo lo necesario para que durase siete días: el API expone `/auth/refresh`, BASE guarda el token
   * de refresco con su cookie… y **no lo llamaba nadie**.
   *
   * ## Sólo la expiración refresca, y ésa es la decisión de seguridad
   *
   * `jwt.verify` falla por expiración, por firma inválida, por token malformado. Refrescar ante
   * **cualquier** fallo convertiría el refresco en una vía para saltarse la verificación: bastaría
   * presentar un `access_token` basura junto a una cookie de refresco válida y este guard pediría un
   * token nuevo tan tranquilo.
   *
   * ## Un intento por petición, nunca dos
   *
   * Es la barrera contra el bucle. Un refresco fallido que no cerrara sesión se reintentaría en cada
   * navegación: el usuario atrapado y el API recibiendo una llamada por página.
   *
   * ## Y el token nuevo tiene que llegar a `apiGet` de esta misma petición
   *
   * Se actualiza `req.cookies.access_token` **en memoria**, no sólo la cookie del navegador. Sin eso,
   * las 28 llamadas de `apiGet` de esta petición irían con el token viejo y la página renderizaría
   * **vacía** —sin error y sin traza—, con la cookie ya correcta para la siguiente. Un arreglo que
   * produce páginas en blanco es peor que el defecto que corrige.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const token = req.cookies?.["access_token"];
    if (!token) return this.alLogin(res);

    try {
      (req as any).user = jwt.verify(token, JWT_SECRET) as Record<
        string,
        unknown
      >;
      return true;
    } catch (error) {
      // **La rama que decide la seguridad de todo esto.** Cualquier fallo que no sea expiración
      // —firma inválida, token malformado, basura— va al login SIN refrescar.
      if (!(error instanceof jwt.TokenExpiredError))
        return this.cerrarSesion(res);

      return this.refrescarYSeguir(req, res);
    }
  }

  private async refrescarYSeguir(
    req: Request,
    res: Response,
  ): Promise<boolean> {
    const refreshToken = req.cookies?.["refresh_token"];
    // Sin token de refresco no hay nada que preguntar: al login, y **sin llamar al API**.
    if (!refreshToken) return this.cerrarSesion(res);

    let tokens: Tokens | null;
    try {
      tokens = await refrescarSesion(refreshToken);
    } catch {
      // El API no contestó. Lleva al mismo sitio que un `null`, pero por otro motivo — y esa
      // diferencia la registra `refrescarSesion`, que es donde se sabe cuál de los dos fue.
      return this.cerrarSesion(res);
    }

    // `null` = la sesión murió: revocada, expirada o usuario suspendido. Lo dijo el API.
    if (!tokens) return this.cerrarSesion(res);

    res.cookie("access_token", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.COOKIE_SAMESITE || "Lax") as
        "lax" | "strict" | "none",
      ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
      maxAge: VIDA_ACCESO_MS,
      path: "/",
    });

    // **Lo que evita la página en blanco**: `apiGet` lee de aquí, en esta misma petición.
    if (req.cookies) req.cookies["access_token"] = tokens.accessToken;
    (req as any).user = jwt.decode(tokens.accessToken);

    return true;
  }

  /** Borra **las dos** cookies y manda al login. Dejar la de refresco sería dejar una llave muerta. */
  private cerrarSesion(res: Response): boolean {
    res.clearCookie("access_token", OPCIONES_BORRADO);
    res.clearCookie("refresh_token", OPCIONES_BORRADO);
    return this.alLogin(res);
  }

  private alLogin(res: Response): boolean {
    res.redirect(`${BASE_URL}/auth/login`);
    return false;
  }
}
