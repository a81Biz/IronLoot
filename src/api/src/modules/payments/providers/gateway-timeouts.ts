/**
 * PT-184 (H-034) — Topes de espera de las llamadas a las pasarelas de pago.
 *
 * Las seis llamadas de los tres adaptadores usaban `fetch` sin `signal`, y no había un `AbortController` en todo
 * el directorio. Es el patrón de **H-033** —hablar con un tercero sin declarar cuánto se le espera— en el sitio
 * donde más importa: el camino del dinero.
 *
 * **La asimetría es del dominio, no del transporte.** Consultar el estado de un pago puede cortarse pronto: la
 * vía garantizada es un proceso periódico y volverá a preguntar. **Crear o capturar** una orden, no — abandonar
 * una operación que quizá se completó al otro lado es peor que esperar algo más, porque deja al sistema sin
 * saber qué pasó con un cobro. Es el mismo razonamiento que hizo `socketTimeout` mayor que `connectionTimeout`
 * en H-033.
 *
 * Lo que **no** cambia: un tope agotado no es un rechazo de la pasarela. PT-179 (F-176-C) estableció que un 4xx
 * del tercero no es una avería nuestra; un tope tampoco es un «no» de la pasarela, es un «no lo sabemos».
 */
export const GATEWAY_TIMEOUTS_MS = {
  /** Consultar estado, buscar un pago, pedir un token. La vía garantizada reintentará. */
  consulta: 8_000,
  /** Crear una orden, capturarla, dispersar. Cortar aquí deja una operación en el aire. */
  operacion: 20_000,
} as const;

/**
 * Ejecuta `operacion` con una señal que se aborta al pasar `ms`.
 *
 * Existe como helper y no como tres `AbortController` escritos a mano porque **cada uno sería una oportunidad
 * de olvidar el `clearTimeout`**, y un temporizador sin limpiar mantiene el bucle de eventos despierto: el
 * proceso no termina, y en una suite eso aparece como «Jest did not exit» — un fallo que se atribuye a
 * cualquier otra cosa. Aquí la limpieza va en un `finally`, una vez.
 */
export async function conSenalDeAborto<T>(
  ms: number,
  operacion: (senal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controlador = new AbortController();
  const reloj = setTimeout(() => controlador.abort(), ms);

  try {
    return await operacion(controlador.signal);
  } finally {
    clearTimeout(reloj);
  }
}
