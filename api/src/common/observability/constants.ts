/**
 * Observability Constants and Types
 *
 * Central definitions for logging, errors, and metrics
 * Reference: 02-logging-y-trazabilidad.md, 03-modelo-registro-db.md
 */

// ===========================================
// LOG LEVELS
// ===========================================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

// ===========================================
// ERROR CODES
// ===========================================

export enum ErrorCode {
  // Generic errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_NOT_VERIFIED = 'USER_NOT_VERIFIED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',

  // Auction errors
  AUCTION_NOT_FOUND = 'AUCTION_NOT_FOUND',
  AUCTION_NOT_ACTIVE = 'AUCTION_NOT_ACTIVE',
  AUCTION_ALREADY_CLOSED = 'AUCTION_ALREADY_CLOSED',
  AUCTION_NOT_STARTED = 'AUCTION_NOT_STARTED',

  // Bid errors
  BID_TOO_LOW = 'BID_TOO_LOW',
  BID_ON_OWN_AUCTION = 'BID_ON_OWN_AUCTION',
  BID_ALREADY_WINNER = 'BID_ALREADY_WINNER',

  // Payment errors
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE', // Audit: Spec v0.2.2
  PAYMENT_MISMATCH = 'PAYMENT_MISMATCH', // Audit: Spec v0.2.2

  // Order errors
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_ALREADY_CANCELLED = 'ORDER_ALREADY_CANCELLED',
  ORDER_CANNOT_CANCEL = 'ORDER_CANNOT_CANCEL',

  // Shipment errors
  SHIPMENT_NOT_FOUND = 'SHIPMENT_NOT_FOUND',
  INVALID_TRACKING_NUMBER = 'INVALID_TRACKING_NUMBER',

  // Dispute errors
  DISPUTE_NOT_FOUND = 'DISPUTE_NOT_FOUND',
  DISPUTE_ALREADY_RESOLVED = 'DISPUTE_ALREADY_RESOLVED',
  DISPUTE_WINDOW_EXPIRED = 'DISPUTE_WINDOW_EXPIRED',

  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
}

// HTTP status mapping for error codes
export const ERROR_CODE_HTTP_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,

  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,

  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_VERIFIED]: 403,
  [ErrorCode.USER_SUSPENDED]: 403,
  [ErrorCode.USER_BANNED]: 403,
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 409,

  [ErrorCode.AUCTION_NOT_FOUND]: 404,
  [ErrorCode.AUCTION_NOT_ACTIVE]: 400,
  [ErrorCode.AUCTION_ALREADY_CLOSED]: 400,
  [ErrorCode.AUCTION_NOT_STARTED]: 400,

  [ErrorCode.BID_TOO_LOW]: 400,
  [ErrorCode.BID_ON_OWN_AUCTION]: 400,
  [ErrorCode.BID_ALREADY_WINNER]: 400,

  [ErrorCode.PAYMENT_FAILED]: 402,
  [ErrorCode.PAYMENT_EXPIRED]: 400,
  [ErrorCode.PAYMENT_ALREADY_PROCESSED]: 409,
  [ErrorCode.INSUFFICIENT_FUNDS]: 402,
  [ErrorCode.INSUFFICIENT_BALANCE]: 400,
  [ErrorCode.PAYMENT_MISMATCH]: 400,

  [ErrorCode.ORDER_NOT_FOUND]: 404,
  [ErrorCode.ORDER_ALREADY_CANCELLED]: 409,
  [ErrorCode.ORDER_CANNOT_CANCEL]: 400,

  [ErrorCode.SHIPMENT_NOT_FOUND]: 404,
  [ErrorCode.INVALID_TRACKING_NUMBER]: 400,

  [ErrorCode.DISPUTE_NOT_FOUND]: 404,
  [ErrorCode.DISPUTE_ALREADY_RESOLVED]: 409,
  [ErrorCode.DISPUTE_WINDOW_EXPIRED]: 400,

  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.CACHE_ERROR]: 500,
};

// ===========================================
// AUDIT EVENT TYPES
// ===========================================

export enum AuditEventType {
  // Auth events
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGGED_IN = 'USER_LOGGED_IN',
  USER_LOGGED_OUT = 'USER_LOGGED_OUT',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',

  // User events
  USER_VERIFIED = 'USER_VERIFIED',
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
  USER_SETTINGS_UPDATE = 'USER_SETTINGS_UPDATE',
  USER_SELLER_ENABLED = 'USER_SELLER_ENABLED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',

  // Auction events
  AUCTION_CREATED = 'AUCTION_CREATED',
  AUCTION_PUBLISHED = 'AUCTION_PUBLISHED',
  AUCTION_UPDATED = 'AUCTION_UPDATED',
  AUCTION_CLOSED = 'AUCTION_CLOSED',
  AUCTION_CANCELLED = 'AUCTION_CANCELLED',
  AUCTION_EXTENDED = 'AUCTION_EXTENDED',

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
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

  // Shipment events
  SHIPMENT_REGISTERED = 'SHIPMENT_REGISTERED',
  SHIPMENT_UPDATED = 'SHIPMENT_UPDATED',
  SHIPMENT_DELIVERED = 'SHIPMENT_DELIVERED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',

  // Rating events
  RATING_SUBMITTED = 'RATING_SUBMITTED',
  RATING_UPDATED = 'RATING_UPDATED',

  // Dispute events
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_MESSAGE_SENT = 'DISPUTE_MESSAGE_SENT',
  DISPUTE_ESCALATED = 'DISPUTE_ESCALATED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',

  // Watchlist events
  WATCHLIST_ADD = 'WATCHLIST_ADD',
  WATCHLIST_REMOVE = 'WATCHLIST_REMOVE',
}

// ===========================================
// ENTITY TYPES
// ===========================================

export enum EntityType {
  USER = 'User',
  AUCTION = 'Auction',
  BID = 'Bid',
  ORDER = 'Order',
  PAYMENT = 'Payment',
  SHIPMENT = 'Shipment',
  RATING = 'Rating',
  DISPUTE = 'Dispute',
  SESSION = 'Session',
  WATCHLIST = 'Watchlist',
}

// ===========================================
// ACTOR TYPES
// ===========================================

export enum ActorType {
  USER = 'user',
  SYSTEM = 'system',
  ADMIN = 'admin',
}

// ===========================================
// RESULT TYPES
// ===========================================

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
}

export enum ErrorSeverity {
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

// ===========================================
// INTERFACES
// ===========================================

/**
 * Request context passed through AsyncLocalStorage
 */
export interface RequestContext {
  traceId: string;
  userId?: string;
  userState?: string;
  startTime: number;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
}

/**
 * Structured log entry format
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  env: string;
  traceId: string;
  message: string;
  context?: string;
  userId?: string;
  data?: Record<string, unknown>;
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  http?: {
    method: string;
    path: string;
    status?: number;
  };
}

/**
 * Error response format (sent to client)
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    status: number;
    timestamp: string;
    traceId: string;
    path: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Audit event input
 */
export interface AuditEventInput {
  eventType: AuditEventType;
  actorType: ActorType;
  actorUserId?: string;
  entityType: EntityType;
  entityId: string;
  result: AuditResult;
  reasonCode?: string;
  payload?: Record<string, unknown>;
}

/**
 * Error event input
 */
export interface ErrorEventInput {
  errorCode: string;
  message: string;
  severity: ErrorSeverity;
  httpStatus?: number;
  isBusinessError: boolean;
  httpMethod?: string;
  httpPath?: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Metrics data point
 */
export interface MetricPoint {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}
