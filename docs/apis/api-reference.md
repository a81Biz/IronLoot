# API Reference

This document provides a high-level overview of the available API endpoints in the Iron Loot platform.

## 1. Authentication (`/auth`)
- **POST** `/auth/register`: Register a new user account.
- **POST** `/auth/login`: Authenticate a user and return JWT tokens.
- **POST** `/auth/refresh`: Refresh an expired access token using a refresh token.
- **POST** `/auth/logout`: Revoke user session(s).
- **POST** `/auth/verify-email`: Verify user's email address using a token.
- **POST** `/auth/forgot-password`: Request a password reset email.
- **POST** `/auth/reset-password`: Reset password using a token.
- **POST** `/auth/change-password`: Change the password for the authenticated user.
- **POST** `/auth/me`: Get the current authenticated user's information.

## 2. Users (`/users`)
- **GET** `/users/me`: Get full profile of the current user.
- **PATCH** `/users/me`: Update current user's profile.
- **GET** `/users/me/stats`: Get statistics about the user's activity.
- **GET** `/users/me/verification-status`: Check seller eligibility and verification status.
- **POST** `/users/me/resend-verification`: Resend the email verification link.
- **POST** `/users/me/enable-seller`: Request to enable seller status.
- **GET** `/users/:id`: Get the public profile of another user.

## 3. Auctions (`/auctions`)
- **POST** `/auctions`: Create a new auction (Draft).
- **GET** `/auctions`: List auctions with optional filtering (status, seller).
- **GET** `/auctions/:id`: Get detailed information about a specific auction.
- **PATCH** `/auctions/:id`: Update auction details (only in Draft).
- **POST** `/auctions/:id/publish`: Publish a Draft auction to make it active.

## 4. Bids (`/auctions/:auctionId/bids`)
- **POST** `/auctions/:auctionId/bids`: Place a bid on an active auction.
- **GET** `/auctions/:auctionId/bids`: Get the bid history for a specific auction.

## 5. Orders (`/orders`)
- **POST** `/orders`: Create an order from a won auction (Checkout initialization).
- **GET** `/orders`: List all orders where the user is the buyer.
- **GET** `/orders/:id`: Get details of a specific order.

## 6. Payments (`/payments`)
- **POST** `/payments/checkout`: Initiate a checkout session (generates payment link).
- **POST** `/payments/webhook/:provider`: Webhook endpoint for receiving payment provider updates.

## 7. Shipments (`/shipments`)
- **POST** `/shipments`: Register a shipment for a paid order (Seller only).
- **GET** `/shipments/:id`: Get shipment tracking details.
- **PATCH** `/shipments/:id/status`: Update the status of a shipment (Seller only).

## 8. Ratings (`/ratings`)
- **POST** `/ratings`: Rate a completed transaction.
- **GET** `/users/:userId/ratings`: Get all ratings received by a specific user.

## 9. Disputes (`/disputes`)
- **POST** `/disputes`: Open a new dispute for an order.
- **GET** `/disputes`: List all disputes related to the user.
- **GET** `/disputes/:id`: Get details of a specific dispute.

## 10. Notifications (`/notifications`)
- **GET** `/notifications`: List in-app notifications for the user.
- **GET** `/notifications/unread-count`: Get the count of unread notifications.
- **PATCH** `/notifications/read-all`: Mark all notifications as read.
- **PATCH** `/notifications/:id/read`: Mark a specific notification as read.

## 11. Wallet (`/wallet`)
- **GET** `/wallet/balance`: Get current available and held balance.
- **POST** `/wallet/deposit`: Deposit funds into the wallet.
- **POST** `/wallet/withdraw`: Withdraw funds from the wallet.
- **GET** `/wallet/history`: Get transaction history (ledger).

## 12. Health (`/health`)
- **GET** `/health`: Basic health check (returns "OK" if service is up).
- **GET** `/health/detailed`: Detailed health check including database and dependency status.

## 13. Diagnostics (`/diagnostics`)
- **GET** `/diagnostics/ping`: Simple ping for latency checks.
- **GET** `/diagnostics/errors`: Retrieve recent system errors from the database.
- **GET** `/diagnostics/errors/trace/:traceId`: Get errors associated with a specific trace ID.
- **GET** `/diagnostics/audit`: Retrieve recent audit logs.
- **GET** `/diagnostics/audit/entity/:type/:id`: Get audit history for a specific entity.
- **GET** `/diagnostics/requests`: Retrieve recent HTTP request logs.
- **GET** `/diagnostics/requests/slow`: specific endpoint for identifying slow requests.
- **GET** `/diagnostics/metrics`: Get a snapshot of system metrics.
- **GET** `/diagnostics/stats`: Get high-level database statistics.
