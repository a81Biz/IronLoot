# Registro de Hallazgos — IronLoot (Oficial)

| Metadato | Valor |
|---|---|
| **Origen** | Promoción de `audit/deliverables/01-Registro-de-Hallazgos.md` a documentación oficial |
| **Fuente** | `audit/raw/A..F` (evidencia `archivo:línea`) + código `src/`, `prisma/`, `graphify-out/` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | Todos los de auditoría; ver detalle completo con evidencia en `audit/deliverables/01-Registro-de-Hallazgos.md` |
| **Código usado** | api, base, client, admin, core, prisma, docker, nginx |
| **Nivel de confianza** | Alto |

> **✅ REMEDIADO (2026-07-23):** 36/36 hallazgos corregidos y **fusionados a master** (PTs 036–047). Cierres finales (PT-047): **AUD-016** → interruptor `CFDI_ENABLED` (OFF por defecto; `generate()` responde 503 claro y el admin lo prende/apaga desde la UI); la integración real del PAC queda como dependencia externa a contratar. **AUD-028** → scripts de CI en el `package.json` raíz. **AUD-033** → código muerto eliminado. Detalle: [../Informe-Remediacion.md](../Informe-Remediacion.md). La tabla inferior conserva el estado original de la auditoría; la columna de recomendación indica el PT que lo resolvió.
>
> **Estado real, no ideal.** 36 hallazgos entre documentación y realidad. En conflicto doc↔código **gana el código**. Los hallazgos de dominio/seguridad **no se cierran** sin validación humana ni evidencia post-fix (se corrigen bajo FDGE). El **detalle completo por hallazgo** (descripción, ubicación, evidencia, impacto, recomendación) está en `audit/deliverables/01-Registro-de-Hallazgos.md`; aquí queda el registro canónico resumido.

## Distribución

| Severidad | Nº |
|---|---|
| CRÍTICA | 5 |
| ALTA | 11 |
| MEDIA | 13 |
| BAJA | 7 |
| **Total** | **36** |

## Registro

| ID | Sev | Título | Regla/ADR | Recomendación (resumen) |
|---|---|---|---|---|
| AUD-001 | CRÍTICA | ~46% de modelos sin migración (`db push`) — real 11/28 + drift de columnas | ADR-006 | Generar migración de reconciliación; prohibir `db push` — **PT-037 CLOSED (pendiente merge + baseline en dev)** |
| AUD-002 | CRÍTICA | Flujo de puja roto en UI (sin página ni cliente WS) | UC-05, ADR-015 | Implementar página de puja + Socket.io en CLIENT |
| AUD-003 | CRÍTICA | 8 escrituras CLIENT sin ruta de auth (cross-origin) | ADR-003 | Añadir proxy BFF a CLIENT — **PT-038 CLOSED (validado; pendiente merge)** |
| AUD-004 | CRÍTICA | Admin creds por defecto + login sin throttle | RN-53, ADR-005 | Falla de arranque con placeholders; throttle login admin — **PT-036 CLOSED (validado; pendiente merge a master)** |
| AUD-005 | CRÍTICA | Doble mecanismo de comisión (fijo vs configurable) | RN-31 | Unificar en un único mecanismo canónico |
| AUD-006 | ALTA | WebSocket sin autenticación | RN-55, ADR-015 | Re-activar guard / autenticar handshake |
| AUD-007 | ALTA | ADMIN sin Helmet/CSP ni CSRF | RN-54, ADR-005 | Añadir helmet+CSP+CSRF al backoffice |
| AUD-008 | ALTA | `payments.currency` default DB `USD` | RN-27, ADR-007 | Migración `DEFAULT 'MXN'` en payments — **incluido en PT-037 CLOSED** |
| AUD-009 | ALTA | Incremento mínimo de puja no aplicado | RN-14, ADR-011 | Aplicar `AUCTION_MIN_INCREMENT_AMOUNT` en validación |
| AUD-010 | ALTA | Resolución de disputa no mueve dinero | RN-41, UC-19 | Documentar proceso manual o automatizar refund |
| AUD-011 | ALTA | Admin salta las máquinas de estado | RN-33, ADR-008 | Enrutar mutaciones admin por FSM core |
| AUD-012 | ALTA | Use-cases core probados pero no cableados | ADR-008 | Cablear use-cases o retirar código muerto |
| AUD-013 | ALTA | commissions/refunds sin tests | RN-31/42 | Tests de comisión, over-refund, estado inválido |
| AUD-014 | ALTA | Contradicción CSRF (doc vs código) | RN-54 | Definir postura real y unificar doc |
| AUD-015 | ALTA | Invariante held-funds incorrecta en PTSA F-1 | RN-21 | Corregir F-1; enunciar invariante correcta |
| AUD-016 | ALTA | CFDI/PAC no funcional (stub) | UC-23 | Mantener pendiente bloqueante explícito |
| AUD-017 | MEDIA | No existe script de seed | — | Crear seed o retirar `db:seed` |
| AUD-018 | MEDIA | Crons de limpieza en conflicto (90d/30d) | RN-60, ADR-018 | Unificar retención de audit |
| AUD-019 | MEDIA | `UserPaymentMethod` sin documentar | — | Documentar en Modelo de Datos |
| AUD-020 | MEDIA | `10-Technical-Debt` obsoleto | — | Actualizar/archivar (resuelto en docs-v2) |
| AUD-021 | MEDIA | PTSA incoherente (CR#, H-005↔P-009, cards BORRADOR) | — | Corregir referencias PTSA |
| AUD-022 | MEDIA | Conteo módulos API 27 vs 23 | — | Aclarar 27 dirs vs enumeración |
| AUD-023 | MEDIA | HeyBanco no documentado | ADR-013 | Documentar 3er proveedor + env |
| AUD-024 | MEDIA | "Carrier tracking" sobredimensionado | RN-35 | Describir como captura manual |
| AUD-025 | MEDIA | Diagnostics restringido sólo por DevOnlyGuard | — | Restringir/retirar en prod |
| AUD-026 | MEDIA | CLIENT revalida JWT con secreto compartido débil | ADR-004 | Endurecer `JWT_SECRET`; evaluar validación |
| AUD-027 | MEDIA | Dos rutas de config SMTP | — | Unificar `MAIL_*`/`SMTP_*` |
| AUD-028 | MEDIA | CI en raíz sin scripts; husky sólo API | — | Validar/corregir CI y hooks |
| AUD-029 | MEDIA | No existe glosario único | — | Resuelto: Diccionario Maestro en docs-v2 |
| AUD-030 | BAJA | Convención JS `public/js/pages/` inexistente | ADR-002 | Corregir 11-Conventions |
| AUD-031 | BAJA | Skew de estado FDGE; CHANGELOG en 0.5.1 | — | Reconciliar tracking; retomar CHANGELOG |
| AUD-032 | BAJA | Plantilla huérfana + enlaces muertos + puerto admin | — | Limpiar rutas/enlaces |
| AUD-033 | BAJA | Endpoint manual de orden deshabilitado | — | Retirar código muerto |
| AUD-034 | BAJA | Versionado no unificado en monorepo | ADR-001 | Definir política de versiones |
| AUD-035 | BAJA | Cookie maxAge vs JWT TTL no reconciliados | RN-02 | Documentar ambos ejes juntos |
| AUD-036 | BAJA | Acoplamiento cruzado admin↔client helpers | — | Extraer helper compartido |

## Reglas de gobierno de este registro

- **Inmutabilidad auditable:** los hallazgos se cierran, no se borran. Al corregirse bajo FDGE, se marca `VALIDATION_PENDING`→`CLOSED` con evidencia post-fix.
- **Supremacía de dominio:** los hallazgos de dominio (AUD-002, 005, 009, 010, 016) tienen prioridad sobre los técnicos a igualdad de severidad.
- **Sin auto-cierre:** ningún hallazgo de bug/dominio se cierra sin validación humana.
