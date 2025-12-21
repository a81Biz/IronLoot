import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error Codes
 *
 * Standardized error codes for the application.
 * Each code maps to a specific business or system error.
 *
 * Naming convention:
 * - MODULE_ACTION_REASON (e.g., BID_PLACEMENT_TOO_LOW)
 *
 * Reference: Bases Técnicas.md (Sección 7 - Clasificación de errores)
 */
export enum ErrorCode {
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Auth errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  SESSION_INVALID = 'AUTH_SESSION_INVALID',

  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_NOT_VERIFIED = 'USER_NOT_VERIFIED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',
  EMAIL_ALREADY_EXISTS = 'USER_EMAIL_EXISTS',
  SELLER_NOT_ENABLED = 'USER_SELLER_NOT_ENABLED',

  // Auction errors
  AUCTION_NOT_FOUND = 'AUCTION_NOT_FOUND',
  AUCTION_NOT_ACTIVE = 'AUCTION_NOT_ACTIVE',
  AUCTION_CLOSED = 'AUCTION_CLOSED',
  AUCTION_CANCELLED = 'AUCTION_CANCELLED',
  AUCTION_INVALID_STATE = 'AUCTION_INVALID_STATE',
  AUCTION_OWNED_BY_USER = 'AUCTION_OWNED_BY_USER',

  // Bid errors
  BID_TOO_LOW = 'BID_TOO_LOW',
  BID_BELOW_INCREMENT = 'BID_BELOW_INCREMENT',
  BID_ON_OWN_AUCTION = 'BID_ON_OWN_AUCTION',
  BID_AUCTION_CLOSED = 'BID_AUCTION_CLOSED',
  BID_USER_BLOCKED = 'BID_USER_BLOCKED',

  // Order errors
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_INVALID_STATE = 'ORDER_INVALID_STATE',
  ORDER_PAYMENT_EXPIRED = 'ORDER_PAYMENT_EXPIRED',

  // Payment errors
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',

  // Dispute errors
  DISPUTE_NOT_FOUND = 'DISPUTE_NOT_FOUND',
  DISPUTE_WINDOW_CLOSED = 'DISPUTE_WINDOW_CLOSED',
  DISPUTE_ALREADY_EXISTS = 'DISPUTE_ALREADY_EXISTS',
  DISPUTE_INVALID_STATE = 'DISPUTE_INVALID_STATE',
}

/**
 * BusinessException
 *
 * Base exception for all business logic errors.
 * Provides consistent structure for error handling and logging.
 *
 * Key features:
 * - Typed error code
 * - Optional details object
 * - Automatic HTTP status mapping
 * - Serialization for logging
 */
export class BusinessException extends HttpException {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, any>;

  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, any>,
  ) {
    super(message, status);
    this.code = code;
    this.details = details;
  }

  /**
   * Create exception with context (entity information)
   */
  static withContext(
    code: ErrorCode,
    message: string,
    context: {
      entityType?: string;
      entityId?: string;
      [key: string]: any;
    },
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ): BusinessException {
    return new BusinessException(code, message, status, context);
  }
}

// ============================================
// Specialized Exception Classes
// ============================================

/**
 * Unauthorized exception
 */
export class UnauthorizedException extends BusinessException {
  constructor(message = 'No autorizado', details?: Record<string, any>) {
    super(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED, details);
  }
}

/**
 * Forbidden exception
 */
export class ForbiddenException extends BusinessException {
  constructor(message = 'Acceso denegado', details?: Record<string, any>) {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN, details);
  }
}

/**
 * Not found exception
 */
export class NotFoundException extends BusinessException {
  constructor(entityType: string, entityId?: string) {
    const message = entityId
      ? `${entityType} con ID ${entityId} no encontrado`
      : `${entityType} no encontrado`;
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND, { entityType, entityId });
  }
}

/**
 * Validation exception
 */
export class ValidationException extends BusinessException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }
}

/**
 * Conflict exception (for duplicate resources, etc.)
 */
export class ConflictException extends BusinessException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT, details);
  }
}

// ============================================
// Domain-Specific Exceptions
// ============================================

/**
 * Bid-related exceptions
 */
export class BidTooLowException extends BusinessException {
  constructor(currentPrice: number, minBid: number, auctionId: string) {
    super(
      ErrorCode.BID_TOO_LOW,
      `La puja debe ser al menos ${minBid}. Precio actual: ${currentPrice}`,
      HttpStatus.CONFLICT,
      { currentPrice, minBid, auctionId },
    );
  }
}

export class AuctionNotActiveException extends BusinessException {
  constructor(auctionId: string, status: string) {
    super(
      ErrorCode.AUCTION_NOT_ACTIVE,
      `La subasta no está activa. Estado actual: ${status}`,
      HttpStatus.CONFLICT,
      { auctionId, status },
    );
  }
}

/**
 * User verification exception
 */
export class UserNotVerifiedException extends BusinessException {
  constructor(userId: string, requiredLevel: string) {
    super(
      ErrorCode.USER_NOT_VERIFIED,
      `Se requiere verificación de nivel ${requiredLevel} para esta acción`,
      HttpStatus.FORBIDDEN,
      { userId, requiredLevel },
    );
  }
}

/**
 * Payment exception
 */
export class PaymentExpiredException extends BusinessException {
  constructor(orderId: string, expiredAt: Date) {
    super(
      ErrorCode.PAYMENT_EXPIRED,
      'El plazo de pago ha expirado',
      HttpStatus.GONE, // 410 Gone
      { orderId, expiredAt: expiredAt.toISOString() },
    );
  }
}
