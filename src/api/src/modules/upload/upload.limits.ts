/**
 * PT-124 (H-013) — El techo de una subida.
 *
 * Vive aparte del controlador porque el interceptor lo necesita en el decorador —donde no hay
 * inyección de dependencias disponible— y el mensaje de error lo necesita para decir la cifra. Dos
 * sitios, un número.
 *
 * 5 MB: una foto de producto de un móvil actual ronda los 2–4 MB. Por debajo de eso empezaríamos a
 * rechazar subidas legítimas, que es la forma de que alguien suba el límite sin mirar.
 */
export const MAX_BYTES = 5 * 1024 * 1024;

export const MAX_LEGIBLE = '5 MB';
