/**
 * PT-233 (H-UI-063) — De dónde salen las variables de conexión de ADMIN, y por qué sin reserva.
 *
 * ## Por qué existe este fichero un año después que sus gemelos
 *
 * PT-185/PT-186 cerraron `H-035` retirando las reservas de conexión de los cuatro servicios, y su guarda
 * —`conexiones-sin-reserva.spec.ts`— recorre ADMIN entero desde entonces. **Y ADMIN tenía dos.**
 *
 * ```ts
 * private readonly apiUrl = process.env.ADMIN_API_URL || "http://localhost:3000";  // app.controller.ts
 * private readonly apiUrl = process.env.ADMIN_API_URL || "http://localhost:3000";  // app.service.ts
 * ```
 *
 * No las vio porque **`ADMIN_API_URL` no estaba en la lista de variables que la guarda vigila**. La
 * evidencia `E-038` había declarado esa debilidad con estas palabras — *«una variable de conexión nueva
 * que nadie añada a esa lista no se vigilará»*— y `S-013 §SIGUIENTE·4` la repitió como aviso:
 *
 * > *«la lista de variables de conexión de la guarda es su límite, y ya mordió una vez. Cualquier
 * > variable nueva que apunte a un servicio hay que añadirla ahí — no hay nada que lo recuerde.»*
 *
 * **Mordió la segunda vez.** Declarar una debilidad no la cierra.
 *
 * ## Qué pasaba con la reserva puesta
 *
 * Dentro del contenedor, `localhost:3000` **no es el API**: es el propio ADMIN, donde en ese puerto no
 * escucha nadie. Sin `ADMIN_API_URL`, el panel arranca `healthy` y **todas** sus llamadas se pierden —
 * el modo de fallo exacto de H-035, en el servicio desde el que se opera el negocio.
 *
 * ## Por qué duplicado y no compartido
 *
 * Mismo criterio que en BASE y CLIENT: ADMIN no depende de `@ironloot/core` y añadir la dependencia por
 * veinte líneas metería la librería de dominio en un despliegue que hoy no la necesita. El coste está
 * escrito, y lo que impide que los tres diverjan es la guarda, no compartir el código.
 */
const MOTIVO_CONEXION =
  "Es una variable de conexión: sin ella el panel no sabe a dónde llamar, y no se asume ningún " +
  "valor por defecto (RULE-17).";

export function variableObligatoria(
  nombre: string,
  motivo = MOTIVO_CONEXION,
): string {
  const valor = process.env[nombre]?.trim();

  if (!valor) {
    throw new Error(
      `[ADMIN] Falta la variable de entorno ${nombre}. ${motivo} ` +
        `docker-compose la declara; si estás fuera de compose, ponla en el entorno.`,
    );
  }

  return valor.replace(/\/+$/, "");
}
