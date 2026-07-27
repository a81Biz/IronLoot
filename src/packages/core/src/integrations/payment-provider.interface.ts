/**
 * Puerto de pasarela de pago (PT-080).
 *
 * Libre de framework por RULE-02: solo tipos e interfaces, sin NestJS, Prisma, Express ni Redis.
 * La I/O vive en los adaptadores de la API.
 *
 * Este puerto existía desde el principio y **no lo usaba nadie**: la API mantenía un contrato
 * duplicado en su propio módulo. PT-080 lo revive y lo evoluciona con lo que la realidad exige.
 *
 * Lo que se aprendió al implementar la Fase A y que la versión anterior no contemplaba:
 *
 *  - `validateWebhook` **no puede ser síncrono**: PayPal verifica con una llamada HTTP a
 *    `verify-webhook-signature`, y Mercado Pago consulta su API para confirmar el recurso.
 *  - La validación **difiere por formato dentro del mismo proveedor**: Mercado Pago emite
 *    Webhooks (firma validable) e IPN (firma no validable, según su propia documentación).
 *    Por eso la estrategia es asunto del adaptador, no del núcleo.
 *  - El núcleo necesita el **importe normalizado**, no los nombres de campo de cada pasarela.
 *  - El registro necesita **identidad y alias** declarados por el propio adaptador, para que
 *    añadir o quitar una pasarela no obligue a tocar la lógica de transacción.
 */

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

/** Resultado de iniciar un pago: a dónde se envía al comprador. */
export interface PaymentLink {
  /** Enlace de aprobación de la pasarela. */
  redirectUrl: string;
  /** Identificador del recurso creado en la pasarela (preferencia, orden…). */
  externalId?: string;
  metadata?: Record<string, unknown>;
  /** Si el proveedor está realmente integrado y configurado. */
  isIntegrated?: boolean;
}

/**
 * Respuesta de una pasarela, ya normalizada por su adaptador.
 * El núcleo nunca interpreta campos propios de una pasarela.
 */
export interface NormalizedPaymentResult {
  /**
   * Identificador **canónico** del pago en la pasarela. Es la clave de deduplicación: cada
   * adaptador debe resolver siempre al mismo valor para un mismo cobro, llegue por la ruta que
   * llegue. En Mercado Pago, por ejemplo, un pago se puede notificar como orden, como pago de
   * orden o como pago numérico, y solo el último resuelve por sí mismo.
   */
  paymentId: string;
  /** Nuestra referencia: `DEP-<userId>-<timestamp>`. */
  externalId: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  /** Importe normalizado por el adaptador, en la moneda de la operación. */
  amount?: number;
  metadata?: Record<string, unknown>;
}

/** Identidad de un proveedor dentro del registro. */
export interface PaymentProviderIdentity {
  /** Clave canónica, coincidente con el enum de persistencia. Ej.: `MERCADO_PAGO`. */
  readonly key: string;
  /**
   * Nombres alternativos con los que puede llegar en la URL del webhook.
   * Ej.: `mercadopago` — la URL registrada en la pasarela no siempre usa la clave canónica.
   */
  readonly aliases: readonly string[];
}

export interface IPaymentProvider extends PaymentProviderIdentity {
  /** Si el proveedor tiene toda su configuración presente. */
  checkStatus(): boolean;

  initiatePayment(
    reference: string,
    amount: number,
    currency: string,
    description: string,
    buyerEmail: string,
  ): Promise<PaymentLink>;

  /**
   * Verifica la autenticidad de la notificación. **Asíncrono a propósito**: unos proveedores
   * validan con HMAC local y otros con una llamada a la pasarela.
   */
  validateWebhook(
    payload: unknown,
    headers: Record<string, string>,
    query: Record<string, string>,
  ): Promise<boolean>;

  /** Procesa la notificación ya validada y devuelve el resultado normalizado. */
  handleWebhook(
    payload: unknown,
    headers?: Record<string, string>,
    query?: Record<string, string>,
  ): Promise<NormalizedPaymentResult | null>;

  /** Consulta el estado de un pago sin depender de una notificación. */
  getTransactionStatus(externalId: string): Promise<NormalizedPaymentResult>;

  /**
   * Vía garantizada: busca el pago de una solicitud por nuestra referencia.
   * Devuelve null si la pasarela aún no tiene un pago resuelto para ella.
   */
  findPaymentByReference?(
    reference: string,
  ): Promise<NormalizedPaymentResult | null>;
}
