import * as dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import { NotFoundExceptionFilter } from "./common/filters/not-found.filter";
import * as nunjucks from "nunjucks";
// eslint-disable-next-line @typescript-eslint/no-require-imports

import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { variableObligatoria } from "./common/config/variable-obligatoria";
import {
  VIDA_ACCESO_MS,
  VIDA_REFRESCO_MS,
} from "./common/config/vida-de-sesion";

// COOKIE_DOMAIN controls cross-subdomain SSO. Set to `.ironloot.local` for local dev
// with hosts-file entries, or `.ironloot.com` for production.
// If empty or unset, the cookie is scoped to the host that set it (no cross-subdomain SSO).
// Note: `domain=localhost` (without leading dot) does NOT propagate to subdomains in Chrome ≥ 90.
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
const isProd = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (process.env.COOKIE_SAMESITE || "Lax") as "Lax" | "Strict" | "None",
  ...(cookieDomain ? { domain: cookieDomain } : {}),
  // PT-192 (AUD-035) — La cookie dura lo que dura el token que lleva dentro. Antes era un literal de
  // **7 días** para un token de **15 minutos**: el navegador seguía mandando una credencial muerta
  // durante seis días y veintitrés horas. Motivo completo en `common/config/vida-de-sesion.ts`.
  maxAge: VIDA_ACCESO_MS,
  path: "/",
};

const AUTH_TOKEN_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useGlobalFilters(new NotFoundExceptionFilter());

  // Security headers via Helmet (PT-030.5 / H-009)
  // CSRF note: BASE has no SSR POST routes — all state changes go through /api BFF proxy
  // to the REST API which uses JWT Bearer tokens (immune to CSRF by design).
  // sameSite: Lax on auth cookies provides browser-level CSRF protection.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // PT-096 - `'unsafe-inline'` RETIRADO. Estaba porque el JavaScript vivia dentro de las
          // plantillas; ahora vive en ficheros y la directiva sobra. Mientras estuvo, un XSS que
          // lograra inyectar un `<script>` se ejecutaba: es justo lo que la CSP deberia impedir.
          //
          // Si algo deja de funcionar tras esto, la respuesta NO es devolver la palabra: es que
          // queda codigo en una plantilla. Las guardas de `plantillas-sin-js-inline.spec.ts` lo
          // dicen en segundos.
          scriptSrc: ["'self'"], // PT-096: sin `unsafe-inline`; el JS vive en public/js/
          // PT-105 (TD-014) — `'unsafe-inline'` RETIRADO tambien de los estilos.
          //
          // PT-096 lo quito de `script-src`, donde el riesgo es ejecutar codigo, y dejo esta
          // mitad abierta; PT-103 la registro como TD-014 al comprobar aquel cierre. Los 93
          // atributos `style=` que lo obligaban viven ahora en el CSS del sitio.
          //
          // Lo que el JavaScript hace con `el.style` o `classList` NO lo cubre la CSP: solo el
          // atributo en el marcado y los bloques <style>.
          styleSrc: ["'self'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "https:"],
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

  // BFF proxy — forwards API requests and handles auth cookies
  // PT-186 (H-035) — **El destino del proxy del BFF.** Con reserva a `localhost:3000`, un despliegue sin
  // `API_URL` mandaba TODAS las llamadas del sitio publico a su propio contenedor, donde no escucha nadie: el
  // sitio arranca y no funciona. Es el mas caro de los tres sitios que tenian esta reserva.
  const apiTarget = variableObligatoria("API_URL");
  app.use(
    "/api",
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      // Express strips '/api' prefix before passing to middleware, so we add it back
      pathRewrite: { "^/": "/api/" },
      selfHandleResponse: true,
      on: {
        proxyReq: (proxyReq, req) => {
          const expressReq = req as any;
          if (expressReq.cookies?.["access_token"]) {
            proxyReq.setHeader(
              "Authorization",
              `Bearer ${expressReq.cookies["access_token"]}`,
            );
          }
        },
        proxyRes: responseInterceptor(
          async (responseBuffer, proxyRes, req, res) => {
            const expressRes = res as any;
            const originalUrl = (req as any).originalUrl || "";
            const isAuthEndpoint = AUTH_TOKEN_ENDPOINTS.some((ep) =>
              originalUrl.includes(ep),
            );
            const contentType = proxyRes.headers["content-type"] || "";
            if (!contentType.includes("application/json"))
              return responseBuffer;

            let body: any;
            try {
              body = JSON.parse(responseBuffer.toString("utf8"));
            } catch {
              return responseBuffer;
            }

            if (
              isAuthEndpoint &&
              proxyRes.statusCode &&
              proxyRes.statusCode < 300
            ) {
              const tokens = body.tokens || body;
              if (tokens?.accessToken) {
                expressRes.cookie(
                  "access_token",
                  tokens.accessToken,
                  COOKIE_OPTIONS,
                );
                if (tokens.refreshToken) {
                  expressRes.cookie("refresh_token", tokens.refreshToken, {
                    ...COOKIE_OPTIONS,
                    // PT-192 (AUD-035) — Era un literal de 30 días para un token de 7. Ojo: este token
                    // **no lo consume nadie** todavía (TD-025), así que hoy la sesión efectiva son los
                    // 15 minutos del de acceso, no estos 7 días.
                    maxAge: VIDA_REFRESCO_MS,
                  });
                }
                return JSON.stringify({
                  success: true,
                  user: body.user || tokens.user,
                  message: body.message,
                });
              }
            }

            if (originalUrl.includes("/auth/logout")) {
              const clearOpts = {
                path: "/",
                ...(cookieDomain ? { domain: cookieDomain } : {}),
              };
              expressRes.clearCookie("access_token", clearOpts);
              expressRes.clearCookie("refresh_token", clearOpts);
            }
            return responseBuffer;
          },
        ),
      },
    }),
  );

  const port = process.env.BASE_PORT || 5174;
  await app.listen(port);
  console.log(`BASE service running on port ${port}`);
}
// PT-091 — Se maneja el fallo de arranque, como ya hacia la API. Antes era una promesa
// suelta: si el arranque fallaba, el rechazo quedaba sin manejar y el proceso podia
// sobrevivir en un estado roto sin decirlo. Es justo lo que `no-floating-promises` detecta.
bootstrap().catch((error) => {
  console.error("Failed to start application", error);
  process.exit(1);
});
