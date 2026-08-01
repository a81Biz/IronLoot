/**
 * PT-216 (R-027 · H-UI-005) — **El contrato del retiro, y las cuatro puertas que lo gobiernan.**
 *
 * ## Lo que estaba roto
 *
 * El formulario enviaba `{ amount, account }` a `POST /api/v1/wallet/withdraw`. Ese endpoint es
 * **compatibilidad deprecada** —su propio `@ApiOperation` dice *«Deprecated — use POST
 * /wallet/withdrawals»*— y espera `WithdrawDto`, que exige `referenceId`. Con el `ValidationPipe` global
 * corriendo con `whitelist: true, forbidNonWhitelisted: true`:
 *
 *   - `account` es propiedad **no permitida** → 400;
 *   - `referenceId` **falta** → 400.
 *
 * La petición era un **400 garantizado**. Y aunque pasara, el controlador mapea
 * `paymentMethodId: dto.referenceId` → `undefined`, que la puerta 2 rechaza.
 *
 * **El retiro no podía tener éxito nunca.** Y su única respuesta era la cadena «Error al procesar.»,
 * que descartaba el diagnóstico del servidor.
 *
 * ## Las cuatro puertas, que ahora la interfaz nombra ANTES de intentarlo
 *
 * `withdrawals.service.request` (RN-65) comprueba, en orden:
 *
 *   1. **KYC aprobado** — `RN-62`;
 *   2. **método de pago del usuario** — `RN-63`;
 *   3. **cuenta verificada** — el código que viajó con el micro-depósito (PT-092);
 *   4. **saldo disponible** y **límite diario** (`WITHDRAWAL_DAILY_LIMIT`, 5.000 MXN).
 *
 * Cada una tiene su mensaje accionable en el servidor. Que el usuario los descubriera **de uno en uno y
 * por rechazo** era el segundo defecto: tres de las cuatro puertas ni siquiera tenían pantalla por la que
 * pasar.
 */

export const RETIROS_PATH = "/api/v1/wallet/withdrawals";
export const METODOS_PATH = "/api/v1/wallet/payment-methods";
export const KYC_PATH = "/api/v1/kyc/me";

/** El cuerpo que espera `POST /wallet/withdrawals`. */
export interface CuerpoDeRetiro {
  amount: number;
  paymentMethodId: string;
}

/**
 * Construye el cuerpo del retiro.
 *
 * Existe como función y no como literal dentro del `fetch` **para poder probarlo**: el defecto de
 * H-UI-005 era exactamente un cuerpo con las claves equivocadas, y un cuerpo equivocado no falla al
 * escribirlo — falla en producción, con un 400 que la interfaz convertía en «Error al procesar».
 */
export function cuerpoDeRetiro(
  monto: unknown,
  metodoId: unknown,
): CuerpoDeRetiro {
  return {
    amount: Number(monto),
    paymentMethodId: String(metodoId ?? ""),
  };
}

export interface EstadoDeCobro {
  kycAprobado: boolean;
  kycEstado: string | null;
  /** Métodos de cobro registrados, con su verificación. */
  metodos: Array<{
    id: string;
    alias?: string;
    isVerified?: boolean;
    type?: string;
  }>;
  hayMetodoVerificado: boolean;
  /** `true` si las tres primeras puertas están franqueadas y sólo queda saldo y límite. */
  puedeSolicitar: boolean;
}

/**
 * Resuelve, en el servidor, si el vendedor puede solicitar un retiro **y por qué no**.
 *
 * Se calcula aquí y no en el navegador porque el SSR ya tiene los dos datos, y porque una interfaz que
 * deduzca del cliente qué puertas están abiertas acaba enseñando el formulario a quien no puede usarlo —
 * que es el defecto H-UI-015 en otra pantalla.
 *
 * **No sustituye a la autorización**: las cuatro puertas las decide `withdrawals.service`. Esto sólo
 * decide qué se pinta, y qué se le dice al usuario que le falta.
 */
export function estadoDeCobro(
  kyc: { status?: string | null; approved?: boolean } | null,
  metodosRaw: unknown,
): EstadoDeCobro {
  const metodos = Array.isArray(metodosRaw)
    ? (metodosRaw as EstadoDeCobro["metodos"])
    : [];
  const hayMetodoVerificado = metodos.some((m) => m?.isVerified === true);
  const kycAprobado = kyc?.approved === true;

  return {
    kycAprobado,
    kycEstado: kyc?.status ?? null,
    metodos,
    hayMetodoVerificado,
    puedeSolicitar: kycAprobado && hayMetodoVerificado,
  };
}
