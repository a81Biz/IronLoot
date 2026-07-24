/**
 * BFF (PT-038 / AUD-003): inyecta el token Bearer desde la cookie HttpOnly
 * `access_token` en la petición proxiada, de modo que el JS del navegador
 * nunca maneja el token. Espeja el comportamiento de BASE (`base/src/main.ts`).
 */
export interface ProxyReqLike {
  setHeader(name: string, value: string): void;
}

export interface ReqLike {
  cookies?: Record<string, string | undefined>;
}

export function injectAuthHeader(proxyReq: ProxyReqLike, req: ReqLike): void {
  const token = req.cookies?.['access_token'];
  if (token) {
    proxyReq.setHeader('Authorization', `Bearer ${token}`);
  }
}
