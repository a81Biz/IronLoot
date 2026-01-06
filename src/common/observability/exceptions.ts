import { HttpException } from '@nestjs/common';
import { ErrorCode, ERROR_CODE_HTTP_STATUS, EntityType } from './constants';

/**
 * BusinessException
 *
 * Base exception for all business errors in the application.
 * Features:
 * - Typed error codes
 * - Automatic HTTP status mapping
 * - Entity context (type + id)
 * - Additional details
 *
 * Reference: Bases Técnicas.md Section 7
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly entityType?: EntityType,
    public readonly entityId?: string,
  ) {
    const status = ERROR_CODE_HTTP_STATUS[code] || 500;
    super({ code, message, details }, status);
  }

  /**
   * Check if this is a business error (expected) vs system error (unexpected)
   */
  isBusinessError(): boolean {
    return this.getStatus() < 500;
  }
}

// ===========================================
// GENERIC EXCEPTIONS
// ===========================================

export class ValidationException extends BusinessException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class NotFoundException extends BusinessException {
  constructor(entityType: EntityType, entityId: string) {
    super(
      ErrorCode.NOT_FOUND,
      `${entityType} not found`,
      { entityType, entityId },
      entityType,
      entityId,
    );
  }
}

export class ConflictException extends BusinessException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CONFLICT, message, details);
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message = 'Unauthorized', code = ErrorCode.UNAUTHORIZED) {
    super(code, message);
  }
}

export class ForbiddenException extends BusinessException {
  constructor(message = 'Forbidden', code = ErrorCode.FORBIDDEN) {
    super(code, message);
  }
}

// ===========================================
// AUTH EXCEPTIONS
// ===========================================

export class InvalidCredentialsException extends BusinessException {
  constructor() {
    super(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
  }
}

export class TokenExpiredException extends BusinessException {
  constructor() {
    super(ErrorCode.TOKEN_EXPIRED, 'Token has expired');
  }
}

export class TokenInvalidException extends BusinessException {
  constructor() {
    super(ErrorCode.TOKEN_INVALID, 'Invalid token');
  }
}

export class SessionExpiredException extends BusinessException {
  constructor() {
    super(ErrorCode.SESSION_EXPIRED, 'Session has expired');
  }
}

// ===========================================
// USER EXCEPTIONS
// ===========================================

export class UserNotFoundException extends BusinessException {
  constructor(userId: string) {
    super(ErrorCode.USER_NOT_FOUND, 'User not found', { userId }, EntityType.USER, userId);
  }
}

export class UserNotVerifiedException extends BusinessException {
  constructor(userId: string) {
    super(
      ErrorCode.USER_NOT_VERIFIED,
      'Email verification required',
      { userId },
      EntityType.USER,
      userId,
    );
  }
}

export class UserSuspendedException extends BusinessException {
  constructor(userId: string, reason?: string) {
    super(
      ErrorCode.USER_SUSPENDED,
      'Account suspended',
      { userId, reason },
      EntityType.USER,
      userId,
    );
  }
}

export class UserBannedException extends BusinessException {
  constructor(userId: string, reason?: string) {
    super(ErrorCode.USER_BANNED, 'Account banned', { userId, reason }, EntityType.USER, userId);
  }
}

export class EmailAlreadyExistsException extends BusinessException {
  constructor() {
    super(ErrorCode.EMAIL_ALREADY_EXISTS, 'Email already registered');
  }
}

// ===========================================
// AUCTION EXCEPTIONS
// ===========================================

export class AuctionNotFoundException extends BusinessException {
  constructor(auctionId: string) {
    super(
      ErrorCode.AUCTION_NOT_FOUND,
      'Auction not found',
      { auctionId },
      EntityType.AUCTION,
      auctionId,
    );
  }
}

export class AuctionNotActiveException extends BusinessException {
  constructor(auctionId: string, currentStatus: string) {
    super(
      ErrorCode.AUCTION_NOT_ACTIVE,
      'Auction is not active',
      { auctionId, currentStatus },
      EntityType.AUCTION,
      auctionId,
    );
  }
}

export class AuctionAlreadyClosedException extends BusinessException {
  constructor(auctionId: string) {
    super(
      ErrorCode.AUCTION_ALREADY_CLOSED,
      'Auction has already closed',
      { auctionId },
      EntityType.AUCTION,
      auctionId,
    );
  }
}

export class AuctionNotStartedException extends BusinessException {
  constructor(auctionId: string, startsAt: Date) {
    super(
      ErrorCode.AUCTION_NOT_STARTED,
      'Auction has not started yet',
      { auctionId, startsAt: startsAt.toISOString() },
      EntityType.AUCTION,
      auctionId,
    );
  }
}

// ===========================================
// BID EXCEPTIONS
// ===========================================

export class BidTooLowException extends BusinessException {
  constructor(auctionId: string, bidAmount: number, minimumBid: number) {
    super(
      ErrorCode.BID_TOO_LOW,
      `Bid must be at least ${minimumBid}`,
      { auctionId, bidAmount, minimumBid },
      EntityType.AUCTION,
      auctionId,
    );
  }
}

export class BidOnOwnAuctionException extends BusinessException {
  constructor(auctionId: string) {
    super(
      ErrorCode.BID_ON_OWN_AUCTION,
      'Cannot bid on your own auction',
      { auctionId },
      EntityType.AUCTION,
      auctionId,
    );
  }
}

export class BidAlreadyWinnerException extends BusinessException {
  constructor(auctionId: string) {
    super(
      ErrorCode.BID_ALREADY_WINNER,
      'You are already the highest bidder',
      { auctionId },
      EntityType.AUCTION,
      auctionId,
    );
  }
}

// ===========================================
// PAYMENT EXCEPTIONS
// ===========================================

export class PaymentFailedException extends BusinessException {
  constructor(orderId: string, reason?: string) {
    super(
      ErrorCode.PAYMENT_FAILED,
      'Payment failed',
      { orderId, reason },
      EntityType.ORDER,
      orderId,
    );
  }
}

export class PaymentExpiredException extends BusinessException {
  constructor(orderId: string) {
    super(
      ErrorCode.PAYMENT_EXPIRED,
      'Payment window has expired',
      { orderId },
      EntityType.ORDER,
      orderId,
    );
  }
}

export class PaymentAlreadyProcessedException extends BusinessException {
  constructor(paymentId: string) {
    super(
      ErrorCode.PAYMENT_ALREADY_PROCESSED,
      'Payment has already been processed',
      { paymentId },
      EntityType.PAYMENT,
      paymentId,
    );
  }
}

// ===========================================
// ORDER EXCEPTIONS
// ===========================================

export class OrderNotFoundException extends BusinessException {
  constructor(orderId: string) {
    super(ErrorCode.ORDER_NOT_FOUND, 'Order not found', { orderId }, EntityType.ORDER, orderId);
  }
}

export class OrderCannotCancelException extends BusinessException {
  constructor(orderId: string, currentStatus: string) {
    super(
      ErrorCode.ORDER_CANNOT_CANCEL,
      'Order cannot be cancelled in current status',
      { orderId, currentStatus },
      EntityType.ORDER,
      orderId,
    );
  }
}

// ===========================================
// SHIPMENT EXCEPTIONS
// ===========================================

export class ShipmentNotFoundException extends BusinessException {
  constructor(shipmentId: string) {
    super(
      ErrorCode.SHIPMENT_NOT_FOUND,
      'Shipment not found',
      { shipmentId },
      EntityType.SHIPMENT,
      shipmentId,
    );
  }
}

export class InvalidTrackingNumberException extends BusinessException {
  constructor(trackingNumber: string) {
    super(ErrorCode.INVALID_TRACKING_NUMBER, 'Invalid tracking number format', { trackingNumber });
  }
}

// ===========================================
// DISPUTE EXCEPTIONS
// ===========================================

export class DisputeNotFoundException extends BusinessException {
  constructor(disputeId: string) {
    super(
      ErrorCode.DISPUTE_NOT_FOUND,
      'Dispute not found',
      { disputeId },
      EntityType.DISPUTE,
      disputeId,
    );
  }
}

export class DisputeAlreadyResolvedException extends BusinessException {
  constructor(disputeId: string) {
    super(
      ErrorCode.DISPUTE_ALREADY_RESOLVED,
      'Dispute has already been resolved',
      { disputeId },
      EntityType.DISPUTE,
      disputeId,
    );
  }
}

export class DisputeWindowExpiredException extends BusinessException {
  constructor(orderId: string) {
    super(
      ErrorCode.DISPUTE_WINDOW_EXPIRED,
      'Dispute window has expired',
      { orderId },
      EntityType.ORDER,
      orderId,
    );
  }
}

// ===========================================
// EXTERNAL SERVICE EXCEPTIONS
// ===========================================

export class ExternalServiceException extends BusinessException {
  constructor(serviceName: string, message: string, details?: Record<string, unknown>) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, `${serviceName}: ${message}`, {
      serviceName,
      ...details,
    });
  }
}

export class DatabaseException extends BusinessException {
  constructor(operation: string, details?: Record<string, unknown>) {
    super(ErrorCode.DATABASE_ERROR, `Database error during ${operation}`, details);
  }
}

export class CacheException extends BusinessException {
  constructor(operation: string, details?: Record<string, unknown>) {
    super(ErrorCode.CACHE_ERROR, `Cache error during ${operation}`, details);
  }
}
