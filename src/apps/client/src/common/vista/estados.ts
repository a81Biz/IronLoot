/**
 * PT-212 (R-032 · H-UI-037, H-UI-038, H-UI-045, H-UI-052) — **El vocabulario del usuario, en un solo
 * sitio.**
 *
 * El portal imprimía el valor crudo del enum en nueve tablas: `PAID`, `SHIPPED`, `DELIVERED`,
 * `REFUNDED`, `DRAFT`, `CLOSED`, `OPEN`, `IN_MEDIATION`, `DEBIT_ORDER`, `CREDIT_SALE`…
 *
 * Y no es que faltara la traducción: **existe un contrato terminológico escrito**.
 * `docs-v2/7-ux/FAQ-y-Mensajes.md §3 «Estados que verás»` fija las etiquetas en español para las cinco
 * entidades, y el `Diccionario Maestro` fija los términos del dominio. El producto enseñaba el
 * identificador interno a la persona a la que pertenece ese dinero: `DEBIT_ORDER` no significa nada.
 *
 * El sitio público **sí** traduce («Activa», «Próxima», «Cerrada»). La traducción existía y no se
 * aplicaba donde importa.
 *
 * ## Dos cosas más que resuelve el mismo módulo
 *
 * **El color deja de ser decorativo.** El sistema define `badge-success/warning/danger/info/muted` y las
 * plantillas usaban `badge-info` (azul) para **todos** los estados de orden y subasta y `badge-warning`
 * para **todos** los de disputa. En una tabla de veinte órdenes, un reembolso y una compra normal eran
 * visualmente idénticos: había que leer cada celda. Aquí cada estado declara su variante.
 *
 * **Y hay un estado que no es sólo una etiqueta.** `REFUNDED` y `CANCELLED` son terminales y de
 * excepción; `DELIVERED` es terminal y buena. Distinguirlos es lo que permite recorrer una tabla con la
 * vista, que es como se recorren las tablas de dinero.
 *
 * ## Por qué un módulo y no un `{% if %}` por plantilla
 *
 * Es el mismo dato en nueve pantallas. Duplicarlo garantiza la divergencia — la lección de PT-140
 * aplicada al vocabulario. Y una tabla con la etiqueta correcta y otra con el enum es peor que las dos
 * con el enum: enseña que el estado significa dos cosas.
 */

/** La variante de badge que le corresponde a un estado. */
export type Variante = "success" | "warning" | "danger" | "info" | "muted";

interface Estado {
  etiqueta: string;
  variante: Variante;
}

/**
 * `valor del enum -> { etiqueta, variante }`.
 *
 * Las etiquetas salen de `FAQ-y-Mensajes §3`, no de una traducción improvisada: ese documento es el que
 * el usuario lee cuando algo no entiende, y una interfaz que use otras palabras lo deja sin ayuda.
 */
const ESTADOS: Record<string, Estado> = {
  // ── Cuenta ────────────────────────────────────────────────────────────────
  PENDING_VERIFICATION: {
    etiqueta: "Pendiente de verificación",
    variante: "warning",
  },
  ACTIVE_USER: { etiqueta: "Activa", variante: "success" },
  SUSPENDED: { etiqueta: "Suspendida", variante: "danger" },
  BANNED: { etiqueta: "Baneada", variante: "danger" },

  // ── Subasta ───────────────────────────────────────────────────────────────
  DRAFT: { etiqueta: "Borrador", variante: "muted" },
  PENDING_MODERATION: { etiqueta: "En moderación", variante: "warning" },
  PUBLISHED: { etiqueta: "Publicada", variante: "info" },
  ACTIVE: { etiqueta: "Activa", variante: "success" },
  CLOSED: { etiqueta: "Cerrada", variante: "muted" },
  CANCELLED: { etiqueta: "Cancelada", variante: "danger" },

  // ── Orden ─────────────────────────────────────────────────────────────────
  PENDING_PAYMENT: { etiqueta: "Pendiente de pago", variante: "warning" },
  PAID: { etiqueta: "Pagada", variante: "info" },
  SHIPPED: { etiqueta: "Enviada", variante: "info" },
  DELIVERED: { etiqueta: "Entregada", variante: "success" },
  REFUNDED: { etiqueta: "Reembolsada", variante: "danger" },
  COMPLETED: { etiqueta: "Completada", variante: "success" },

  // ── Envío ─────────────────────────────────────────────────────────────────
  PENDING: { etiqueta: "Pendiente", variante: "warning" },
  RETURNED: { etiqueta: "Devuelto", variante: "danger" },

  // ── Disputa ───────────────────────────────────────────────────────────────
  OPEN: { etiqueta: "Abierta", variante: "warning" },
  IN_MEDIATION: { etiqueta: "En mediación", variante: "warning" },
  RESOLVED: { etiqueta: "Resuelta", variante: "success" },

  // ── Retiro (RN-66) ────────────────────────────────────────────────────────
  REQUESTED: { etiqueta: "Solicitado", variante: "warning" },
  APPROVED: { etiqueta: "Aprobado", variante: "info" },
  REJECTED: { etiqueta: "Rechazado", variante: "danger" },

  // ── KYC (RN-62) ───────────────────────────────────────────────────────────
  NOT_SUBMITTED: { etiqueta: "Sin enviar", variante: "muted" },
  NEEDS_CORRECTION: { etiqueta: "Requiere corrección", variante: "warning" },

  // ── Asientos del ledger ───────────────────────────────────────────────────
  DEPOSIT: { etiqueta: "Depósito", variante: "success" },
  WITHDRAWAL: { etiqueta: "Retiro", variante: "info" },
  HOLD: { etiqueta: "Retención por puja", variante: "muted" },
  RELEASE: { etiqueta: "Liberación de puja", variante: "muted" },
  DEBIT_ORDER: { etiqueta: "Pago de compra", variante: "info" },
  CREDIT_SALE: { etiqueta: "Cobro de venta", variante: "success" },
  SETTLEMENT_RELEASE: { etiqueta: "Liquidación de venta", variante: "success" },
  REFUND: { etiqueta: "Reembolso", variante: "danger" },
  ADJUSTMENT: { etiqueta: "Ajuste", variante: "muted" },
  COMMISSION: { etiqueta: "Comisión de plataforma", variante: "muted" },
};

/**
 * La etiqueta en español de un estado.
 *
 * **Ante un valor desconocido devuelve el valor**, no una cadena vacía ni «Desconocido»: si el API añade
 * un estado que este mapa no tiene, es preferible que el usuario vea `FOO_BAR` —feo, pero cierto y
 * rastreable— a que vea un hueco. Un hueco es el silencio que esta tanda entera persigue.
 */
export function etiquetaDeEstado(valor: unknown): string {
  if (typeof valor !== "string" || !valor) return "—";
  return ESTADOS[valor]?.etiqueta ?? valor;
}

/** La clase de badge de un estado. Un valor desconocido cae en `muted`, que no afirma nada. */
export function badgeDeEstado(valor: unknown): string {
  if (typeof valor !== "string" || !valor) return "badge-muted";
  return `badge-${ESTADOS[valor]?.variante ?? "muted"}`;
}

/**
 * PT-212 (H-UI-045) — Una fecha legible, en la zona horaria del servidor.
 *
 * Las tablas imprimían el valor tal cual llega: `2026-07-31T18:22:05.123Z`. En un producto donde los
 * plazos **son reglas de negocio** —72 h de holdback, 14 días de disputa, el cierre de la subasta—, la
 * fecha es información operativa, no decoración.
 *
 * Se formatea en el servidor y no en el navegador porque el SSR ya tiene el dato y hacerlo en el cliente
 * exigiría un `<script>` más en cada página. La contrapartida —que es la hora del servidor y no la del
 * usuario— se declara aquí en vez de descubrirse: para México, que es el único mercado (`BC-01`), el
 * servidor y el usuario comparten zona.
 */
export function fechaLegible(valor: unknown): string {
  if (!valor) return "—";
  const d = new Date(valor as string);
  if (Number.isNaN(d.getTime())) return String(valor);

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Los valores del enum que este módulo conoce. Lo usa la prueba de cobertura. */
export const ESTADOS_CONOCIDOS = Object.keys(ESTADOS);
