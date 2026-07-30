# Registro de Hallazgos — IronLoot (Oficial)

| Metadato | Valor |
|---|---|
| **Origen** | Promoción de `audit/deliverables/01-Registro-de-Hallazgos.md` a documentación oficial |
| **Fuente** | `audit/raw/A..F` (evidencia `archivo:línea`) + código `src/`, `prisma/`, `graphify-out/` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | Todos los de auditoría; ver detalle completo con evidencia en `audit/deliverables/01-Registro-de-Hallazgos.md` |
| **Código usado** | api, base, client, admin, core, prisma, docker, nginx |
| **Nivel de confianza** | Alto |

> **⚠ REVISADO EL 2026-07-29 (PT-189) — «36/36» no era exacto.**
>
> Esta cabecera decía **«36/36 hallazgos corregidos y fusionados a master»**. Se midieron 13 contra el código
> y la base, y **tres siguen abiertos**:
>
> | Hallazgo | Lo que dice el código hoy |
> |---|---|
> | **AUD-010** | Resolver una disputa **no mueve dinero**: `resolveDisputeFavorBuyer` devuelve `note: 'Initiate refund via POST /admin/refunds'`. El movimiento es un paso manual aparte |
> | **AUD-012** | El VO `Money` existe en `@ironloot/core` y **ningún servicio del API lo importa** |
> | **AUD-027** | `SMTP_*` sigue existiendo junto a `MAIL_*` en `system-config.service.ts` |
>
> **AUD-016** (CFDI) la propia cabecera ya lo matizaba, y es correcto: hay interruptor y el PAC es dependencia
> externa. Es H-005, aceptado como limitación declarada de v1.0.
>
> ## Los ocho que faltaban, medidos también (2026-07-29, tarde)
>
> | Hallazgo | Medición | Veredicto |
> |---|---|---|
> | **AUD-004** | `validate-startup-config.ts` aborta con credenciales por defecto; `admin/auth/login` a 10/min | **corregido** (PT-036) |
> | **AUD-006** | `handleConnection` **sólo registra**: no autentica el handshake, y `joinAuction` acepta cualquier UUID | **ABIERTO** — ver matiz abajo |
> | **AUD-007** | ADMIN monta `helmet` con `contentSecurityPolicy` (`main.ts:21-22`) | **corregido** |
> | **AUD-011** | `admin.service.ts` **no menciona** `AuctionStateMachine` ni `canTransition` | **ABIERTO** |
> | **AUD-013** | 16 pruebas en 3 suites de comisiones y reembolsos | **corregido** |
> | **AUD-014** | La postura está escrita: *«CSRF mitigado por JWT Bearer + `SameSite`; los tokens de doble envío no se usan»* | **corregido** (la contradicción doc↔código ya no existe) |
> | **AUD-018** | `system-cleanup`: retención **única** y configurable, `LOG_RETENTION_DAYS` con 90 por defecto, comentada como *«single authoritative retention»* (PT-043) | **corregido** |
> | **AUD-023** | HeyBanco documentado en `Integraciones-y-Configuracion.md` y declarado en `src/api/.env.example` | **corregido** |
>
> **El matiz de AUD-006 importa y se dice:** el gateway **no autentica**, y eso es cierto. Pero lo único que
> emite es `emitAuctionEvent(auctionId, …)` a la sala `auction:<id>` — **datos de subasta, que son públicos**
> (`GET /auctions/:id` es `Public`). No hay canal por usuario ni datos privados en el socket. Así que la
> exposición real es **la que ya está abierta por la API pública**, no una fuga. Sigue siendo un hallazgo
> legítimo —una sala sin autenticar es superficie— pero **no es la fuga de datos que su enunciado sugiere**, y
> confundir las dos cosas es lo que hace que un hallazgo ALTA se ignore.
>
> ## Recuento honesto tras medir los 21
>
> **17 corregidos y verificados · 3 abiertos y verificados · 1 aceptado como limitación (AUD-016/H-005) · 15 sin
> verificar.**
>
> Los abiertos son **AUD-006** (WebSocket sin autenticar), **AUD-010** (resolver disputa no mueve dinero),
> **AUD-011** (el admin salta la máquina de estados), **AUD-012** (el VO `Money` sin usar) y **AUD-027**
> (`SMTP_*` duplicado). Cinco, no tres: los dos nuevos salieron de esta segunda medición.

> **Nueve sí están corregidos y verificados hoy** — AUD-001, 002, 003, 005, 008, 009, 017, 025, 030 —, y hasta
> hoy **veintidós documentos seguían declarándolos como defectos vigentes**. Corregido en PT-189.
>
> **Y la segunda frase de esta cabecera también era falsa:** decía que «la columna de recomendación indica el PT
> que lo resolvió». **Sólo dos de las 36 filas citan un PT**; el resto contiene la recomendación original de la
> auditoría, que es otra cosa. La columna no se reescribe —es el registro histórico de lo que se recomendó— pero
> deja de anunciarse como algo que no es.
>
> **Lo que esto enseña, y es el motivo de anotarlo aquí en vez de corregir el número y callar:** un «36/36» se
> lee y se cree. Trece medidos dieron tres abiertos; **los 23 restantes no se han verificado**, así que el
> número honesto de hoy no es 36/36 ni 33/36: es **9 verificados corregidos, 3 verificados abiertos, 1 aceptado
> como limitación, 23 sin verificar**.

> **Nota original (2026-07-23):** 36/36 hallazgos corregidos y **fusionados a master** (PTs 036–047). Cierres finales (PT-047): **AUD-016** → interruptor `CFDI_ENABLED` (OFF por defecto; `generate()` responde 503 claro y el admin lo prende/apaga desde la UI); la integración real del PAC queda como dependencia externa a contratar. **AUD-028** → scripts de CI en el `package.json` raíz. **AUD-033** → código muerto eliminado. Detalle: [../Informe-Remediacion.md](../Informe-Remediacion.md). La tabla inferior conserva el estado original de la auditoría; la columna de recomendación indica el PT que lo resolvió.
>
> **Estado real, no ideal.** 36 hallazgos entre documentación y realidad. En conflicto doc↔código **gana el código**. Los hallazgos de dominio/seguridad **no se cierran** sin validación humana ni evidencia post-fix (se corrigen bajo FDGE). El **detalle completo por hallazgo** (descripción, ubicación, evidencia, impacto, recomendación) está en `audit/deliverables/01-Registro-de-Hallazgos.md`; aquí queda el registro canónico resumido.


## Tabla de veredictos — los 36, uno por uno (PT-189)

**Esta tabla existe para que la pregunta «¿falta algo?» tenga respuesta sin volver a barrer el repositorio.**
Cada hallazgo tiene exactamente uno de cuatro estados, y **«sin verificar» es un estado legítimo**: lo que no se
permite es no haberlo mirado nunca y que nadie lo sepa.

La vigila `afirmaciones-de-estado-verificadas.spec.ts`: si un documento presenta como defecto vivo un `AUD`
marcado aquí `corregido`, la prueba falla. Y si alguien cita un `AUD` que no está en esta tabla, también.

| Hallazgo | Veredicto | Cómo se sabe |
|---|---|---|
| AUD-001 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-002 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-003 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-004 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-005 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-006 | **corregido** | PT-191 (2026-07-30). El handshake **sigue sin autenticar y es a propósito** —la puja en vivo se ve sin cuenta—, pero eso ya no es una afirmación: se retiró `EventsGateway` (segundo namespace público, cero llamantes) y `emitAuctionEnded` (difundía `winnerId`, cero llamantes), y `emisiones-publicas-sin-datos-privados.spec.ts` falla si una emisión lleva un campo identificativo |
| AUD-007 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-008 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-009 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-010 | **corregido** | PT-191 (2026-07-30). Eran **tres** defectos: la resolución no pagaba, el cron soltaba el holdback con la disputa abierta, y `createRefund` sólo acreditaba —cablearlo sin más habría **impreso dinero**—. `WalletService.reversarVenta()` conserva el importe; `resolver-mueve-dinero.spec.ts`, 12 casos |
| AUD-011 | **corregido** | PT-191 (2026-07-30). Seis operaciones escribían `status` a mano; dos ni llamaban a `assertAuctionModifiable`. Puerta única `transicionar()`, y hubo que **completar la máquina** con cuatro transiciones legítimas que le faltaban. `admin-pasa-por-la-maquina.spec.ts`, 13 casos |
| AUD-012 | **corregido** | PT-191 (2026-07-30). `Money` retirado (no puede representar el descubierto, y su aritmética es peor que `Decimal`), y con él el validador de IPN de **PayPal**, que describía un protocolo que la plataforma no usa. Al medir el conjunto: **30 de 42 símbolos de `core` sin consumidor** → `TD-024`, con guarda que impide que crezca |
| AUD-013 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-014 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-015 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-016 | limitación declarada | CFDI — aceptado como limitación declarada de v1.0 (H-005). Falta el PAC, no el código |
| AUD-017 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-018 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-019 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-020 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-021 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-022 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-023 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-024 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-025 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-026 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-027 | **corregido** | PT-191 (2026-07-30). No eran «dos rutas de config»: el panel tenía un formulario SMTP completo que guardaba y decía «guardado», y **el mailer lee `MAIL_*` del entorno** — no configuraba nada. Retirado con su formulario y sus dos endpoints huérfanos. `una-sola-ruta-de-correo.spec.ts` |
| AUD-028 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-029 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-030 | corregido | verificado el 2026-07-29 contra código o base |
| AUD-031 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-032 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-033 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-034 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-035 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |
| AUD-036 | **sin verificar** | nadie lo ha vuelto a medir desde 2026-07-23 |

**Recuento: 20 corregidos · 0 abiertos · 1 limitación declarada · 15 sin verificar.**

> **Actualizado el 2026-07-30 por PT-191.** Los cinco que estaban abiertos —AUD-006, AUD-010, AUD-011,
> AUD-012 y AUD-027— se cerraron en un solo ciclo, y **ninguno resultó ser lo que su enunciado decía**:
> AUD-027 no eran «dos rutas de config» sino un formulario que no configuraba nada; AUD-011 no era un
> cable suelto sino seis, con la máquina de estados **incompleta** debajo; AUD-010 no era un paso manual
> sino tres defectos encadenados, uno de los cuales **imprimía dinero**; AUD-012 nombraba un símbolo y
> eran treinta. Ésa es la razón por la que revisar «qué falta» leyendo enunciados nunca terminaba: **el
> enunciado de un hallazgo es su síntoma, no su tamaño.**
>
> Los **15 sin verificar** siguen ahí, y siguen siendo deuda de medición. No se tocan aquí porque
> declararlos corregidos sin medirlos es exactamente lo que produjo el «36/36» que este registro existe
> para desmentir.

Los 15 sin verificar son deuda **de medición**, no de código: puede que estén todos corregidos. Lo que no se
puede es seguir diciendo «36/36» sobre ellos.

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
