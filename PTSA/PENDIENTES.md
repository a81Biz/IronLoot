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
