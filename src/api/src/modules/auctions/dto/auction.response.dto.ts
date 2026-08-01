import { ApiProperty } from '@nestjs/swagger';
import { AuctionStatus } from '@prisma/client';

export class AuctionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  status: AuctionStatus;

  @ApiProperty({ type: Number })
  startingPrice: number;

  @ApiProperty({ type: Number })
  currentPrice: number;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty()
  sellerId: string;

  @ApiProperty({ required: false })
  sellerName?: string;

  @ApiProperty({ isArray: true })
  images: string[];

  /**
   * PT-221 (H-UI-018) — Numero de pujas recibidas.
   *
   * Las plantillas lo leian desde siempre y el API no lo emitia: el panel de puja decia «Sin ofertas
   * aun» con cualquier numero de pujas. Es la prueba social que valida un precio (`list.png §6`).
   *
   * Opcional: quien mapee sin contar —una creacion, una publicacion— deja `undefined`, que la plantilla
   * distingue de `0`. Un `0` afirmado sin haber contado seria el mismo silencio que este PT corrige.
   */
  @ApiProperty({ required: false })
  totalBids?: number;

  /**
   * PT-210 (H-UI-020) — La puja minima aceptable AHORA: `currentPrice + AUCTION_MIN_INCREMENT_AMOUNT`.
   *
   * `RN-14` esta implementada en `bids.service.ts` y **el usuario la descubria por rechazo**, en los 120
   * segundos del soft-close, con un formulario cuyo `min` era `0`.
   *
   * Se calcula aqui y no en la interfaz porque el incremento es configuracion de negocio: duplicarlo en
   * el navegador garantiza que diverja el dia que alguien lo cambie.
   */
  @ApiProperty({ required: false })
  minNextBid?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
