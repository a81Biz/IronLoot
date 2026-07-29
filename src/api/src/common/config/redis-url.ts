/**
 * PT-137 — `REDIS_URL` es el contrato, y es el unico.
 *
 * Habia tres formas de configurar Redis conviviendo:
 *
 *   | Cliente                          | Leia                                    |
 *   |----------------------------------|-----------------------------------------|
 *   | colas Bull (`app.module`)        | `REDIS_HOST` / `REDIS_PORT`, con reserva `localhost` |
 *   | throttler (`throttler-redis`)    | idem                                    |
 *   | cerrojo (`distributed-lock`)     | `REDIS_URL`                             |
 *   | sesiones de ADMIN (`main.ts`)    | `REDIS_URL`, con reserva `redis://redis:6379` |
 *
 * Y `docker-compose.yml` declaraba **solo `REDIS_URL`**. Lo que hacia funcionar el contenedor de
 * desarrollo era `REDIS_HOST=redis` dentro de `src/api/.env`, **un fichero que no esta en git**
 * (F-135-A).
 *
 * ## Por que la reserva era el problema, y no la variable
 *
 * Un `config.get('REDIS_HOST', 'localhost')` convierte «mal configurado» en «configurado hacia
 * ninguna parte», y el proceso arranca. En la imagen de produccion eso daba:
 *
 *     Nest application successfully started            <- arranco «bien»
 *     GET /api/v1/health -> 500  «Reached the max retries per request limit (which is 20)»
 *
 * Un mensaje que **no menciona Redis ni configuracion** y manda a mirar reintentos. Es la familia de
 * PT-111/F-39, donde ADMIN apuntaba a `localhost:6379` sin que nadie lo notara.
 *
 * Y PT-147 dio la prueba desde el otro lado: la imagen de ADMIN se quedo reintentando contra
 * `redis://redis:6379` —su reserva, escrita para la red de compose— y nunca llego a `healthy`.
 *
 * ## La forma correcta es la de `JWT_SECRET`
 *
 * PT-126 la fijo cuando los tipos de `@nestjs/jwt` 11 delataron que se leia en seis sitios sin
 * exigir que existiera: **una funcion que lanza, nombrando la variable**. No un `!`, no un valor por
 * defecto que engaña.
 */
export function redisUrlObligatoria(valor: string | undefined): string {
  if (!valor || valor.trim() === '') {
    throw new Error(
      'REDIS_URL no esta definida. Es el unico contrato de configuracion de Redis (PT-137): ' +
        'las colas, el rate limiting, el cerrojo distribuido y las sesiones de ADMIN la usan. ' +
        'Sin ella el proceso NO arranca a proposito — arrancar apuntando a `localhost` dejaba ' +
        'colas y rate limiting caidos con un error sobre `maxRetriesPerRequest` que no menciona Redis.',
    );
  }
  return valor;
}

/**
 * Descompone la URL en host, puerto y contraseña, para los clientes que no aceptan una URL.
 *
 * BullMQ toma `{ host, port, password }`, no una cadena. Derivarlo **de la misma variable** es lo
 * que impide que vuelva a haber dos fuentes: la URL sigue siendo el contrato, y esto es solo su
 * lectura.
 */
export function conexionRedis(url: string): { host: string; port: number; password?: string } {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    password: u.password || undefined,
  };
}
