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

  // PT-013: almacen de sesiones en Redis. PT-111 (F-39): nunca llego a usarse.
  //
  // Esto pedia `require("connect-redis").default`, y **connect-redis v9 no tiene `default`**:
  // exporta `RedisStore` con nombre. `new undefined(...)` lanzaba, el catch se disparaba, y el
  // panel arrancaba con sesiones en memoria diciendo «Redis unavailable» — con Redis levantado y
  // sano. El mensaje culpaba a la infraestructura de un error del codigo: manda a buscar donde no
  // esta. Y el comentario de arriba afirmaba «BRECHA-8 resolved», que era falso.
  //
  // Ademas quedaba un cliente ioredis huerfano reintentando para siempre (77 ECONNREFUSED en un
  // arranque). Ahora, si falla, se cierra.
  let store: session.Store | undefined;
  // PT-137/PT-147 — Esta reserva era `redis://redis:6379`, el nombre del contenedor de
  // `docker-compose`. Fuera de esa red no resuelve, y ADMIN se quedaba reintentando sin llegar
  // nunca a arrancar: es lo que hizo fallar el job `docker` de PT-147 en su primera corrida.
  //
  // Una reserva escrita para un entorno concreto parece un valor por defecto razonable y no lo es.
  // Sin `REDIS_URL` no se arranca, y se dice cual falta.
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error(
      "REDIS_URL no esta definida. ADMIN guarda sus sesiones en Redis; sin ella arrancaria con " +
        "sesiones en memoria y las perderia en cada reinicio — el defecto de F-39, que estuvo " +
        "meses sin verse porque el `catch` decia «Redis unavailable» con Redis levantado.",
    );
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RedisStore } = require("connect-redis");
    if (typeof RedisStore !== "function") {
      throw new Error(
        "connect-redis no exporta `RedisStore`: revisa su version antes de tocar nada mas",
      );
    }
    // El cliente es `node-redis`, NO `ioredis`. connect-redis v9 llama a `set(k, v, {EX: ttl})`,
    // que es el dialecto de node-redis; ioredis espera `set(k, v, 'EX', ttl)` y responde
    // `ERR syntax error`. Con ioredis el arranque decia «Sesiones en Redis» y las escrituras
    // fallaban una a una: la peor combinacion posible — un exito anunciado y un fallo callado.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("redis");
    const redisClient = createClient({ url: redisUrl });
    // Sin esto, un fallo de conexion tumba el proceso por evento no gestionado.
    redisClient.on("error", (e: Error) => {
      console.error(`[Admin] Redis (${redisUrl}):`, e.message);
    });
    await redisClient.connect();
    store = new RedisStore({ client: redisClient });
    console.log(`[Admin] Sesiones en Redis (${redisUrl})`);
  } catch (e) {
    // El fallo se NOMBRA. Un aviso que no dice que fallo manda a buscar donde no esta.
    console.warn(
      `[Admin] Sesiones EN MEMORIA (no apto para produccion). Motivo: ${
        e instanceof Error ? e.message : String(e)
      }`,
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
