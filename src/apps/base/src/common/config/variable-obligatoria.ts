/**
 * PT-186 (H-035) — De dónde salen las variables de conexión de BASE, y por qué sin reserva.
 *
 * Aquí había, repartido en dos ficheros:
 *
 * ```ts
 * const API_URL = process.env.API_URL || "http://localhost:3000";
 * const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5175";
 * const apiTarget = process.env.API_URL || "http://localhost:3000";   // ← el proxy del BFF
 * ```
 *
 * Es **RULE-17** y es la mitad que la regla llama el problema: *the fallback was the problem, not the
 * variable*. Y `public-origins.ts` del API ya lo tenía escrito desde PT-089 con estas palabras:
 *
 * > *Un valor de reserva con puerto es peor que no tener valor: no falla al arrancar, falla en silencio y en
 * > producción.*
 *
 * PT-089 quitó esos `localhost:<puerto>` **del API**. No llegó a los dos sitios SSR, y el más caro es el
 * tercero: `apiTarget` es el destino del **proxy del BFF**, así que un despliegue sin `API_URL` manda *todas*
 * las llamadas del sitio público a su propio contenedor, donde no escucha nadie. El sitio no arranca roto —
 * arranca, y no funciona.
 *
 * **Por qué no está en `@ironloot/core`:** BASE, CLIENT y ADMIN no dependen de él (no está en sus
 * `package.json`), y añadir la dependencia para veinte líneas metería la librería de dominio en tres
 * despliegues que hoy no la necesitan. El coste de duplicarlas es explícito y está aquí escrito.
 */

/**
 * Devuelve el valor de la variable, o **aborta nombrándola**.
 *
 * Se lanza en vez de devolver `undefined` porque un `undefined` viaja: acabaría concatenado en una URL como
 * `"undefined/api/v1/..."`, que es un fallo tres capas más abajo del sitio donde se puede entender.
 */
/**
 * PT-192 (AUD-026) — **El motivo es un parámetro, porque no todas son variables de conexión.**
 *
 * El mensaje decía siempre *«Es una variable de conexión: sin ella el sitio no sabe a dónde llamar»*, y
 * al usar esta función para `JWT_SECRET` empezó a mentir: quien leyera ese error se iría a mirar URLs
 * cuando el problema es el secreto con el que se verifica una sesión. Un mensaje que manda al sitio
 * equivocado cuesta más que no tenerlo — es la misma familia que este PT corrige en `CR-002`.
 *
 * El valor por defecto conserva la redacción original: la mayoría **sí** son de conexión, y cambiarla
 * habría convertido una corrección en un cambio de comportamiento de los cuatro llamantes.
 */
const MOTIVO_CONEXION =
  "Es una variable de conexión: sin ella el sitio no sabe a dónde llamar, y no se asume ningún " +
  "valor por defecto (RULE-17).";

export function variableObligatoria(
  nombre: string,
  motivo = MOTIVO_CONEXION,
): string {
  const valor = process.env[nombre]?.trim();

  if (!valor) {
    throw new Error(
      `[BASE] Falta la variable de entorno ${nombre}. ${motivo} ` +
        `docker-compose la declara; si estás fuera de compose, ponla en el entorno.`,
    );
  }

  // El recorte de barras finales es para las URL y es inocuo en lo demás: un secreto no acaba en `/`.
  return valor.replace(/\/+$/, "");
}
