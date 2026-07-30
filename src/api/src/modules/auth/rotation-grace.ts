/**
 * PT-196 — **La ventana de gracia de la rotación, sin reserva.**
 *
 * ## Qué cubre
 *
 * Que dos peticiones del **mismo navegador** lleguen con el token anterior porque la primera aún
 * estaba refrescando. Eso es una **carrera**, no un robo, y sin ventana el sistema la leería como robo
 * y expulsaría a un usuario legítimo en una carga de página normal.
 *
 * La deduplicación de PT-194 es **por proceso**: con varias instancias del CLIENT no cubre este caso.
 * Por eso la gracia no es una comodidad, es la pieza que hace la rotación desplegable.
 *
 * ## De dónde salen los 30 s
 *
 * **Se derivan, no se eligen.** El peor caso es un refresco que agota su tope declarado
 * —`TOPE_REFRESCO_MS = 8_000` en el CLIENT (PT-194)— y una segunda petición que llega justo antes de
 * que termine, con otros 8 s por delante. 30 s son ~3,75× esa cota: holgado sobre el peor caso
 * realista y **despreciable** frente a los 7 días que vive el token.
 *
 * ## Por qué no tiene valor por defecto
 *
 * RULE-17. Un valor silencioso aquí tiene dos formas de salir mal y ninguna avisa: con `0` se expulsa
 * a usuarios legítimos por carreras, y con una cifra generosa se abre una ventana que **nadie
 * decidió** en la que el token anterior sigue sirviendo. Las dos se ven como «funciona», y una de
 * ellas es un agujero.
 */
function leer(): number {
  const bruto = process.env.ROTATION_GRACE_SEC?.trim();

  if (!bruto) {
    throw new Error(
      'Falta ROTATION_GRACE_SEC. Es la ventana en la que un refresh token ya rotado se acepta como ' +
        'carrera en vez de tratarse como reuso, y no se asume ningun valor por defecto (RULE-17): ' +
        'con 0 se expulsa a usuarios legitimos por concurrencia, y con una cifra generosa se abre ' +
        'una ventana que nadie decidio. docker-compose la declara.',
    );
  }

  const n = Number(bruto);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`ROTATION_GRACE_SEC tiene un valor no valido: "${bruto}". Debe ser segundos.`);
  }

  return n;
}

/**
 * **Se evalua al cargar el modulo, no en cada llamada.**
 *
 * La primera version comprobaba dentro de la funcion, y eso significa que el API **arranca sano** y
 * falla en el primer refresco: el modo de fallo exacto de AUD-026, donde el CLIENT arrancaba `healthy`
 * y rebotaba al login a todo el mundo sin un error en ningun log. Lo cazó el caso de control de su
 * propia prueba.
 *
 * Cargar el modulo es arrancar: `auth.service.ts` lo importa, asi que sin la variable el proceso no
 * llega a servir una peticion.
 */
export const GRACIA_ROTACION_SEG = leer();

/** Se conserva como funcion porque las pruebas necesitan releerla tras cambiar el entorno. */
export function graciaDeRotacionSeg(): number {
  return leer();
}
