import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger } from '../../common/observability';
import { WalletService } from './wallet.service';
import { PaymentTraceService } from '../payments/payment-trace.service';

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
