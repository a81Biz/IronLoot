import type { CookieOptions, Response } from "express";
import { VIDA_ACCESO_MS, VIDA_REFRESCO_MS } from "../config/vida-de-sesion";
import type { Tokens } from "./refrescar-sesion";

/**
 * PT-196 — **Las dos cookies de sesión, con las opciones exactas de BASE.**
 *
 * ## Por qué es una pieza y no dos líneas repetidas
 *
 * Dos llamantes —el `ClientAuthGuard` y el interceptor del proxy— y unas opciones que tienen que
 * coincidir **exactamente** con las que BASE usó al escribirlas en el login. Un `sameSite` o un
 * `domain` distinto **no sustituye** la cookie: crea una segunda, y el navegador manda las dos.
 *
 * Ese fallo se ve como *«a veces funciona»* —según cuál gane— y es de los peores de diagnosticar,
 * porque nada falla del todo.
 *
 * ## Por qué el `refresh_token` empieza a reescribirse ahora
 *
 * Hasta PT-196 el CLIENT sólo reescribía `access_token`: el de refresco se ponía en el login y no se
 * tocaba, porque el API devolvía siempre el mismo. **Con la rotación, cada refresco entrega uno
 * nuevo.** Si no se persiste, el navegador conserva el viejo, lo presenta en el siguiente refresco y
 * la detección de reuso **revoca la sesión** — a todos los usuarios, en su segundo refresco.
 *
 * Este fichero es lo que impide que la rotación sea una regresión total, y por eso su bloque de tareas
 * va **antes** que la rotación en el orden de despliegue (`design.md § D-6`).
 */

/** El dominio sólo se incluye si está configurado: `domain: undefined` **no** es lo mismo que omitirlo. */
const dominio = process.env.COOKIE_DOMAIN || undefined;

/**
 * Las mismas que `COOKIE_OPTIONS` en `src/apps/base/src/main.ts`. Si una cambia allí, tiene que cambiar
 * aquí — y lo que impide que diverjan en silencio es que las dos leen **las mismas variables de
 * entorno**, no que compartan el código.
 */
export const OPCIONES_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // El valor se conserva tal cual lo escribe BASE —`Lax` con mayuscula—, pero el tipo de Express
  // espera la forma en minuscula. Express normaliza al serializar, asi que el tipado es lo unico que
  // cambia: **no se toca lo que acaba en la cabecera**, o la cookie dejaria de coincidir con la de BASE.
  sameSite: (process.env.COOKIE_SAMESITE ||
    "Lax") as unknown as CookieOptions["sameSite"],
  ...(dominio ? { domain: dominio } : {}),
  path: "/",
};

/** Escribe las dos cookies, **cada una con la vida de su token**. */
export function escribirCookiesDeSesion(res: Response, tokens: Tokens): void {
  res.cookie("access_token", tokens.accessToken, {
    ...OPCIONES_BASE,
    maxAge: VIDA_ACCESO_MS,
  });

  // Con la misma vida que el de acceso, la sesión volvería a durar quince minutos por otro camino.
  res.cookie("refresh_token", tokens.refreshToken, {
    ...OPCIONES_BASE,
    maxAge: VIDA_REFRESCO_MS,
  });
}
