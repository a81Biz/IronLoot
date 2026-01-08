import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: Configure strict CORS for production
  },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinAuction')
  async handleJoinAuction(@MessageBody() auctionId: string, @ConnectedSocket() client: Socket) {
    const room = `auction:${auctionId}`;
    await client.join(room);
    this.logger.debug(`Client ${client.id} joined ${room}`);
    return { event: 'joinedAuction', data: auctionId };
  }

  @SubscribeMessage('leaveAuction')
  async handleLeaveAuction(@MessageBody() auctionId: string, @ConnectedSocket() client: Socket) {
    const room = `auction:${auctionId}`;
    await client.leave(room);
    this.logger.debug(`Client ${client.id} left ${room}`);
    return { event: 'leftAuction', data: auctionId };
  }

  /**
   * Emit an event to a specific auction room
   */
  emitAuctionEvent(auctionId: string, event: string, data: any) {
    this.server.to(`auction:${auctionId}`).emit(event, data);
  }
}
