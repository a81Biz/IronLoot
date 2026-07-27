import * as dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import { NotFoundExceptionFilter } from "./common/filters/not-found.filter";
import * as nunjucks from "nunjucks";
// eslint-disable-next-line @typescript-eslint/no-require-imports

import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import { injectAuthHeader } from "./common/bff/inject-auth-header";
import cookieParser from "cookie-parser";

const isProd = process.env.NODE_ENV === "production";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useGlobalFilters(new NotFoundExceptionFilter());

  // Security headers via Helmet (PT-030.5 / H-009)
  // CSRF note: CLIENT has no SSR POST routes — state changes go through the BFF proxy to the
  // REST API which uses JWT Bearer tokens (immune to CSRF). sameSite: Lax provides browser-level
  // CSRF protection for auth cookies.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // PT-044 (AUD-002): allow the Socket.io client CDN and the API WS origin for the live bid feed.
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "https:"],
          // PT-098 — Solo el propio origen. Antes se listaba `API_URL`, que es la direccion
          // interna de Docker: la politica permitia exactamente lo que el navegador NO puede
          // alcanzar, y nada mas. Con el proxy de arriba, todo va al mismo origen.
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // allow Google Fonts cross-origin
    }),
  );

  const viewsPath = join(__dirname, "..", "views");
  nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app.getHttpAdapter().getInstance(),
    watch: true,
  });

  app.useStaticAssets(join(__dirname, "..", "public"));
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine("html");

  // BFF proxy (PT-038 / AUD-003) — forwards /api requests to the REST API and injects the
  // Bearer token from the HttpOnly access_token cookie, so client-side writes authenticate
  // without exposing the token to browser JS. Mirrors BASE (base/src/main.ts).
  const apiTarget = process.env.API_URL || "http://localhost:3000";
  app.use(
    "/api",
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      // Express strips '/api' before the middleware; re-add it so the API receives /api/v1/...
      pathRewrite: { "^/": "/api/" },
      on: {
        proxyReq: (proxyReq, req) =>
          injectAuthHeader(
            proxyReq,
            req as { cookies?: Record<string, string | undefined> },
          ),
      },
    }),
  );

  // PT-098 (F-25) — Reenvio del WebSocket de la puja en vivo.
  //
  // Antes la vista conectaba a `API_URL + '/auctions'`, es decir `http://api:3000`: la direccion
  // INTERNA de Docker, que un navegador no puede resolver. Fallaba en silencio —socket.io
  // reintenta solo— y las pujas de otros nunca aparecian.
  //
  // Ahora la vista conecta a su PROPIO origen y este proxy lo reenvia. Una URL relativa no puede
  // apuntar mal: no hay ninguna direccion que mantener sincronizada con el entorno.
  //
  // `ws: true` es lo que negocia el upgrade. NO se inyecta cabecera de autenticacion: el espacio
  // de nombres `/auctions` es publico y de solo lectura; meter credenciales en un canal que no
  // las pide seria ampliar la superficie sin motivo.
  app.use(
    "/socket.io",
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      ws: true,
      pathRewrite: { "^/": "/socket.io/" },
    }),
  );

  const port = process.env.CLIENT_PORT || 5175;
  await app.listen(port);
  console.log(`CLIENT service running on port ${port}`);
}
// PT-091 — Se maneja el fallo de arranque, como ya hacia la API. Antes era una promesa
// suelta: si el arranque fallaba, el rechazo quedaba sin manejar y el proceso podia
// sobrevivir en un estado roto sin decirlo. Es justo lo que `no-floating-promises` detecta.
bootstrap().catch((error) => {
  console.error("Failed to start application", error);
  process.exit(1);
});
