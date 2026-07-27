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

// PT-015: ALLOWED_ORIGINS parsed at startup — consistent with AuctionsGateway
const wsOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// PT-039 (AUD-006): validate auctionId before joining rooms (public read-only namespace).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@WebSocketGateway({
  cors: {
    origin: wsOrigins.length > 0 ? wsOrigins : '*',
    credentials: true,
  },
  namespace: 'events',
  // PT-110 (H-008) — Cotas explicitas. Este namespace es PUBLICO y SIN autenticar, y el
  // `@nestjs/throttler` global cubre HTTP, **no sockets**: si no hay cota aqui, no hay cota.
  //
  // Los eventos que viajan por aqui son diminutos —un id de subasta, un importe, una marca de
  // tiempo—, asi que 16 KB es holgado por dos ordenes de magnitud sobre lo observado y sigue
  // cortando un cuerpo abusivo. No es una cifra bonita: es lo medido con margen.
  //
  // `pingInterval`/`pingTimeout` explicitos para que una conexion muerta se recoja en ~25 s en
  // vez de quedarse ocupando sitio: el aviso de engine.io era justamente agotamiento de
  // conexiones por el transporte polling.
  maxHttpBufferSize: 16 * 1024,
  pingInterval: 20000,
  pingTimeout: 5000,
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
    if (!auctionId || !UUID_RE.test(auctionId)) {
      return { event: 'error', data: 'invalid auctionId' };
    }
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
