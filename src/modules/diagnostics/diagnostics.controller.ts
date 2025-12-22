import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditPersistenceService } from '../audit/audit-persistence.service';
import { PrismaService } from '../../database/prisma.service';
import { MetricsService, RequestContextService } from '../../common/observability';

/**
 * DiagnosticsController
 *
 * Provides endpoints for viewing logs, errors, and metrics.
 * Only available in non-production environments.
 */
@ApiTags('diagnostics')
@Controller('diagnostics')
export class DiagnosticsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditPersistenceService,
    private readonly metrics: MetricsService,
    private readonly ctx: RequestContextService,
  ) {}

  /**
   * Simple ping - no dependencies
   */
  @Get('ping')
  @ApiOperation({ summary: 'Simple ping' })
  ping() {
    return {
      pong: true,
      timestamp: new Date().toISOString(),
      traceId: this.ctx.getTraceId(),
    };
  }

  /**
   * Get recent errors from database
   */
  @Get('errors')
  @ApiOperation({ summary: 'Get recent errors' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'code', required: false, type: String })
  async getErrors(
    @Query('limit') limit?: number,
    @Query('code') code?: string,
  ) {
    const errors = await this.prisma.errorEvent.findMany({
      where: code ? { errorCode: code } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit || 20,
      select: {
        id: true,
        timestamp: true,
        traceId: true,
        errorCode: true,
        message: true,
        severity: true,
        httpStatus: true,
        httpMethod: true,
        httpPath: true,
        isBusinessError: true,
      },
    });

    return {
      count: errors.length,
      errors,
    };
  }

  /**
   * Get error details by trace ID
   */
  @Get('errors/trace/:traceId')
  @ApiOperation({ summary: 'Get errors by trace ID' })
  async getErrorsByTrace(@Param('traceId') traceId: string) {
    const errors = await this.audit.getErrorsByTrace(traceId);
    return {
      traceId,
      count: errors.length,
      errors,
    };
  }

  /**
   * Get recent audit events
   */
  @Get('audit')
  @ApiOperation({ summary: 'Get recent audit events' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  async getAuditEvents(
    @Query('limit') limit?: number,
    @Query('eventType') eventType?: string,
  ) {
    const events = await this.prisma.auditEvent.findMany({
      where: eventType ? { eventType } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit || 20,
      select: {
        id: true,
        timestamp: true,
        traceId: true,
        eventType: true,
        actorType: true,
        actorUserId: true,
        entityType: true,
        entityId: true,
        result: true,
        reasonCode: true,
      },
    });

    return {
      count: events.length,
      events,
    };
  }

  /**
   * Get audit history for an entity
   */
  @Get('audit/entity/:type/:id')
  @ApiOperation({ summary: 'Get audit history for entity' })
  async getEntityHistory(
    @Param('type') entityType: string,
    @Param('id') entityId: string,
    @Query('limit') limit?: number,
  ) {
    const events = await this.audit.getAuditHistory(entityType as any, entityId, limit || 50);
    return {
      entityType,
      entityId,
      count: events.length,
      events,
    };
  }

  /**
   * Get recent request logs
   */
  @Get('requests')
  @ApiOperation({ summary: 'Get recent request logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Number })
  async getRequestLogs(
    @Query('limit') limit?: number,
    @Query('status') status?: number,
  ) {
    const logs = await this.prisma.requestLog.findMany({
      where: status ? { httpStatus: status } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit || 20,
      select: {
        id: true,
        timestamp: true,
        traceId: true,
        httpMethod: true,
        httpPath: true,
        httpStatus: true,
        durationMs: true,
        actorUserId: true,
      },
    });

    return {
      count: logs.length,
      logs,
    };
  }

  /**
   * Get slow requests
   */
  @Get('requests/slow')
  @ApiOperation({ summary: 'Get slow requests' })
  @ApiQuery({ name: 'minMs', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSlowRequests(
    @Query('minMs') minMs?: number,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.prisma.requestLog.findMany({
      where: {
        durationMs: { gte: minMs || 1000 },
      },
      orderBy: { durationMs: 'desc' },
      take: limit || 20,
      select: {
        timestamp: true,
        traceId: true,
        httpMethod: true,
        httpPath: true,
        httpStatus: true,
        durationMs: true,
      },
    });

    return {
      threshold: minMs || 1000,
      count: logs.length,
      logs,
    };
  }

  /**
   * Get metrics snapshot
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get metrics snapshot' })
  getMetrics() {
    return this.metrics.getSnapshot();
  }

  /**
   * Get database stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get database statistics' })
  async getStats() {
    const [errorCount, auditCount, requestCount] = await Promise.all([
      this.prisma.errorEvent.count(),
      this.prisma.auditEvent.count(),
      this.prisma.requestLog.count(),
    ]);

    // Recent error rate (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = await this.prisma.errorEvent.count({
      where: { timestamp: { gte: oneHourAgo } },
    });

    return {
      totals: {
        errors: errorCount,
        auditEvents: auditCount,
        requestLogs: requestCount,
      },
      lastHour: {
        errors: recentErrors,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
