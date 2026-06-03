export interface WalletSummary {
  id: string;
  userId: string;
  balance: number;
  heldFunds: number;
}

export interface IWalletRepository {
  findByUserId(userId: string): Promise<WalletSummary | null>;
  lockFunds(userId: string, amount: number, referenceId: string): Promise<void>;
  releaseFunds(userId: string, amount: number, referenceId: string): Promise<void>;
  creditBalance(userId: string, amount: number, referenceId: string, type: string): Promise<void>;
}
