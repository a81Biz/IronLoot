import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger } from '../../common/observability';
import { WalletService } from './wallet.service';
import { PaymentTraceService } from '../payments/payment-trace.service';
import { PaypalProvider } from '../payments/providers/paypal.provider';

/**
 * PT-092 — Verificar que una cuenta de cobro pertenece de verdad al vendedor.
 *
 * Cierra TD-003. Hasta ahora `isVerified` nacía `false`, **nadie lo ponía nunca a `true` y nadie
 * lo comprobaba**: se podía retirar dinero a una CLABE que nadie había confirmado. El dígito
 * verificador de la CLABE se valida, lo que atrapa erratas de tecleo pero **no la titularidad**:
 * una CLABE ajena bien escrita pasaba igual.
 *
 * ## El mecanismo
 *
 * Uno solo para los tres destinos: **el token viaja con el movimiento de dinero, y solo lo ve
 * quien tiene acceso a la cuenta**. Cambia por dónde viaja:
 *
 * | Destino | Movimiento | Dónde aparece el token |
 * |---|---|---|
 * | CLABE | Depósito de 20 MXN | Concepto del SPEI |
 * | Tarjeta | Cargo de 20 MXN, devuelto | Descriptor del estado de cuenta |
 * | PayPal | Cargo de 20 MXN, devuelto | Nota del cobro |
 *
 * ## Dos decisiones que sostienen todo lo demás
 *
 * **Los fondos salen del saldo del vendedor, no de la plataforma.** Si la plataforma pagara cada
 * verificación, dar de alta cuentas en masa sería un vector para drenarla. Saliendo del saldo del
 * propio vendedor el ataque desaparece, y la verificación ocurre de forma natural cuando ya hay
 * dinero que retirar — es decir, después de su primera venta.
 *
 * **Para la CLABE no hay reintegro**: el dinero ya es suyo y acabó en su banco. La verificación
 * *es* un retiro pequeño. Coste neto para todos: cero.
 */
@Injectable()
export class AccountVerificationService {
  /** Importe del movimiento de verificación. Suficiente para ser visible, trivial para perderse. */
  private static readonly IMPORTE_MXN = 20;

  /** Intentos antes de bloquear. La defensa que no depende de suponer el token impredecible. */
  private static readonly MAX_INTENTOS = 5;

  /** Una cuenta puede cerrarse; una verificación abierta indefinidamente deja de significar nada. */
  private static readonly VIGENCIA_DIAS = 7;

  /**
   * Alfabeto sin caracteres que se confunden al transcribir: sin `0`/`O`, sin `1`/`I`/`L`.
   * Quien copia el token lo hace mirando el estado de cuenta de su banco.
   */
  private static readonly ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly trace: PaymentTraceService,
    private readonly logger: StructuredLogger,
    /**
     * PT-092 — Opcional a proposito: PayPal se verifica cobrando de forma automatica, pero una
     * CLABE no lo necesita —su movimiento lo envia el administrador— y los tests del camino de
     * CLABE no tienen por que construir el adaptador.
     */
    private readonly paypal?: PaypalProvider,
  ) {}

  /**
   * Abre una verificación: genera el token y deja el movimiento listo para salir.
   *
   * Es **idempotente**: si ya hay una verificación en curso devuelve la misma. Volver a llamar no
   * puede provocar un segundo movimiento de dinero.
   */
  async start(userId: string, paymentMethodId: string) {
    const metodo = await this.prisma.userPaymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    // Un método ajeno se responde como inexistente: distinguirlo confirmaría que existe.
    if (!metodo || metodo.userId !== userId) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    if (metodo.isVerified) {
      throw new BadRequestException('Esta cuenta ya está verificada');
    }

    const enCurso = await this.prisma.accountVerification.findFirst({
      where: { paymentMethodId, status: { in: ['PENDING', 'SENT'] } },
    });
    if (enCurso) return enCurso;

    // El importe sale del vendedor. Sin saldo no hay verificación — y por eso ocurre de forma
    // natural tras la primera venta, que es cuando tiene sentido preguntarse a dónde cobra.
    const saldo = await this.wallet.getBalance(userId);
    if (Number(saldo.available) < AccountVerificationService.IMPORTE_MXN) {
      throw new BadRequestException(
        `Se requiere un saldo de al menos ${AccountVerificationService.IMPORTE_MXN} MXN para verificar la cuenta. ` +
          'El importe se envía a tu cuenta con un código que tendrás que confirmar.',
      );
    }

    const token = this.generarToken();
    const verificacion = await this.prisma.accountVerification.create({
      data: {
        paymentMethodId,
        userId,
        token,
        amount: AccountVerificationService.IMPORTE_MXN,
        currency: 'MXN',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + AccountVerificationService.VIGENCIA_DIAS * 24 * 3600_000),
      },
    });

    // El token NO se registra: es el secreto que prueba la titularidad, y en la traza sería
    // regalárselo a quien la lea.
    await this.trace.record({
      reference: `VER-${paymentMethodId}`,
      provider: 'MERCADO_PAGO',
      step: 'DEPOSIT_REQUESTED',
      direction: 'INTERNAL',
      outcome: 'OK',
      detail: `Verificacion de cuenta ${metodo.type} abierta`,
      data: {
        userId,
        paymentMethodId,
        tipo: metodo.type,
        amount: AccountVerificationService.IMPORTE_MXN,
      },
    });

    // PayPal se verifica solo: se cobra con el codigo visible y el titular lo aprueba. Una
    // CLABE no puede cobrarse, asi que espera a que el administrador envie el micro-deposito.
    if (metodo.type === 'PAYPAL' && this.paypal) {
      try {
        const cobro = await this.paypal.createVerificationCharge(
          `VER-${paymentMethodId}`,
          AccountVerificationService.IMPORTE_MXN,
          token,
        );
        const conCobro = await this.prisma.accountVerification.update({
          where: { id: verificacion.id },
          data: { status: 'SENT', movementRef: cobro.orderId, sentAt: new Date() },
        });
        this.logger.info(`Cobro de verificacion creado para el metodo ${paymentMethodId}`);
        return { ...conCobro, approvalUrl: cobro.approvalUrl };
      } catch (error) {
        // El cobro fallo: la verificacion queda FAILED con su motivo, no a medias.
        await this.prisma.accountVerification.update({
          where: { id: verificacion.id },
          data: { status: 'FAILED' },
        });
        this.logger.error(`No se pudo crear el cobro de verificacion: ${(error as Error).message}`);
        throw new BadRequestException(
          'No se pudo iniciar la verificacion con PayPal. Revisa el correo e intentalo de nuevo.',
        );
      }
    }

    this.logger.info(`Verificación de cuenta abierta para el método ${paymentMethodId}`);
    return verificacion;
  }

  /**
   * El vendedor declara el token que vio en su cuenta.
   *
   * Solo quien tiene acceso a esa cuenta puede haberlo leído: eso es lo que prueba la titularidad.
   */
  async confirm(userId: string, paymentMethodId: string, tokenDeclarado: string) {
    const metodo = await this.prisma.userPaymentMethod.findUnique({
      where: { id: paymentMethodId },
    });
    if (!metodo || metodo.userId !== userId) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    const verificacion = await this.prisma.accountVerification.findFirst({
      where: { paymentMethodId },
      orderBy: { createdAt: 'desc' },
    });
    if (!verificacion) {
      throw new NotFoundException('No hay una verificación en curso para esta cuenta');
    }

    // PT-092 — Solo se confirma lo que ya salio. Detectado al verificar contra la API real:
    // se aceptaba el token con la verificacion en PENDING. No era explotable —el vendedor no
    // puede conocer el token— pero habria afirmado «cuenta verificada» sin que nada hubiera
    // llegado a esa cuenta, que es exactamente lo que la verificacion existe para probar.
    if (verificacion.status === 'PENDING') {
      return {
        verified: false,
        reason: 'El movimiento de verificacion aun no ha salido. Espera a recibirlo.',
      };
    }

    if (verificacion.status === 'BLOCKED') {
      throw new BadRequestException(
        'Esta verificación está bloqueada por demasiados intentos. Contacta con soporte.',
      );
    }

    if (new Date(verificacion.expiresAt).getTime() < Date.now()) {
      await this.prisma.accountVerification.update({
        where: { id: verificacion.id },
        data: { status: 'EXPIRED' },
      });
      return { verified: false, reason: 'La verificación venció. Solicita una nueva.' };
    }

    // Se normaliza porque quien copia el token de su banco lo escribirá como pueda.
    if (this.normalizar(tokenDeclarado) !== this.normalizar(verificacion.token)) {
      const intentos = verificacion.attempts + 1;
      const agotados = intentos >= AccountVerificationService.MAX_INTENTOS;

      await this.prisma.accountVerification.update({
        where: { id: verificacion.id },
        data: { attempts: intentos, ...(agotados ? { status: 'BLOCKED' } : {}) },
      });

      this.logger.warn(`Token incorrecto para el método ${paymentMethodId} (intento ${intentos})`);

      return {
        verified: false,
        attemptsLeft: Math.max(0, AccountVerificationService.MAX_INTENTOS - intentos),
        reason: agotados
          ? 'Se agotaron los intentos. La verificación quedó bloqueada.'
          : 'El código no coincide.',
      };
    }

    await this.prisma.accountVerification.update({
      where: { id: verificacion.id },
      data: { status: 'VERIFIED', verifiedAt: new Date() },
    });
    await this.prisma.userPaymentMethod.update({
      where: { id: paymentMethodId },
      data: { isVerified: true },
    });

    await this.trace.record({
      reference: `VER-${paymentMethodId}`,
      provider: 'MERCADO_PAGO',
      step: 'CYCLE_DECISION',
      direction: 'INTERNAL',
      outcome: 'OK',
      detail: 'Cuenta verificada: el titular declaro el codigo correcto',
      data: { userId, paymentMethodId, tipo: metodo.type },
    });

    this.logger.info(`Cuenta ${paymentMethodId} verificada`);
    return { verified: true };
  }

  // ── Cola del administrador ─────────────────────────────────────────────
  //
  // La dispersion es manual (`ManualPayoutProvider`), asi que el micro-deposito a una CLABE lo
  // envia una persona. Estos dos metodos son su interfaz: ver que hay pendiente y anotar que
  // salio.

  /**
   * PT-092 — Verificaciones pendientes de que el administrador mueva el dinero.
   *
   * **Incluye el token**: el administrador tiene que escribirlo como concepto del SPEI, o el
   * vendedor no tendra nada que declarar. Es el unico sitio donde el token se expone, y por eso
   * el endpoint que lo sirve es de administracion.
   */
  async pendingQueue() {
    return this.prisma.accountVerification.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        paymentMethod: {
          select: {
            id: true,
            type: true,
            clabe: true,
            holderName: true,
            bankName: true,
            paypalEmail: true,
          },
        },
      },
    });
  }

  /**
   * PT-092 — El administrador anota que el movimiento salio.
   *
   * A partir de aqui empieza a correr el plazo real: el vendedor ya puede ver el codigo en su
   * cuenta. `sentAt` se fija ahora, no cuando se abrio la verificacion, porque entre una cosa y
   * otra pueden pasar dias si la cola se acumula.
   */
  async markSent(verificationId: string, movementRef: string, adminUser: string) {
    const verificacion = await this.prisma.accountVerification.findFirst({
      where: { id: verificationId },
    });
    if (!verificacion) throw new NotFoundException('Verificacion no encontrada');
    if (verificacion.status !== 'PENDING') {
      throw new BadRequestException(
        `No se puede marcar como enviada una verificacion en estado ${verificacion.status}`,
      );
    }

    const actualizada = await this.prisma.accountVerification.update({
      where: { id: verificationId },
      data: {
        status: 'SENT',
        movementRef,
        sentAt: new Date(),
        // El plazo cuenta desde que el dinero sale, no desde que se abrio la verificacion:
        // entre una cosa y otra pueden pasar dias si la cola se acumula.
        expiresAt: new Date(Date.now() + AccountVerificationService.VIGENCIA_DIAS * 24 * 3600_000),
      },
    });

    await this.trace.record({
      reference: `VER-${verificacion.paymentMethodId}`,
      provider: 'MERCADO_PAGO',
      step: 'PROVIDER_CONFIRM',
      direction: 'OUTBOUND',
      outcome: 'OK',
      externalId: movementRef,
      detail: 'Movimiento de verificacion enviado por el administrador',
      data: { adminUser, verificationId, movementRef },
    });

    this.logger.info(`Verificacion ${verificationId} marcada como enviada por ${adminUser}`);
    return actualizada;
  }

  /** Token corto, impredecible y transcribible a mano desde un estado de cuenta. */
  private generarToken(): string {
    const a = AccountVerificationService.ALFABETO;
    return Array.from({ length: 6 }, () => a[randomInt(0, a.length)]).join('');
  }

  private normalizar(v: string): string {
    return String(v ?? '')
      .replace(/\s+/g, '')
      .toUpperCase();
  }
}
