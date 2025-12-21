/**
 * Audit Types and Interfaces
 *
 * Defines the structure for audit events, error events, and request logs.
 * Reference: 02-logging-y-trazabilidad.md, 03-modelo-registro-db.md
 */

// ===========================================
// AUDIT EVENTS
// ===========================================

/**
 * Event types for business actions
 * Naming: MODULE_ACTION (e.g., AUCTION_CREATED)
 */
export enum AuditEventType {
  // Auth events
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGGED_IN = 'USER_LOGGED_IN',
  USER_LOGGED_OUT = 'USER_LOGGED_OUT',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',

  // User events
  USER_VERIFIED = 'USER_VERIFIED',
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
  USER_SELLER_ENABLED = 'USER_SELLER_ENABLED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',

  // Auction events
  AUCTION_CREATED = 'AUCTION_CREATED',
  AUCTION_PUBLISHED = 'AUCTION_PUBLISHED',
  AUCTION_UPDATED = 'AUCTION_UPDATED',
  AUCTION_CLOSED = 'AUCTION_CLOSED',
  AUCTION_CANCELLED = 'AUCTION_CANCELLED',

  // Bid events
  BID_PLACED = 'BID_PLACED',
  BID_REJECTED = 'BID_REJECTED',
  BID_OUTBID = 'BID_OUTBID',

  // Order events
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',

  // Payment events
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',

  // Shipment events
  SHIPMENT_REGISTERED = 'SHIPMENT_REGISTERED',
  SHIPMENT_DELIVERED = 'SHIPMENT_DELIVERED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',

  // Rating events
  RATING_SUBMITTED = 'RATING_SUBMITTED',

  // Dispute events
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_MESSAGE_SENT = 'DISPUTE_MESSAGE_SENT',
  DISPUTE_ESCALATED = 'DISPUTE_ESCALATED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
}

/**
 * Actor types for audit events
 */
export enum ActorType {
  USER = 'user',
  SYSTEM = 'system',
}

/**
 * Result of an audited action
 */
export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
}

/**
 * Entity types that can be audited
 */
export enum EntityType {
  USER = 'User',
  AUCTION = 'Auction',
  BID = 'Bid',
  ORDER = 'Order',
  PAYMENT = 'Payment',
  SHIPMENT = 'Shipment',
  RATING = 'Rating',
  DISPUTE = 'Dispute',
}

/**
 * Input for creating an audit event
 */
export interface CreateAuditEventInput {
  eventType: AuditEventType;
  traceId: string;
  actorType: ActorType;
  actorUserId?: string;
  entityType: EntityType;
  entityId: string;
  result: AuditResult;
  reasonCode?: string;
  payload?: Record<string, unknown>;
}

// ===========================================
// ERROR EVENTS
// ===========================================

/**
 * Severity levels for errors
 */
export enum ErrorSeverity {
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Input for creating an error event
 */
export interface CreateErrorEventInput {
  traceId: string;
  errorCode: string;
  message: string;
  severity: ErrorSeverity;
  httpStatus?: number;
  isBusinessError: boolean;
  httpMethod?: string;
  httpPath?: string;
  httpQuery?: string;
  clientIp?: string;
  userAgent?: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// ===========================================
// REQUEST LOGS
// ===========================================

/**
 * Input for creating a request log
 */
export interface CreateRequestLogInput {
  traceId: string;
  httpMethod: string;
  httpPath: string;
  httpStatus: number;
  durationMs: number;
  requestSizeBytes?: number;
  responseSizeBytes?: number;
  actorUserId?: string;
  actorState?: string;
  clientIp?: string;
  userAgent?: string;
  clientApp?: string;
  entityType?: string;
  entityId?: string;
}

// ===========================================
// QUERY INTERFACES
// ===========================================

/**
 * Query filters for audit events
 */
export interface AuditEventQuery {
  entityType?: EntityType;
  entityId?: string;
  actorUserId?: string;
  eventType?: AuditEventType;
  traceId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query filters for error events
 */
export interface ErrorEventQuery {
  traceId?: string;
  errorCode?: string;
  actorUserId?: string;
  httpStatus?: number;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}
