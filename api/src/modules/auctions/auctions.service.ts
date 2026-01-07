import { Injectable } from '@nestjs/common';
import { Auction, AuctionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  StructuredLogger,
  ChildLogger,
  UserNotFoundException,
  ValidationException,
  ForbiddenException,
  RequestContextService,
  AuctionNotFoundException,
} from '../../common/observability';
import { CreateAuctionDto, UpdateAuctionDto, AuctionResponseDto } from './dto';
import { nanoid } from 'nanoid';

@Injectable()
export class AuctionsService {
  private readonly log: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly ctx: RequestContextService,
  ) {
    this.log = this.logger.child('AuctionsService');
  }

  // ===========================================
  // CREATE AUCTION
  // ===========================================
  async create(userId: string, dto: CreateAuctionDto): Promise<AuctionResponseDto> {
    this.log.debug('Creating auction', { userId, title: dto.title });

    // Verify user is a seller
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSeller: true },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    if (!user.isSeller) {
      throw new ForbiddenException('User is not a registered seller');
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const now = new Date();

    if (endsAt <= startsAt) {
      throw new ValidationException('End date must be after start date');
    }

    // Allow a small buffer (e.g. 1 minute) for network latency
    if (startsAt.getTime() < now.getTime() - 60000) {
      throw new ValidationException('Start date cannot be in the past');
    }

    // Create auction
    const auction = await this.prisma.auction.create({
      data: {
        title: dto.title,
        description: dto.description,
        slug: this.generateSlug(dto.title),
        startingPrice: dto.startingPrice,
        currentPrice: dto.startingPrice,
        startsAt,
        endsAt,
        images: dto.images || [],
        sellerId: userId,
        status: AuctionStatus.DRAFT,
      },
    });

    this.log.info('Auction created successfully', { auctionId: auction.id });

    return this.mapToResponse(auction);
  }

  // ===========================================
  // FIND ALL (Public)
  // ===========================================
  // ===========================================
  // FIND ALL (Public)
  // ===========================================
  async findAll(query: {
    status?: AuctionStatus;
    sellerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuctionResponseDto[]; total: number; page: number; limit: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AuctionWhereInput = {};

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { in: [AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED] };
    }

    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    const [auctions, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { seller: { select: { displayName: true } } },
        skip,
        take: limit,
      }),
      this.prisma.auction.count({ where }),
    ]);

    return {
      data: auctions.map((a) => this.mapToResponse(a, a.seller?.displayName || undefined)),
      total,
      page,
      limit,
    };
  }

  // ===========================================
  // FIND ONE
  // ===========================================
  async findOne(idOrSlug: string): Promise<AuctionResponseDto> {
    // Check if valid UUID, otherwise treat as slug
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(idOrSlug);
    const where: Prisma.AuctionWhereUniqueInput = isUuid ? { id: idOrSlug } : { slug: idOrSlug };

    const auction = await this.prisma.auction.findUnique({
      where,
      include: { seller: { select: { displayName: true } } },
    });

    if (!auction) {
      throw new AuctionNotFoundException(idOrSlug);
    }

    return this.mapToResponse(auction, auction.seller?.displayName || undefined);
  }

  // ===========================================
  // UPDATE AUCTION
  // ===========================================
  async update(userId: string, id: string, dto: UpdateAuctionDto): Promise<AuctionResponseDto> {
    const auction = await this.prisma.auction.findUnique({ where: { id } });

    if (!auction) {
      throw new ValidationException('Auction not found');
    }

    if (auction.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own auctions');
    }

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new ValidationException('Cannot update auction unless it is in DRAFT state');
    }

    const updatedAuction = await this.prisma.auction.update({
      where: { id },
      data: {
        ...dto,
        slug: dto.title ? this.generateSlug(dto.title) : undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });

    return this.mapToResponse(updatedAuction);
  }

  // ===========================================
  // PUBLISH AUCTION
  // ===========================================
  async publish(userId: string, id: string): Promise<AuctionResponseDto> {
    const auction = await this.prisma.auction.findUnique({ where: { id } });

    if (!auction) {
      throw new ValidationException('Auction not found');
    }

    if (auction.sellerId !== userId) {
      throw new ForbiddenException('You can only publish your own auctions');
    }

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new ValidationException('Auction is not in DRAFT state');
    }

    const updatedAuction = await this.prisma.auction.update({
      where: { id },
      data: { status: AuctionStatus.PUBLISHED },
    });

    this.log.info('Auction published', { auctionId: id });

    return this.mapToResponse(updatedAuction);
  }

  // ===========================================
  // HELPERS
  // ===========================================
  private mapToResponse(auction: Auction, sellerName?: string): AuctionResponseDto {
    return {
      id: auction.id,
      title: auction.title,
      description: auction.description,
      slug: auction.slug,
      status: auction.status,
      startingPrice: Number(auction.startingPrice),
      currentPrice: Number(auction.currentPrice),
      startsAt: auction.startsAt,
      endsAt: auction.endsAt,
      sellerId: auction.sellerId,
      sellerName,
      images: Array.isArray(auction.images) ? (auction.images as string[]) : [],
      createdAt: auction.createdAt,
      updatedAt: auction.updatedAt,
    };
  }

  private generateSlug(title: string): string {
    const slugBase = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${slugBase}-${nanoid(8)}`;
  }
}
