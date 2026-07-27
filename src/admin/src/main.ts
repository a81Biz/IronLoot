import * as dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import * as nunjucks from "nunjucks";
import * as cookieParser from "cookie-parser";
import * as session from "express-session";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());

  // PT-040 (AUD-007): security headers for the backoffice (previously missing). CSP allows the
  // Chart.js CDN used by the dashboard; inline scripts/styles kept for the existing templates.
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
          scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
          // PT-105 (TD-014) — `'unsafe-inline'` RETIRADO tambien de los estilos.
          //
          // PT-096 lo quito de `script-src`, donde el riesgo es ejecutar codigo, y dejo esta
          // mitad abierta; PT-103 la registro como TD-014 al comprobar aquel cierre. Los 93
          // atributos `style=` que lo obligaban viven ahora en el CSS del sitio.
          //
          // Lo que el JavaScript hace con `el.style` o `classList` NO lo cubre la CSP: solo el
          // atributo en el marcado y los bloques <style>.
          styleSrc: [
            "'self'",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          // PT-100 — Helmet añade `upgrade-insecure-requests` por defecto, y en desarrollo eso
          // ROMPE el panel entero: el navegador sube cada peticion a `https://admin.<dominio>`,
          // donde no escucha nadie, y el login falla con ERR_CONNECTION_REFUSED antes de poder
          // guardar la cookie de sesion.
          //
          // No se notaba con `localhost` porque los navegadores lo eximen de la subida a HTTPS.
          // Al pasar la suite a subdominios (PT-088/PT-097) aparecieron 24 checks caidos, y el
          // sintoma —«la sesion no persiste»— apuntaba en la direccion equivocada: la sesion
          // estaba bien, la peticion nunca llegaba.
          //
          // BASE y CLIENT ya lo resolvian asi; ADMIN se habia quedado fuera.
          upgradeInsecureRequests:
            process.env.NODE_ENV === "production" ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // PT-013: Redis session store for admin (BRECHA-8 resolved)
  // Falls back to in-memory store if Redis is unavailable (dev without Redis)
  let store: session.Store | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Redis } = require("ioredis");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RedisStore = require("connect-redis").default;
    const redisClient = new Redis(
      process.env.REDIS_URL || "redis://localhost:6379",
    );
    store = new RedisStore({ client: redisClient });
    console.log("[Admin] Redis session store initialized");
  } catch {
    console.warn(
      "[Admin] Redis unavailable — using in-memory session store (not for production)",
    );
  }

  app.use(
    session({
      store,
      secret:
        process.env.ADMIN_SESSION_SECRET || "admin-dev-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        // PT-040 (AUD-014/AUD-007): SameSite=Lax blocks the admin session cookie on cross-site
        // POSTs — a solid CSRF mitigation for the backoffice without per-form tokens.
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000,
      },
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

  const port = process.env.ADMIN_PORT || 3001;
  await app.listen(port);
  console.log(`Iron Loot Admin running on: http://localhost:${port}`);
}
// PT-091 — Se maneja el fallo de arranque, como ya hacia la API. Antes era una promesa
// suelta: si el arranque fallaba, el rechazo quedaba sin manejar y el proceso podia
// sobrevivir en un estado roto sin decirlo. Es justo lo que `no-floating-promises` detecta.
bootstrap().catch((error) => {
  console.error("Failed to start application", error);
  process.exit(1);
});
