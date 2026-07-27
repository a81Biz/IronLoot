/**
 * PT-089 — De dónde salen TODAS las URLs que abandonan el sistema.
 *
 * PT-088 resolvió esto para las URLs de retorno de pago, pero el mismo defecto seguía en tres
 * sitios más, cada uno con su propio `http://localhost:<puerto>` de reserva:
 *
 *  - los enlaces de **verificación de correo y reset de contraseña**, que se envían a usuarios
 *    reales: sin `BASE_URL` configurada apuntaban a `localhost:5174`, una dirección que solo
 *    existe en la máquina de quien desplegó;
 *  - la URL de webhook que se le entrega a **HeyBanco**, que la pasarela tendría que alcanzar
 *    desde fuera;
 *  - las URLs públicas de los **ficheros subidos**.
 *
 * Un valor de reserva con puerto es peor que no tener valor: no falla al arrancar, falla en
 * silencio y en producción, cuando alguien ya recibió el correo.
 *
 * El origen sale de la configuración —`PUBLIC_SCHEME` + `PUBLIC_DOMAIN` derivan estas variables
 * en `docker-compose`— y la reserva es el **subdominio de desarrollo**, nunca un puerto suelto.
 */

const FALLBACKS = {
  BASE_URL: 'http://base.ironloot.local',
  CLIENT_URL: 'http://client.ironloot.local',
  API_BASE_URL: 'http://api.ironloot.local',
} as const;

/** Lee una variable de origen y le quita la barra final, para no generar rutas con doble barra. */
function origin(key: keyof typeof FALLBACKS, configured?: string | null): string {
  const value = (configured ?? process.env[key])?.trim();
  return (value || FALLBACKS[key]).replace(/\/+$/, '');
}

/** Origen público del sitio público (BASE). Es el de los enlaces que se envían por correo. */
export function baseOrigin(configured?: string | null): string {
  return origin('BASE_URL', configured);
}

/** Origen público del portal privado (CLIENT). */
export function clientOrigin(configured?: string | null): string {
  return origin('CLIENT_URL', configured);
}

/**
 * Origen público de la API: el que ven las pasarelas y el que se incrusta en las URLs de los
 * ficheros subidos. **No** es la dirección interna de Docker (`http://api:3000`), que no sirve
 * fuera de la red del compose.
 */
export function apiOrigin(configured?: string | null): string {
  return origin('API_BASE_URL', configured);
}
