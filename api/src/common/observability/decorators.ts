import { SetMetadata, applyDecorators } from '@nestjs/common';
import { AuditEventType, EntityType, LogLevel } from './constants';

// ===========================================
// METADATA KEYS
// ===========================================

export const LOG_METADATA_KEY = 'observability:log';
export const AUDIT_METADATA_KEY = 'observability:audit';
export const ENTITY_METADATA_KEY = 'observability:entity';
export const SKIP_LOG_METADATA_KEY = 'observability:skip-log';
export const SLOW_THRESHOLD_METADATA_KEY = 'observability:slow-threshold';

// ===========================================
// LOG DECORATOR
// ===========================================

export interface LogMetadata {
  level?: LogLevel;
  message?: string;
  includeArgs?: boolean;
  includeResult?: boolean;
  sensitiveArgs?: number[]; // Indices of args to redact
}

/**
 * @Log() - Decorator for automatic method logging
 *
 * Usage:
 * @Log()
 * async createAuction(dto: CreateAuctionDto) { ... }
 *
 * @Log({ level: LogLevel.DEBUG, includeArgs: true })
 * async findAuction(id: string) { ... }
 *
 * @Log({ message: 'Processing payment', sensitiveArgs: [1] })
 * async processPayment(orderId: string, cardDetails: CardDto) { ... }
 */
export function Log(options?: LogMetadata): MethodDecorator {
  return SetMetadata(LOG_METADATA_KEY, {
    level: options?.level || LogLevel.DEBUG,
    message: options?.message,
    includeArgs: options?.includeArgs ?? false,
    includeResult: options?.includeResult ?? false,
    sensitiveArgs: options?.sensitiveArgs || [],
  });
}

/**
 * @SkipLog() - Skip automatic logging for this method
 */
export function SkipLog(): MethodDecorator {
  return SetMetadata(SKIP_LOG_METADATA_KEY, true);
}

// ===========================================
// AUDIT DECORATOR
// ===========================================

export interface AuditMetadata {
  eventType: AuditEventType;
  entityType: EntityType;
  // Function to extract entity ID from method args or result
  entityIdExtractor?: (args: any[], result?: any) => string;
  // Payload fields to include (whitelist)
  payloadFields?: string[];
  // Log on failure too (default: true)
  logOnFailure?: boolean;
}

/**
 * @Audit() - Decorator for automatic audit event recording
 *
 * Usage:
 * @Audit({
 *   eventType: AuditEventType.BID_PLACED,
 *   entityType: EntityType.AUCTION,
 *   entityIdExtractor: (args) => args[0].auctionId,
 *   payloadFields: ['amount', 'auctionId']
 * })
 * async placeBid(dto: PlaceBidDto) { ... }
 */
export function Audit(metadata: AuditMetadata): MethodDecorator {
  return SetMetadata(AUDIT_METADATA_KEY, {
    ...metadata,
    logOnFailure: metadata.logOnFailure ?? true,
  });
}

// ===========================================
// ENTITY DECORATOR
// ===========================================

export interface EntityMetadata {
  type: EntityType;
  // Parameter index or property path to get entity ID
  idParam?: number | string;
}

/**
 * @Entity() - Mark method as operating on a specific entity type
 *
 * Usage:
 * @Entity({ type: EntityType.AUCTION, idParam: 0 })
 * async getAuction(id: string) { ... }
 *
 * @Entity({ type: EntityType.ORDER, idParam: 'dto.orderId' })
 * async updateOrder(dto: UpdateOrderDto) { ... }
 */
export function Entity(metadata: EntityMetadata): MethodDecorator {
  return SetMetadata(ENTITY_METADATA_KEY, metadata);
}

// ===========================================
// SLOW THRESHOLD DECORATOR
// ===========================================

/**
 * @SlowThreshold() - Set custom slow execution threshold for this method
 *
 * Usage:
 * @SlowThreshold(5000) // Log warning if takes more than 5s
 * async processLargeFile() { ... }
 */
export function SlowThreshold(ms: number): MethodDecorator {
  return SetMetadata(SLOW_THRESHOLD_METADATA_KEY, ms);
}

// ===========================================
// COMBINED DECORATORS
// ===========================================

/**
 * @LoggedEndpoint() - Combined decorator for typical endpoints
 * Applies logging and entity tracking
 */
export function LoggedEndpoint(entityType: EntityType, idParam: number = 0): MethodDecorator {
  return applyDecorators(Log({ includeArgs: false }), Entity({ type: entityType, idParam }));
}

/**
 * @AuditedAction() - Combined decorator for audited business actions
 */
export function AuditedAction(
  eventType: AuditEventType,
  entityType: EntityType,
  entityIdExtractor: (args: any[], result?: any) => string,
  payloadFields?: string[],
): MethodDecorator {
  return applyDecorators(
    Log({ level: LogLevel.INFO }),
    Audit({ eventType, entityType, entityIdExtractor, payloadFields }),
  );
}
