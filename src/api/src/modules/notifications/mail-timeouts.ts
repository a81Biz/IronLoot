/**
 * PT-183 (H-033) — Topes de espera del transporte de correo.
 *
 * Sin declararlos, nodemailer aplica los suyos: **dos minutos para conectar**. Medido en vivo parando Mailhog
 * y pidiendo el reenvío de verificación:
 *
 * ```
 * reenvio con SMTP caido      HTTP 500  {"message": "Connection timeout"}
 * real    2m1.490s
 * ```
 *
 * Dos minutos con la petición abierta, en el camino del reenvío **y en el del registro** — la primera pantalla
 * del producto. La espera era preexistente y estaba tapada por H-032: con el `catch` que se comía el error los
 * dos minutos también pasaban, pero al final se respondía `200 «Verification email sent»`, así que nadie
 * relacionaba la lentitud con el correo.
 *
 * **Los valores no se eligen a ojo: se toman de lo que este sistema ya espera de un tercero.** El guard de
 * reCAPTCHA corta a 5 000 ms; la comprobación de Redis, a 2 000 ms. El correo es el más lento de los tres por
 * naturaleza, así que se queda en el techo de esa banda y no por encima.
 *
 * `socketTimeout` es mayor que los otros dos a propósito: cubre el envío ya iniciado, donde un servidor lento
 * es normal, mientras que tardar en **aceptar la conexión** o en **saludar** ya indica que no está.
 */
export const MAIL_TIMEOUTS_MS = {
  /** Aceptar la conexión TCP. Si tarda más, el servidor no está. */
  connectionTimeout: 5_000,
  /** Recibir el saludo SMTP tras conectar. */
  greetingTimeout: 5_000,
  /** Inactividad durante la sesión, con el envío ya en marcha. */
  socketTimeout: 10_000,
} as const;
