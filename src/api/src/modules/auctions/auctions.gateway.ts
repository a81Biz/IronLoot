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

  // PT-191 (AUD-006) — `emitAuctionEnded(auctionId, winnerId, amount)` retirado.
  //
  // **Cero llamantes**, y era el unico emisor de este gateway que difundia un **id de usuario** por un
  // canal sin autenticar. Un emisor sin llamantes no es inofensivo cuando lo que hace es filtrar: es un
  // arma cargada apuntando al hallazgo que este PT cierra. Precedente ADR-047 — *un endpoint sin
  // llamantes se retira, no se pule*.
  //
  // Quien necesite anunciar el cierre lo escribira a proposito y chocara con
  // `emisiones-publicas-sin-datos-privados.spec.ts`, que es exactamente cuando conviene pararse: el
  // ganador se anuncia por notificacion al interesado, no a la sala.
}
