export interface CfdiData {
  orderId: string;
  sellerRfc: string;
  buyerRfc: string;
  amount: number;
  currency: string;
  description: string;
}

export interface StampedCfdi {
  uuid: string;
  xml: string;
  pdf?: string;
}

export interface ICfdiPacProvider {
  stampCfdi(cfdi: CfdiData): Promise<StampedCfdi>;
  cancelCfdi(uuid: string, reason: string): Promise<void>;
}
