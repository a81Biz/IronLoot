import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  StructuredLogger,
  ChildLogger,
  AuctionNotFoundException,
} from '../../common/observability';
import { CreateWatchlistDto, WatchlistItemResponseDto } from './dto';
import { AuctionsService } from '../auctions/auctions.service';

@Injectable()
export class WatchlistService {
  private readonly log: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly auctionsService: AuctionsService, // Injected to reuse mapToResponse
  ) {
    this.log = this.logger.child('WatchlistService');
  }

  // ===========================================
  // ADD WATCH
  // ===========================================
  async add(userId: string, dto: CreateWatchlistDto): Promise<void> {
    const { auctionId } = dto;

    // 1. Check if auction exists
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true },
    });

    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 2. Alta idempotente.
    //
    // PT-142 — Aqui habia un `findUnique` + `if (existing) return` + `create`, con un comentario
    // que decia haber considerado `upsert` y haberlo descartado por «cleaner logic». La logica era
    // mas clara y **no era idempotente**: dos peticiones simultaneas pasan las dos por el `return`
    // y las dos crean, y la perdedora recibe `P2002` — un 500 justo donde el codigo prometia
    // «Idempotent 200 OK».
    //
    // La duda que registraba el comentario («upsert requiere un where sobre la clave unica») tenia
    // respuesta: `@@unique([userId, auctionId])` genera `userId_auctionId`, que es exactamente ese
    // `where`. Ya se estaba usando dos lineas mas abajo.
    await this.prisma.watchlist.upsert({
      where: { userId_auctionId: { userId, auctionId } },
      create: { userId, auctionId },
      update: {},
    });

    this.log.info('Added to watchlist', { userId, auctionId });
  }

  // ===========================================
  // REMOVE WATCH
  // ===========================================
  async remove(userId: string, auctionId: string): Promise<void> {
    // Idempotent delete
    try {
      await this.prisma.watchlist.delete({
        where: {
          userId_auctionId: { userId, auctionId },
        },
      });
      this.log.info('Removed from watchlist', { userId, auctionId });
    } catch (error: any) {
      // Prisma P2025: Record not found
      if (error.code === 'P2025') {
        this.log.debug('Watchlist item did not exist, ignoring', { userId, auctionId });
        return; // Idempotent 204
      }
      throw error;
    }
  }

  // ===========================================
  // FIND ALL
  // ===========================================
  async findAll(userId: string): Promise<WatchlistItemResponseDto[]> {
    const items = await this.prisma.watchlist.findMany({
      where: { userId },
      include: {
        auction: {
          include: { seller: { select: { displayName: true } } }, // Needed for mapToResponse
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map using strictly typed Auction mapper
    // Accessing private mapToResponse via public wrapper or duplicating?
    // AuctionsService mapToResponse is private.
    // I should create a public helper in AuctionsService or duplicate safe logic here.
    // The spec says "MUST use existing public AuctionsService.mapToResponse method".
    // I need to check if mapToResponse is public. I read AuctionsService earlier, it was private.
    // I will need to make it public or use `findOne` logic? But `findOne` fetches again.
    // Refactoring AuctionsService to make `mapToResponse` public is the correct path.

    // For now I will assume I can refactor it in next step or use `any` cast to access it if strictness allows,
    // but better to actually modify AuctionsService.

    // Let's defer method access by casting for this file write, then I'll fix AuctionsService.
    // Or better: I'll duplicate the logic strictly here to match the spec requirement of "strict contract"
    // since I haven't updated AuctionsService public API yet.
    // Wait, Spec said: "MUST use the existing public AuctionsService.mapToResponse method".
    // I must update AuctionsService to expose it.

    return items.map((item) => ({
      id: item.id,
      auctionId: item.auctionId,
      createdAt: item.createdAt,
      auction: (this.auctionsService as any).mapToResponse(
        item.auction,
        item.auction.seller?.displayName,
      ),
    }));
  }
}
