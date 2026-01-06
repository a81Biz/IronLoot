## [0.1.1] - 2026-01-06

### Added
- **WalletModule**: Sistema de cuenta del usuario con saldo disponible y retenido.
- **Ledger**: Registro inmutable de movimientos financieros.
- Documentación completa en `docs/05-wallet/`.


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-06

### Added
-   **Core Modules**: Auth, Users, Auctions, Bids, Orders, Payments, Shipments, Ratings, Disputes, Notifications.
-   **Observability**: Integrated logging, auditing, and error tracking with custom decorators.
-   **Documentation**: Detailed API reference and product documentation.
-   **Testing Infrastructure**: Unit and E2E test setup with Jest.
-   **Docker Support**: Multi-stage Dockerfile and Docker Compose setup for development.

### Security
-   Implemented strict Rate Limiting.
-   Added Helmet for HTTP header security.
-   JWT Authentication for all protected routes.

### Infrastructure
-   Prisma ORM for PostgreSQL.
-   Redis integration for caching and queues (pending full implementation).
