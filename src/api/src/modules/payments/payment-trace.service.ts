import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger, RequestContextService } from '../../common/observability';

/**
 * Pasos del proceso de pago. Vocabulario **cerrado**: la traza debe poder consultarse y
 * agregarse, no ser prosa libre.
 */
export type PaymentTraceStep =
  | 'DEPOSIT_REQUESTED' // el usuario pide el depósito
  | 'PROVIDER_CREATE' // creamos la orden/preferencia en la pasarela
  | 'NOTIFICATION_RECEIVED' // nos llega una notificación
  | 'SIGNATURE_OK'
  | 'SIGNATURE_REJECTED'
  | 'PROVIDER_CONFIRM' // confirmamos el recurso contra la API de la pasarela
  | 'CYCLE_DECISION' // qué decidió el ciclo
  | 'WALLET_CREDITED'
  | 'PAYMENT_RECORDED'
  | 'POLL_ATTEMPT' // vía garantizada
  | 'CYCLE_EXPIRED'
  | 'REFUND_RAISED';

export type TraceDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL';

export interface TraceEntry {
  reference: string;
  provider: PaymentProvider | string;
  step: PaymentTraceStep;
  direction: TraceDirection;
  /** Resultado: OK | ERROR | o el `outcome` del ciclo. */
  outcome: string;
  /** WEBHOOK | IPN | POLL | HTTP | INTERNAL */
  format?: string;
  externalId?: string;
  cycleId?: string | null;
  endpoint?: string;
  httpStatus?: number;
  durationMs?: number;
  detail?: string;
  /** Datos del paso: cuerpo enviado, respuesta, cabeceras, saldos… Se redacta antes de guardar. */
  data?: unknown;
}

/**
 * Claves cuyo valor **nunca** se persiste.
 *
 * La petición pedía «todos los datos». Se matiza en un único punto: las credenciales. Persistir
 * un `Authorization: Bearer <access_token>` o una firma convertiría esta tabla en un almacén de
 * secretos reutilizables — con acceso de solo lectura a la base de datos (una copia, un backup,
 * un informe) se podrían suplantar nuestras llamadas a la pasarela.
 *
 * Es coherente con lo que el proyecto ya tenía decidido: `AuditEvent.payload` está documentado
 * en el propio esquema como «whitelisted data only».
 */
const REDACTED_KEYS = [
  'authorization',
  'x-signature',
  'access_token',
  'refresh_token',
  'client_secret',
  'secret',
  'password',
  'token',
  'card_number',
  'security_code',
  'cvv',
];

const REDACTED_MARK = '[REDACTADO]';
const MAX_DEPTH = 8;

@Injectable()
export class PaymentTraceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly ctx: RequestContextService,
  ) {}

  /**
   * Escribe una entrada de traza. **Nunca lanza**: un apunte de trazabilidad no puede costarle
   * el depósito al usuario (mismo criterio que PT-085 aplicó al registro contable).
   */
  async record(entry: TraceEntry): Promise<void> {
    try {
      const redacted: string[] = [];
      const payload = this.redact(entry.data ?? {}, '', redacted, 0);

      await this.prisma.paymentCycleEvent.create({
        data: {
          cycleId: entry.cycleId ?? null,
          provider: entry.provider as PaymentProvider,
          externalId: entry.externalId ?? '',
          reference: entry.reference,
          format: entry.format ?? 'INTERNAL',
          outcome: entry.outcome,
          step: entry.step,
          direction: entry.direction,
          endpoint: entry.endpoint ?? null,
          httpStatus: entry.httpStatus ?? null,
          durationMs: entry.durationMs ?? null,
          detail: entry.detail ?? null,
          traceId: this.safeTraceId(),
          payload: payload as object,
          redactedFields: redacted.length ? (redacted as unknown as object) : undefined,
        },
      });
    } catch (e) {
      // Se registra el fallo de la traza, pero el pago sigue su curso.
      this.logger.error(`No se pudo escribir la traza de ${entry.reference} (${entry.step})`, {
        error: e as Error,
      });
    }
  }

  /**
   * Enlaza con su referencia las entradas grabadas **antes** de conocerla.
   *
   * La notificación y la validación de firma ocurren antes de resolver el pago canónico, de modo
   * que en ese momento aún no se sabe a qué depósito pertenecen. Se corrige el dato en cuanto se
   * sabe, en lugar de disimularlo en la consulta: la traza debe ser correcta en la tabla.
   */
  async attachReference(externalId: string, reference: string): Promise<void> {
    if (!externalId || !reference) return;
    try {
      await this.prisma.paymentCycleEvent.updateMany({
        where: { externalId, OR: [{ reference: null }, { reference: '' }] },
        data: { reference },
      });
    } catch (e) {
      this.logger.error(`No se pudo enlazar la traza de ${externalId}`, { error: e as Error });
    }
  }

  /** Traza completa de una referencia, en orden cronológico. */
  async byReference(reference: string) {
    return this.prisma.paymentCycleEvent.findMany({
      where: { reference },
      orderBy: { receivedAt: 'asc' },
    });
  }

  /** Traza de un pago concreto de la pasarela. */
  async byPaymentId(externalId: string) {
    return this.prisma.paymentCycleEvent.findMany({
      where: { externalId },
      orderBy: { receivedAt: 'asc' },
    });
  }

  /**
   * Sustituye el valor de toda clave sensible y **anota su ruta**: lo redactado se marca, no se
   * borra en silencio. Quien lea la traza debe saber que ese campo existía.
   */
  private redact(value: unknown, path: string, found: string[], depth: number): unknown {
    if (depth > MAX_DEPTH || value === null || value === undefined) return value;

    if (Array.isArray(value)) {
      return value.map((v, i) => this.redact(v, `${path}[${i}]`, found, depth + 1));
    }

    if (typeof value !== 'object') return value;

    // Prisma devuelve `Decimal`, y hay `Date` y otras instancias por medio. JSONB solo admite
    // objetos planos: sin esto, un Decimal en el payload hace fallar la escritura entera y la
    // entrada se pierde en silencio, que es justo lo que la traza no puede permitirse.
    const plano = this.toPlain(value);
    if (plano !== undefined) return plano;

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const here = path ? `${path}.${key}` : key;
      if (REDACTED_KEYS.some((k) => key.toLowerCase().includes(k))) {
        out[key] = REDACTED_MARK;
        found.push(here);
      } else {
        out[key] = this.redact(val, here, found, depth + 1);
      }
    }
    return out;
  }

  /**
   * Convierte a valor primitivo lo que no sea un objeto plano. Devuelve `undefined` cuando el
   * valor **sí** es plano y debe seguir recorriéndose.
   */
  private toPlain(value: object): unknown {
    if (value instanceof Date) return value.toISOString();

    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) return undefined;

    const conToJSON = value as { toJSON?: () => unknown };
    if (typeof conToJSON.toJSON === 'function') return conToJSON.toJSON();

    return String(value);
  }

  /** El contexto de petición no existe en los procesos de fondo (cron). */
  private safeTraceId(): string | null {
    try {
      return this.ctx.getTraceId() ?? null;
    } catch {
      return null;
    }
  }
}
