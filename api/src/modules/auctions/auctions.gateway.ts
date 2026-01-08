import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
// import { UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// For now, let's keep it open for reading (joining rooms) but strictly scoped.

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly for production
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
