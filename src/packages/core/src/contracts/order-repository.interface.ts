import { OrderStatus } from '../domain/order/order-status.enum';

export interface OrderSummary {
  id: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  status: OrderStatus;
}

export interface IOrderRepository {
  findById(id: string): Promise<OrderSummary | null>;
  findByAuctionId(auctionId: string): Promise<OrderSummary | null>;
  create(auctionId: string, buyerId: string, sellerId: string, amount: number): Promise<OrderSummary>;
  updateStatus(id: string, status: OrderStatus): Promise<void>;
}
