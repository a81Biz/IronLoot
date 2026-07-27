import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WalletService } from './wallet.service';
import { KycService } from '../kyc/kyc.service';
import { PaymentsService } from '../payments/payments.service';
import { ManualPayoutProvider } from './payout/payout-provider';

/**
 * PT-072 — Máquina de estados del retiro del vendedor con aprobación manual.
 * REQUESTED → APPROVED → PAID · (REQUESTED/APPROVED) → REJECTED (reintegra fondos).
 * Al solicitar se RESERVAN los fondos (se descuentan del disponible + asiento WITHDRAWAL).
 */
@Injectable()
export class WithdrawalsService {
  private readonly dailyLimit = Number(process.env.WITHDRAWAL_DAILY_LIMIT || 5000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly kyc: KycService,
    private readonly payments: PaymentsService,
    private readonly payout: ManualPayoutProvider,
  ) {}

  /** Vendedor solicita un retiro. Valida KYC + método + saldo + límite; reserva los fondos. */
  async request(userId: string, dto: { amount: number; paymentMethodId: string }): Promise<any> {
    const amount = Number(dto.amount);
    if (!amount || amount <= 0) throw new BadRequestException('Monto inválido');

    // Gate 1 — KYC aprobado (obligatorio, PT-069)
    const kycStatus = await this.kyc.getUserKycStatus(userId);
    if (!this.kyc.isApproved(kycStatus)) {
      throw new BadRequestException('Se requiere KYC aprobado para retirar');
    }
    // Gate 2 — método de pago válido del usuario
    const method = await this.payments.getUserPaymentMethod(userId, dto.paymentMethodId);
    if (!method) throw new BadRequestException('Método de pago inválido');

    // Gate 2-bis — la cuenta tiene que estar VERIFICADA (PT-092, cierre de TD-003).
    //
    // Hasta aquí `isVerified` nacía `false`, nadie lo ponía nunca a `true` y nadie lo
    // comprobaba: se retiraba a una cuenta que nadie había confirmado que fuera del usuario.
    // El dígito verificador de la CLABE se valida al registrarla, lo que atrapa erratas de
    // tecleo pero **no la titularidad**: una CLABE ajena bien escrita pasaba igual.
    //
    // La verificación mueve dinero de verdad con un código que solo ve quien tiene acceso a la
    // cuenta. Sin ella, el destino del retiro es una afirmación del usuario, no un hecho.
    if (!method.isVerified) {
      throw new BadRequestException(
        'Esta cuenta aún no está verificada. Verifícala antes de retirar: te enviaremos un ' +
          'importe pequeño con un código que tendrás que confirmar.',
      );
    }
    // Gate 3 — saldo disponible suficiente (sólo disponible, no pending)
    const balance = await this.wallet.getBalance(userId);
    if (Number(balance.available) < amount) {
      throw new BadRequestException('Saldo disponible insuficiente');
    }
    // Gate 4 — límite diario
    const dailyWithdrawn = await this.wallet.getDailyWithdrawals(userId);
    if (dailyWithdrawn + amount > this.dailyLimit) {
      throw new BadRequestException(`Límite diario de retiro excedido (${this.dailyLimit})`);
    }

    // Crear solicitud + reservar fondos (descuenta disponible + asiento WITHDRAWAL)
    const req = await (this.prisma as any).withdrawalRequest.create({
      data: { userId, paymentMethodId: dto.paymentMethodId, amount, status: 'REQUESTED' },
    });
    await this.wallet.withdraw(userId, amount, `WR-${req.id}`);
    return req;
  }

  async listMine(userId: string): Promise<any[]> {
    return (this.prisma as any).withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listQueue(status?: string): Promise<any[]> {
    const where = status ? { status: status as any } : {};
    return (this.prisma as any).withdrawalRequest.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  private async getOrThrow(id: string): Promise<any> {
    const req = await (this.prisma as any).withdrawalRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud de retiro no encontrada');
    return req;
  }

  async approve(id: string, adminUser: string): Promise<any> {
    const req = await this.getOrThrow(id);
    if (req.status !== 'REQUESTED') {
      throw new BadRequestException(`No se puede aprobar en estado ${req.status}`);
    }
    return (this.prisma as any).withdrawalRequest.update({
      where: { id },
      data: { status: 'APPROVED', reviewedBy: adminUser, reviewedAt: new Date() },
    });
  }

  async reject(id: string, adminUser: string, reason: string): Promise<any> {
    const req = await this.getOrThrow(id);
    if (req.status !== 'REQUESTED' && req.status !== 'APPROVED') {
      throw new BadRequestException(`No se puede rechazar en estado ${req.status}`);
    }
    // Reintegrar los fondos reservados
    await this.wallet.refundWithdrawal(req.userId, Number(req.amount), `WR-${req.id}`);
    return (this.prisma as any).withdrawalRequest.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: adminUser, reviewedAt: new Date(), notes: reason },
    });
  }

  /** Admin marca pagado tras ejecutar el SPEI manual. */
  async markPaid(id: string, adminUser: string, reference?: string): Promise<any> {
    const req = await this.getOrThrow(id);
    if (req.status !== 'APPROVED') {
      throw new BadRequestException(`Sólo se marca pagado desde APPROVED (actual: ${req.status})`);
    }
    const method = await this.payments.getUserPaymentMethod(req.userId, req.paymentMethodId);
    const result = await this.payout.execute({
      amount: Number(req.amount),
      clabe: (method as any)?.clabe,
      holderName: (method as any)?.holderName,
      reference: `WR-${req.id}`,
    });
    return (this.prisma as any).withdrawalRequest.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        reviewedBy: adminUser,
        payoutReference: reference || result.reference,
      },
    });
  }
}
