---
ptsa_version: 3.0
fase: F1
nombre: Mapa del Sistema
estado: COMPLETADA
ultima_actualizacion: 2026-06-23
confidence: 92
sesion: S-001
---

# F1 — Mapa del Sistema

**Sistema:** IronLoot v1.0.0  
**Fecha:** 2026-06-23  
**Fuente:** `src/api/src/app.module.ts`, `src/apps/*/src/app.controller.ts`, `src/nginx/nginx.conf`, `docs/enterprise-documentation/06-Backend-Architecture.md`

---

## 1. Flujo de Requests — Diagrama Mermaid

```mermaid
graph TB
    Browser["Browser / Cliente"]

    subgraph "Reverse Proxy (nginx :80)"
        NGINX["NGINX"]
    end

    subgraph "SSR Services"
        BASE["BASE :5174\nNestJS SSR\nSitio Público"]
        CLIENT["CLIENT :5175\nNestJS SSR\nPortal Privado"]
        ADMIN["ADMIN :3001\nNestJS SSR\nBackoffice"]
    end

    subgraph "API Core (:3000)"
        CM["ContextMiddleware\n(traceId, AsyncLocalStorage)"]
        TG["ThrottlerGuard\n(100 req/min global)"]
        JAG["JwtAuthGuard\n(global APP_GUARD)"]
        CTRL["Controllers\n(ValidationPipe)"]
        SVC["Feature Services\n(Business Logic)"]
        AUDIT["AuditedAction\n(post-execution)"]
        RI["ResponseInterceptor\n(RequestLog)"]
        GEF["GlobalExceptionFilter\n(ErrorEvent)"]
        PRISMA["PrismaService"]
        REDIS["DistributedLockService"]
        SCHED["AuctionSchedulerService\n(cron cada 60s)"]
    end

    subgraph "Data Layer"
        PSQL["PostgreSQL :5432"]
        RED["Redis :6379"]
        MAIL["Mailhog :1025"]
    end

    Browser -->|"HTTP / WebSocket"| NGINX
    NGINX -->|"base.ironloot.local"| BASE
    NGINX -->|"client.ironloot.local"| CLIENT
    NGINX -->|"admin.ironloot.local"| ADMIN
    NGINX -->|"api.ironloot.local"| CM

    BASE -->|"BFF: fetch + Bearer token\n(server-side)"| CM
    ADMIN -->|"x-api-key header\n(server-side)"| CM

    CLIENT -->|"BFF: fetch + Bearer token\n(server-side para SSR)"| CM
    Browser -->|"DIRECTO: fetch(apiUrl)\n(browser JS, sin BFF proxy)"| CM

    CM --> TG --> JAG --> CTRL --> SVC --> AUDIT --> RI
    SVC --> PRISMA --> PSQL
    SVC --> REDIS --> RED
    SVC -.->|"Notificaciones email"| MAIL
    GEF -.->|"captura excepciones"| RI

    SCHED -->|"lock:auction-close"| REDIS
    SCHED --> SVC
```

**⚠️ OBSERVACIÓN CLAVE (ND-007):** El sitio CLIENT pasa `apiUrl` a los templates Nunjucks. Los scripts JavaScript del browser en CLIENT pueden llamar directamente al API (`fetch(apiUrl + endpoint)`) sin pasar por el proxy BFF server-side. Esto crea una ruta de llamadas directas browser→API cuyo mecanismo de autenticación no está completamente verificado. Se registra como candidato a hallazgo D2/D3.

---

## 2. Dependencias de Módulos — Diagrama Mermaid

```mermaid
graph LR
    subgraph "AppModule (API)"
        direction TB
        CFG[ConfigModule] --> AUTH
        THROTT[ThrottlerModule] --> CTRL2[Controllers]
        OBS[ObservabilityModule] --> ALL[All Modules]
        DB[DatabaseModule] --> ALL
        BULL[BullModule] --> NOTIF

        AUTH[AuthModule] --> USERS[UsersModule]
        AUTH --> WALLET[WalletModule]

        BID[BidsModule] --> WALLET
        BID --> AUC[AuctionsModule]
        BID --> NOTIF[NotificationsModule]

        AUC --> WALLET
        AUC --> BID

        SCHED2[SchedulerModule] --> AUC
        SCHED2 --> WALLET
        SCHED2 --> ORDERS[OrdersModule]
        SCHED2 --> NOTIF
        SCHED2 --> LOCK[DistributedLockService]

        ORDERS --> WALLET
        ORDERS --> COMM[CommissionsModule]
        ORDERS --> CFDI2[CfdiModule]

        PAY[PaymentsModule] --> WALLET
        PAY --> ORDERS

        DISP[DisputesModule] --> ORDERS

        SHIP[ShipmentsModule] --> ORDERS
        SHIP --> NOTIF

        RATE2[RatingsModule] --> ORDERS

        AUDIT2[AuditModule] --> DB
    end
```

---

## 3. Confrontación con Documentación

| Afirmación documentada | Fuente doc | Verificado | Observación |
|:---|:---|:--:|:---|
| BFF: JWT en HttpOnly cookie → extraído server-side | 09-Security-Architecture.md | ✅ | `getToken(req)` extrae de `req.cookies.access_token` |
| CLIENT NO expone token al JS del browser | 09-Security-Architecture.md | ⚠️ | CLIENT pasa `apiUrl` a templates; JS del browser puede hacer fetch directo |
| ThrottlerModule usa backend Redis | (implícito en multi-instance) | ❌ | `ThrottlerModule.forRootAsync` sin `ThrottlerStorageRedis` — usa memoria (ND-002) |
| API global APP_GUARD = JwtAuthGuard | 06-Backend-Architecture.md | ✅ | Confirmado en `app.module.ts:140-151` |
| Audit: RequestLog por cada request | 03-TRD.md | ✅ | `ResponseInterceptor` / `RequestLogInterceptor` en pipeline |
| Distributed lock en scheduler | 03-TRD.md | ✅ | `DistributedLockService.acquireLock('lock:auction-close', 60)` |
| Admin usa `x-api-key` en todos los calls | 06-Backend-Architecture.md | ✅ | `AdminApiClient` inyecta header en cada call |

---

## 4. Desvíos doc↔realidad (candidatos D4)

| ID | Desvío | Severidad probable |
|:---|:---|:---|
| D4-CAN-001 | 09-Security-Architecture.md afirma que CLIENT JS nunca tiene acceso a JWT — pero `apiUrl` en templates permite fetch directo | MEDIA |
| D4-CAN-002 | ThrottlerModule documentado como protección multi-instancia — pero sin Redis backend es solo efectivo en instancia única | MEDIA |

Estos candidatos se convertirán en hallazgos en F5/F7 con evidencia formal.

---

## Checklist F1 ✅

- [x] Diagrama Mermaid de flujo de requests (entrada → router → handler → producto)
- [x] Diagrama Mermaid de dependencias de módulos
- [x] Confrontación con diagramas documentados → desvíos listados (2 candidatos)

**Estado: COMPLETADA** | Confidence: 92%
