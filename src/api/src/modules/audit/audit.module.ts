import { Global, Module } from '@nestjs/common';
import { AuditPersistenceService } from './audit-persistence.service';

/**
 * AuditModule
 *
 * Provides database persistence for observability events:
 * - Audit events (business actions)
 * - Error events
 * - Request logs
 *
 * This module automatically connects with ObservabilityModule
 * on initialization to receive events for persistence.
 *
 * Reference: 03-modelo-registro-db.md
 */
@Global()
@Module({
  providers: [AuditPersistenceService],
  exports: [AuditPersistenceService],
})
export class AuditModule {}
