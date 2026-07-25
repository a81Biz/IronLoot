/**
 * PT-072 — Abstracción de dispersión (payout), análoga a PaymentProvider.
 * MVP: ManualPayoutProvider (el admin ejecuta el SPEI y marca PAID). Fase 2: implementar
 * un provider automático (MP disbursement / SPEI API) detrás de esta misma interfaz.
 */
export interface PayoutRequest {
  amount: number;
  clabe?: string | null;
  holderName?: string | null;
  reference: string; // id de la solicitud
}

export interface PayoutResult {
  success: boolean;
  reference: string;
  mode: 'MANUAL' | 'AUTO';
  message?: string;
}

export interface PayoutProvider {
  readonly name: string;
  /** Ejecuta (o registra) la dispersión. En manual no mueve dinero: lo hace el admin. */
  execute(req: PayoutRequest): Promise<PayoutResult>;
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class ManualPayoutProvider implements PayoutProvider {
  readonly name = 'MANUAL';

  async execute(req: PayoutRequest): Promise<PayoutResult> {
    // Manual: no hay transferencia automática. El admin realiza el SPEI por fuera y marca PAID.
    return {
      success: true,
      reference: req.reference,
      mode: 'MANUAL',
      message: 'Requiere transferencia SPEI manual por el administrador.',
    };
  }
}
