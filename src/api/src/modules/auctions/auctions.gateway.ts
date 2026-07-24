import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// PT-039 (AUD-006): the `auctions` namespace is intentionally PUBLIC read-only — the live bid
// feed mirrors public REST data (GET /auctions/:id/bids). Placing a bid always requires REST +
// JWT (POST /auctions/:auctionId/bids). Hardening applied instead of requiring a WS JWT (which
// would break guest live-view on BASE): validate auctionId before joining a room to prevent
// arbitrary/injected room joins, and never broadcast bidder PII (see BidsService payload).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PT-013: ALLOWED_ORIGINS parsed at startup to support base.localhost and client.localhost
const wsOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

@WebSocketGateway({
  cors: {
    origin: wsOrigins.length > 0 ? wsOrigins : '*',
    credentials: true,
  },
  namespace: 'auctions',
})
export class AuctionsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinAuction')
  async handleJoinAuction(
    @MessageBody() data: { auctionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.auctionId || !UUID_RE.test(data.auctionId)) {
      return { event: 'error', message: 'invalid auctionId' };
    }
    await client.join(`auction:${data.auctionId}`);
    return { event: 'joined', message: `Joined room auction:${data.auctionId}` };
  }

  @SubscribeMessage('leaveAuction')
  async handleLeaveAuction(
    @MessageBody() data: { auctionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(`auction:${data.auctionId}`);
    return { event: 'left', message: `Left room auction:${data.auctionId}` };
  }

  emitNewBid(auctionId: string, bid: any) {
    this.server.to(`auction:${auctionId}`).emit('bid:new', bid);
  }

  emitAuctionExtended(auctionId: string, newEndsAt: Date) {
    this.server.to(`auction:${auctionId}`).emit('auction:extended', { newEndsAt });
  }

  emitAuctionEnded(auctionId: string, winnerId: string, amount: number) {
    this.server.to(`auction:${auctionId}`).emit('auction:ended', { winnerId, amount });
  }
}
