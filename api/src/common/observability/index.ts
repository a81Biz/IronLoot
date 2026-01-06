// ===========================================
// OBSERVABILITY MODULE EXPORTS
// ===========================================

// Module
export { ObservabilityModule } from './observability.module';

// Constants & Types
export {
  // Log levels
  LogLevel,
  LOG_LEVEL_PRIORITY,

  // Error codes
  ErrorCode,
  ERROR_CODE_HTTP_STATUS,

  // Audit types
  AuditEventType,
  EntityType,
  ActorType,
  AuditResult,
  ErrorSeverity,

  // Interfaces
  RequestContext,
  LogEntry,
  ErrorResponse,
  AuditEventInput,
  ErrorEventInput,
  MetricPoint,
} from './constants';

// Services
export { RequestContextService } from './request-context.service';
export { StructuredLogger, ChildLogger, LogOptions } from './logger.service';
export { MetricsService, MetricType } from './metrics.service';

// Exceptions
export {
  BusinessException,
  ValidationException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,

  // Auth
  InvalidCredentialsException,
  TokenExpiredException,
  TokenInvalidException,
  SessionExpiredException,

  // User
  UserNotFoundException,
  UserNotVerifiedException,
  UserSuspendedException,
  UserBannedException,
  EmailAlreadyExistsException,

  // Auction
  AuctionNotFoundException,
  AuctionNotActiveException,
  AuctionAlreadyClosedException,
  AuctionNotStartedException,

  // Bid
  BidTooLowException,
  BidOnOwnAuctionException,
  BidAlreadyWinnerException,

  // Payment
  PaymentFailedException,
  PaymentExpiredException,
  PaymentAlreadyProcessedException,

  // Order
  OrderNotFoundException,
  OrderCannotCancelException,

  // Shipment
  ShipmentNotFoundException,
  InvalidTrackingNumberException,

  // Dispute
  DisputeNotFoundException,
  DisputeAlreadyResolvedException,
  DisputeWindowExpiredException,

  // External
  ExternalServiceException,
  DatabaseException,
  CacheException,
} from './exceptions';

// Decorators
export {
  Log,
  SkipLog,
  Audit,
  Entity,
  SlowThreshold,
  LoggedEndpoint,
  AuditedAction,

  // Metadata types
  LogMetadata,
  AuditMetadata,
  EntityMetadata,

  // Metadata keys (for advanced use)
  LOG_METADATA_KEY,
  AUDIT_METADATA_KEY,
  ENTITY_METADATA_KEY,
  SKIP_LOG_METADATA_KEY,
  SLOW_THRESHOLD_METADATA_KEY,
} from './decorators';

// Filter & Interceptor
export { GlobalExceptionFilter, ErrorPersistFn } from './exception.filter';
export {
  ObservabilityInterceptor,
  AuditPersistFn,
  RequestLogPersistFn,
} from './observability.interceptor';

// Middleware
export { ContextMiddleware, getTraceId } from './context.middleware';
