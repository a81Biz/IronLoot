import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateAuditEventInput,
  AuditEventQuery,
  AuditResult,
  ActorType,
} from './audit.types';

/**
 * AuditEventService
 *
 * Manages business event auditing for the application.
 * All significant business actions should be recorded through this service.
 *
 * Reference: 03-modelo-registro-db.md Section 3.1
 */
@Injectable()
export class AuditEventService {
  private readonly logger = new Logger(AuditEventService.name);
  private readonly serviceName = 'ironloot-api';
  private readonly env: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.env = this.configService.get<string>('NODE_ENV', 'development');
  }

  /**
   * Record a business event
   *
   * @param input - Event details
   * @returns Created event ID
   */
  async record(input: CreateAuditEventInput): Promise<string> {
    try {
      const event = await this.prisma.auditEvent.create({
        data: {
          eventType: input.eventType,
          traceId: input.traceId,
          env: this.env,
          service: this.serviceName,
          actorType: input.actorType,
          actorUserId: input.actorUserId,
          entityType: input.entityType,
          entityId: input.entityId,
          result: input.result,
          reasonCode: input.reasonCode,
          payload: input.payload || {},
          payloadVersion: 1,
        },
      });

      // Debug log in development
      if (this.env === 'development') {
        this.logger.debug(
          `📝 Audit: ${input.eventType} on ${input.entityType}:${input.entityId} [${input.result}]`,
        );
      }

      return event.id;
    } catch (error) {
      // Log error but don't throw - audit should not break business flow
      this.logger.error(`Failed to record audit event: ${(error as Error).message}`, {
        input,
        error,
      });
      return '';
    }
  }

  /**
   * Record a successful business event
   * Convenience method for success cases
   */
  async recordSuccess(
    input: Omit<CreateAuditEventInput, 'result' | 'reasonCode'>,
  ): Promise<string> {
    return this.record({
      ...input,
      result: AuditResult.SUCCESS,
    });
  }

  /**
   * Record a failed business event
   * Convenience method for failure cases
   */
  async recordFailure(
    input: Omit<CreateAuditEventInput, 'result'> & { reasonCode: string },
  ): Promise<string> {
    return this.record({
      ...input,
      result: AuditResult.FAIL,
    });
  }

  /**
   * Record a system-initiated event
   * For events not triggered by a user (e.g., scheduled tasks)
   */
  async recordSystemEvent(
    input: Omit<CreateAuditEventInput, 'actorType' | 'actorUserId'>,
  ): Promise<string> {
    return this.record({
      ...input,
      actorType: ActorType.SYSTEM,
      actorUserId: undefined,
    });
  }

  /**
   * Query audit events by entity
   * Useful for showing history of an auction, order, etc.
   */
  async findByEntity(entityType: string, entityId: string, limit = 50): Promise<any[]> {
    return this.prisma.auditEvent.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Query audit events by actor (user)
   * Useful for user activity history
   */
  async findByActor(actorUserId: string, limit = 50): Promise<any[]> {
    return this.prisma.auditEvent.findMany({
      where: {
        actorUserId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Query audit events by trace ID
   * Useful for debugging a specific request flow
   */
  async findByTraceId(traceId: string): Promise<any[]> {
    return this.prisma.auditEvent.findMany({
      where: {
        traceId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }

  /**
   * Advanced query with filters
   */
  async query(filters: AuditEventQuery): Promise<any[]> {
    const where: any = {};

    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.actorUserId) where.actorUserId = filters.actorUserId;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.traceId) where.traceId = filters.traceId;

    if (filters.fromDate || filters.toDate) {
      where.timestamp = {};
      if (filters.fromDate) where.timestamp.gte = filters.fromDate;
      if (filters.toDate) where.timestamp.lte = filters.toDate;
    }

    return this.prisma.auditEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }
}
