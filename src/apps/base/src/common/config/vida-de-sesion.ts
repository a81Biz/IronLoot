/**
 * PT-192 (AUD-035) — **La cookie no vive más que el token que transporta.**
 *
 * ## Lo que había: cuatro relojes y ninguno hablaba con otro
 *
 * | Qué | Cuánto duraba | Dónde |
 * |---|---|---|
 * | cookie `access_token` | **7 días** | `main.ts`, literal |
 * | token de acceso | **15 minutos** | `JWT_ACCESS_EXPIRY` |
 * | cookie `refresh_token` | **30 días** | `main.ts`, literal |
 * | token de refresco | **7 días** | `JWT_REFRESH_EXPIRY` |
 *
 * Las dos cookies **sobrevivían a su propio contenido**: la de acceso 672 veces más, la de refresco
 * cuatro. Durante ese sobrante el navegador sigue mandando una credencial muerta, y el sitio parece
 * tener sesión cuando no la tiene. No es un agujero —lo que se verifica es el token—, es un estado que
 * miente: exactamente lo que esta jornada lleva corrigiendo en los registros, pero en el navegador.
 *
 * ## Lo que pasa de verdad, medido
 *
 * **La sesión efectiva dura 15 minutos.** El `ClientAuthGuard` verifica, falla, borra la cookie y manda
 * al login. Y no intenta refrescar: el API expone `POST /auth/refresh`, BASE **guarda** el token de
 * refresco… y **nadie lo usa nunca** — no hay un solo llamante en BASE ni en CLIENT.
 *
 * Es decir: el mecanismo que existe para que la sesión dure siete días está escrito, tiene su cookie de
 * treinta días, y **no está cableado**. Eso no se arregla aquí porque cablearlo es trabajo de
 * funcionalidad sobre el camino de autenticación; queda declarado como **TD-025**.
 *
 * ## Por qué alinear las cookies no cambia el comportamiento
 *
 * La cookie desaparece exactamente cuando dejaba de servir. Hoy el usuario ya vuelve al login a los 15
 * minutos; la diferencia es que el estado del navegador deja de contradecir al del servidor, y que quien
 * depure esto ve una cookie ausente en vez de una presente que no funciona.
 *
 * **Y salen del mismo sitio que el token**: si alguien cambia `JWT_ACCESS_EXPIRY` y las cookies fueran
 * literales, volverían a divergir el mismo día. Es la lección de PT-088 aplicada al tiempo en vez de a
 * las URL — una sola fuente.
 */

/** `15m`, `7d`, `3600`, `2h`… a milisegundos. Es el formato que acepta `jsonwebtoken`. */
export function duracionAMs(valor: string): number {
  const m = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(valor.trim());
  if (!m) {
    // Se aborta en vez de asumir: una duración mal escrita produciría una cookie con una vida
    // inventada, que es el defecto que este fichero corrige.
    throw new Error(
      `[BASE] Duración de sesión no reconocida: "${valor}". Formatos válidos: 900, 15m, 2h, 7d.`,
    );
  }
  const n = Number(m[1]);
  const factor: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  // Sin sufijo, `jsonwebtoken` interpreta segundos.
  return n * (m[2] ? factor[m[2]] : 1000);
}

/**
 * Los mismos valores que el API usa para firmar. Los defectos coinciden con los del API a propósito:
 * si divergieran, la cookie volvería a mentir por otro camino.
 */
export const VIDA_ACCESO_MS = duracionAMs(
  process.env.JWT_ACCESS_EXPIRY || "15m",
);
export const VIDA_REFRESCO_MS = duracionAMs(
  process.env.JWT_REFRESH_EXPIRY || "7d",
);
