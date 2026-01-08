# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2026-01-08

### Added
-   **Frontend**: Implemented strictly server-side rendered `RequireAuth` guard for protected routes.
-   **Frontend**: Added fully functional **Watchlist** system (`/watchlist` and `GET/POST/DELETE /api/v1/watchlist`).
-   **Frontend**: Added **User Settings** page (`/settings`) for profile, notifications, and language preferences.
-   **Frontend**: Implemented `UserMiddleware` to inject session data into server-side templates.
-   **API**: Added Watchlist Module (`WatchlistController`, `WatchlistService`).
-   **API**: Added User Settings endpoints (`GET/PATCH /users/me/settings`).

### Fixed
-   **Frontend**: Resolved login loop and auth inconsistency issues by synchronizing cookies for SSR interactions.
-   **Frontend**: Enforced strict route protection rules according to Spec v0.2.3.
-   **Frontend**: Fixed `api-client.js` to correctly propagate `Authorization` headers for Watchlist and Settings API calls.

## [0.2.0] - 2026-01-07

### Added
- **Frontend**: Successfully restored and stabilized the NestJS/Nunjucks server-side rendered frontend.
- **Wallet**: Implemented `/wallet` view with balance display and deposit/withdraw modals.
- **Auth**: Completed full authentication lifecycle including Registration, Email Verification, and Login.
- **Dashboard**: Added `/dashboard` view with user-specific data placeholders.
- **DevOps**: Added `http-proxy-middleware` to `web` service for seamless local development against Dockerized API.

### Changed
- **API**: Increased Rate Limiting quotas for `development` environment (60 req/min) vs `production` (5 req/min).
- **Web**: Updated `api-client.js` to handle token verification via POST body instead of query params.
- **Web**: Enhanced `navigation.js` to dynamically toggle Auth/User menu states based on JWT presence.

### Fixed
- **API**: Resolved 504 Gateway Timeout issues during registration by adjusting local proxy settings.
- **Web**: Fixed `verify-email` flow where the token was not being correctly transmitted to the API.

## [0.1.0] - 2025-12-25

### Added
- Initial release of the Iron Loot API.
- Core modules: Auth, Users, Auctions, Bids.
- PostgreSQL integration with Prisma.
- Redis integration for caching and queues.
- Basic Docker setup.
