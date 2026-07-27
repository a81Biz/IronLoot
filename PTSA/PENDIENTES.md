# PENDIENTES.md — Bloqueantes y preguntas abiertas
**PTSA V3 | Actualizar al encontrar/resolver bloqueantes**
**Última actualización:** 2026-06-23 (S-001 — auditoría completa)

---

## Bloqueantes activos

### BLQ-001 — DB en ejecución no disponible para verificación de esquema real
- **Fase afectada:** F5 (Técnica — mandato BD `[R49]`)
- **Impacto:** Verificación de esquema basada en `schema.prisma`, no en DB live. Factor `autonomy` reducido en Confidence.
- **Acción requerida (próxima sesión):** `docker-compose up -d db` y ejecutar `\d` en psql para verificar schema real.
- **Estado:** ACTIVO — persiste en delta sync

### BLQ-002 — Logs en vivo no disponibles para F8
- **Fase afectada:** F8 (Observabilidad — mandato logs `[R51]`)
- **Impacto:** D3 confidence = 70%. F8 basada en código fuente, no en ejecución real.
- **Acción requerida (próxima sesión):** `docker logs ironloot-api` durante operación para capturar logs reales.
- **Estado:** ACTIVO — persiste en delta sync

---

## Preguntas abiertas

### PQ-003 — Verificar mecanismo auth en JS browser del CLIENT (H-006)
- **Relevancia:** H-006 tiene confidence 80% — depende de cómo el JS browser gestiona auth para llamadas directas al API
- **Acción:** Leer `src/apps/client/public/js/pages/wallet/deposit.js` y `withdraw.js`
- **Decisión de clasificación:** Si usa `credentials: 'include'` (cookies) → bajar H-006 a BAJA. Si usa localStorage/headers → mantener MEDIA o subir a ALTA.

---

## Resueltos

### PQ-001 — ThrottlerModule backend ✅
- **Resolución:** Confirmado in-memory sin Redis (E-003). Registrado como H-002.

### PQ-002 — Patrón llamadas CLIENT al API ✅
- **Resolución:** Confirmado `apiUrl` expuesto al browser (E-006). Registrado como H-006, pendiente investigación JS browser (PQ-003).

---

## DS-004 (2026-07-27)

| # | Pendiente | Responsable |
|---|---|---|
| 1 | **Triar H-008**, empezando por `engine.io` (único alcanzable sin autenticar) | Humano decide el triaje |
| 2 | **Ejecutar el checkpoint D2 de dependencias.** Declarado en `audit-scope.yaml` desde el 23-jun, sin una sola ejecución registrada | Humano |
| 3 | **Decidir H-009**: versionar la documentación crítica o retirarla del alcance | Humano (política del repositorio) |
| 4 | Subir P-001, P-004, P-005, P-009 de `BORRADOR` a `IDENTIFICADO` con la evidencia de E-010 | F3, próxima sesión |
| 5 | Auditar la salida real de P-003, P-006, P-007, P-008, P-010, P-011 (hoy `coverage` = 50 %) | Próxima sesión |
| 6 | `CLAUDE.md` cita `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`; **ninguno existe** | Humano |

---

## DS-005 (2026-07-27)

| # | Pendiente | Responsable |
|---|---|---|
| 1 | **Decidir quién emite la factura** — las tres opciones están en F-1 § U-005. Desbloquea H-005 | Humano (negocio + fiscal) |
| 2 | Validar H-008 (CORREGIDA_PARCIAL) y H-009 (CORREGIDA) | Humano |
| 3 | **TD-015**: la cadena del mailer (11 paquetes, exige `nodemailer >= 8`) como unidad propia | Próximo PT |
| 4 | Subir los 12 productos de `BORRADOR`; auditar la salida real de los 6 que faltan | F3, próxima sesión |
| 5 | Poner a correr el checkpoint D2 de dependencias — **ahora sí es posible**: `dependencias-vulnerables.spec.ts` lo hace en milisegundos | Próximo PT |
| 6 | `CLAUDE.md` cita `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`; ninguno existe | Humano |
