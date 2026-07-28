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

---

## DS-006 (2026-07-27)

| # | Pendiente | Responsable |
|---|---|---|
| 1 | **H-010** — invocar `calculateForOrder()` donde se asienta el `FEE_PLATFORM`. Es el D1 más barato y el que más sube el Health | Próximo PT |
| 2 | **H-011** — decidir si la ventana se mide desde la entrega; si sí, añadir `delivered_at` y **quitar los `as any`** | Humano decide, luego PT |
| 3 | **H-005** — quién emite la factura | Humano (negocio + fiscal) |
| 4 | **Definir las rúbricas en F-1.** Sin ellas ningún producto puede llegar a `VALIDADO` (`[R38]`) | F12 |
| 5 | ⚠️ **D1 = 65, a 5 puntos del cap.** Un hallazgo ALTA más en D1 lleva el sistema a Clase F | Vigilar |
| 6 | Reconstruir los `CommissionRecord` históricos desde el ledger, si se quiere que el informe cuadre hacia atrás | Humano (es contabilidad con fecha pasada) |

---

## S-002 (2026-07-27) — corrida completa

### Bloqueantes de sesiones anteriores: RESUELTOS

**BLQ-001** (BD en ejecución no disponible) y **BLQ-002** (logs en vivo no disponibles) quedan
**cerrados**. Esta sesión corrió contra el entorno completo en marcha: `psql` directo sobre
`ironloot_db`, `docker logs ironloot-api`, y peticiones HTTP reales contra el API. El factor
`autonomy` de Confidence sube a 100.

**PQ-003** sigue abierta como pregunta menor (mecanismo de auth del JS de navegador del CLIENT); no
bloquea nada y H-006 está CERRADA.

### Pendientes

| # | Pendiente | Responsable |
|---|---|---|
| 1 | **H-015 + H-014, juntos.** El paso de esquema que le falta al job de CI *es* la prueba de que las migraciones funcionan | Próximo PT |
| 2 | **H-014 — decidir la vía**: rebasar el historial (migración de reconciliación + `migrate resolve --applied`) o colapsar las 23 en una inicial | Humano (plataforma) |
| 3 | **H-016** — actualizar TRD y Backend-Architecture; y, si se quiere que no vuelva, una prueba que compare versiones citadas contra `package.json` | Próximo PT |
| 4 | **H-005** — quién emite la factura. Tres opciones en F-1 § U-005. Bloquea P-012 y tapa D1 en 85 | Humano (negocio + fiscal) |
| 5 | **D1.N1 y D3 no tienen job en CI.** Declarados como checkpoints, se ejecutan porque el auditor los ejecuta. Cae dentro de H-015 | Próximo PT |
| 6 | **Generar una disputa real** en la próxima corrida de QA: P-006 está VALIDADO con evidencia no reproducible hoy | Próxima sesión |
| 7 | **Revisión documental exhaustiva** de los cinco documentos del alcance. F7 sólo verificó la versión del framework y tres afirmaciones de CLAUDE.md | Próxima sesión |
| 8 | `CLAUDE.md` cita `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`; **ninguno existe** — pendiente desde DS-004 | Humano |

### Añadido al cierre de S-002 — H-017

| # | Pendiente | Responsable |
|---|---|---|
| 9 | **H-017** — `src/api/Dockerfile`: `/health` → `/api/v1/health` y alinear el criterio con el de desarrollo (`< 500` + manejador de error). Definir `Dockerfile` de producción para ADMIN, BASE y CLIENT. Corregir la ruta del job `docker` | Próximo PT |
| 10 | **Lo que de verdad cierra 1+2+9**: que el pipeline recorra el camino entero una vez — migraciones aplicadas, tests en verde, imagen construida y arrancada con su healthcheck en verde | Próximo PT |
| 11 | **Segunda pasada al área de despliegue.** `.github/workflows/**`, `src/api/scripts/**` y los `Dockerfile` entraron en el alcance en S-002 y sólo llevan una pasada | Próxima sesión |

---

## S-002 final (2026-07-28) — tras PT-127…PT-132

### Lo único abierto de peso

| # | Pendiente | Responsable |
|---|---|---|
| 1 | **H-005 — quién emite la factura.** Tres opciones en F-1 § U-005. Mantiene D1 en 85 y bloquea P-012. **Ningún PT puede resolverlo** | Humano (negocio + fiscal) |
| 2 | **Validar los seis hallazgos en `CORREGIDA`**: H-014, H-015, H-016, H-017, H-019, H-020. `[R44]` prohíbe al agente cerrarlos | Humano |

### Decisiones de arquitectura que merecen ADR

| # | Decisión | Por qué |
|---|---|---|
| 3 | **Retirar `/wallet/deposit` y `/payments/checkout`** | Sin llamantes en todo `src/`. Superados por el ciclo de pago (PT-080/PT-087). `/wallet/deposit` **acredita dinero** y nadie lo mantiene: es superficie de riesgo. Cierra H-018 de raíz |
| 4 | **`payments.e2e` y la pasarela real** | Resuelto de facto al retirar los tests de endpoints legados. Si algún día se quiere cobertura del contrato de la pasarela, va en un job **nocturno**, no en cada push |

### Lo que se sabe que falta medir

| # | | |
|---|---|---|
| 5 | La guarda del contrato CLIENT↔API **no cubre ADMIN ni BASE** | Ampliarla es barato |
| 6 | **Nada comprueba vulnerabilidades de la imagen base.** `audit:check` mira npm; el IDE avisa de 2 críticas y 23 altas en `node:20-alpine`. Ahora que los `Dockerfile` están en el alcance, es un hueco de D2 | Próximo PT |
| 7 | ¿Hay más servicios que mezclen un DTO transformado contra un JSON almacenado? El patrón de H-019 podría repetirse | Barrido |
| 8 | La imagen del API se lleva las dependencias de desarrollo (541 MB) | Afinarlo, si importa |
| 9 | `/api/v1/users/:id/ratings` exige sesión. La reputación de un vendedor es lo que un comprador mira **antes** de registrarse — puede ser deliberado o efecto colateral del guard global | Humano decide |
| 10 | `CLAUDE.md` cita `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`; ninguno existe — pendiente desde DS-004 | Humano |
