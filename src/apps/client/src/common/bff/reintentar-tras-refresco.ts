import type { Request, Response } from "express";
import { refrescarSesion, type Tokens } from "../auth/refrescar-sesion";
import { escribirCookiesDeSesion } from "../auth/escribir-cookies-de-sesion";

/**
 * PT-194 (`TD-025`) — **La otra mitad del refresco: las llamadas del navegador.**
 *
 * El guard cubre la navegación de página. Esto cubre el `fetch('/api/v1/...')` que hace el JS: el proxy
 * inyecta el token de la cookie y, hasta ahora, **dejaba pasar el 401 tal cual**. Cablear sólo el guard
 * dejaría el portal a medias — la página carga y sus llamadas fallan.
 *
 * ## Por qué esto es un módulo y no un `on: { proxyRes }` dentro de `main.ts`
 *
 * Porque hay que **probarlo**, y sobre todo hay que probar lo que **no** hace: que una respuesta 200 o
 * 404 salga intacta. `selfHandleResponse` cambia cómo se devuelve **toda** respuesta, no sólo las que
 * fallan; un error aquí no rompe el refresco, rompe el portal entero en silencio, con cuerpos
 * truncados o binarios corrompidos. Eso no se comprueba leyendo `main.ts`.
 *
 * ## Un intento, y el 401 se devuelve tal cual
 *
 * Si el refresco falla —o si el reintento vuelve a dar 401— se devuelve el **401**, no una redirección:
 * un `fetch` que recibe un 302 al login acabaría metiendo el HTML del login dentro de un `JSON.parse`.
 * El JS de página decide.
 */
export interface RespuestaReintentada {
  status: number;
  cuerpo: Buffer;
}

/** Las dos operaciones que este módulo delega. Inyectadas para poder contarlas en las pruebas. */
export interface Dependencias {
  refrescar: (refreshToken: string) => Promise<Tokens | null>;
  reintentar: (
    req: Request,
    accessToken: string,
  ) => Promise<RespuestaReintentada>;
}

const POR_DEFECTO: Dependencias = {
  refrescar: (t) => refrescarSesion(t),
  reintentar: async (req, accessToken) => {
    const apiUrl = process.env.API_URL as string;
    // `req.url` llega ya reescrito por el proxy (`/api/v1/...`).
    const res = await fetch(`${apiUrl}${req.url}`, {
      method: req.method,
      headers: {
        ...(req.headers as Record<string, string>),
        authorization: `Bearer ${accessToken}`,
      },
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : (req as never),
    });
    return { status: res.status, cuerpo: Buffer.from(await res.arrayBuffer()) };
  },
};

/**
 * Se llama con **cada** respuesta del API. Devuelve el cuerpo que verá el navegador.
 *
 * **Todo lo que no sea un 401 sale por donde entró, sin tocarlo.** Es la garantía que protege el
 * portal entero, y la que más casos de prueba tiene.
 */
export async function interceptarRespuesta(
  cuerpo: Buffer,
  proxyRes: { statusCode?: number },
  req: Request,
  res: Response,
  deps: Dependencias = POR_DEFECTO,
): Promise<Buffer> {
  // Cualquier estado que no sea 401 —incluidos 200, 404 y 500— vuelve **idéntico**. Refrescar ante un
  // 500 convertiría un API caído en una tormenta de refrescos.
  if (proxyRes.statusCode !== 401) return cuerpo;

  const refreshToken = req.cookies?.["refresh_token"];
  // Sin token de refresco no hay nada que preguntar: se devuelve el 401 y el JS decide.
  if (!refreshToken) return cuerpo;

  let tokens: Tokens | null;
  try {
    tokens = await deps.refrescar(refreshToken);
  } catch {
    // El API no contestó al refrescar. El navegador recibe el 401 original, que es la verdad de lo que
    // pasó con **su** petición; el motivo del refresco lo registra `refrescarSesion`.
    return cuerpo;
  }

  if (!tokens) return cuerpo;

  // PT-196 — Las DOS cookies, por el mismo motivo que en el guard: los dos caminos o ninguno.
  escribirCookiesDeSesion(res, tokens);

  // **Un solo reintento.** Si vuelve a dar 401, se devuelve: sin esto, un token que el API rechaza por
  // otro motivo produciría un bucle de refrescos con una llamada por intento.
  const segunda = await deps.reintentar(req, tokens.accessToken);
  res.statusCode = segunda.status;
  return segunda.cuerpo;
}
