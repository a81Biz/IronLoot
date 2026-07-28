# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0
**Sesión**: S-002 — corrida completa desde F-1 | **Fecha**: 2026-07-27
**Tipo**: Auditoría completa (`[START PTSA]`), no delta sync
**auditoria_estado**: EN_CURSO — ver «Criterio de compleción» al final

---

## SCORES — CLASE B

| Métrica | DS-009 (27-jul) | **S-002 (27-jul)** | Cambio |
|---|---|---|---|
| **Health Score** | 94.0 | **76.0 / 100** | −18.0 |
| **Risk Score** | 40 | **100 / 100** | +60 — saturado |
| **Confidence** | 94.2 | **90.0 / 100** | −4.2 |
| **Clasificación** | A | **B** | Bajada |

```
Health = (85×0.30) + (40×0.30) + (100×0.30) + (85×0.10) = 76.0
Risk   = min(100, 41 × 4) = 100        Risk_bruto = 6+8+12+9+6 = 41
```

**Regla del Agua Potable: NO activada.** D1 = 85 ≥ 60. Se dice explícitamente porque `[A4]` lo
exige: el dominio no está capando nada. **Lo que baja el Health es D2.**

Confidence 90 ≥ 90 → no aplica la degradación de §15.6. `health_unstable = false`. Sin cap.

---

## SCORES POR DIMENSIÓN

| Dimensión | DS-009 | **S-002** | Hallazgos activos |
|---|---|---|---|
| D1 Alineación de Dominio | 85 | **85** | H-005 (ALTA) — CFDI sin decidir |
| D2 Integridad Arquitectónica | 95 | **40** | **H-014 (CRITICA)** · **H-015 (ALTA)** · **H-017 (ALTA)** |
| D3 Observabilidad y Recuperación | 100 | **100** | ninguno |
| D4 Fidelidad Documental | 100 | **85** | **H-016 (ALTA)** |

**D5**: `NO_APLICA` para alucinación y drift (sistema determinista). Success 100 % · Retry 0 % ·
Failure 0 %, los tres en verde. `health_unstable: false`.

---

## LO QUE ENCONTRÓ ESTA CORRIDA

### El esquema es correcto. El artefacto que lo construye no. (H-014, CRITICA)

La base que esta auditoría lleva nueve sesiones certificando la construye
`prisma db push --accept-data-loss` en cada arranque del contenedor. `db push` no escribe
`_prisma_migrations`, y esa tabla **no existe**.

Consecuencia comprobada: **las 23 migraciones no se han ejecutado nunca.** Aplicadas a una base
limpia producen otro esquema, y sobre él la aplicación no funciona:

```
  FALLA  userPaymentMethod.findMany    -> falta la columna user_payment_methods.type
  FALLA  paymentCycle.findMany         -> falta la columna payment_cycles.provider_ref
  FALLA  accountVerification.findMany  -> falta la tabla account_verifications
  OK     payment.findMany
```

Y `payments.reference` deja de ser único: **la unicidad que CLAUDE.md declara como garantía de que
un reintento no duplique el asiento contable no existe en el artefacto desplegable.**

No hay despliegue productivo hoy, así que nada está roto ahora mismo. Pero el `Dockerfile` de
producción no aplica esquema alguno y `ci.yml` no tiene job de despliegue: **las migraciones son el
único camino que existe, y no funciona.**

### El job de CI llamado «Integration Tests» no integra nada (H-015, ALTA)

Levanta un Postgres y corre la suite e2e **sin crear el esquema** — ni `migrate deploy`, ni
`db push`, ni `prisma generate`. Y la suite tampoco cierra sus manejadores: con esquema completo los
9 tests de `auth` pasan en 22 s, pero sólo terminan si se añade `--forceExit`, que el script no
lleva.

`build: needs: [test-unit, test-integration]` y `docker: needs: build`. **Ni `build` ni `docker` se
ejecutan.**

Es el mismo patrón que PT-118 arregló para las dependencias, un escalón más abajo. Y llegó tarde por
la misma razón: **`.github/workflows/**` no estaba en `auditable_patterns`.** Se ha añadido, junto
con `src/api/scripts/**`, que es donde vive la causa de H-014.

### No hay imagen de producción utilizable (H-017, ALTA)

El healthcheck de la única imagen de producción pide `http://localhost:3000/health`. Esa ruta
devuelve **404**: el prefijo global es `/api`, la real es `/api/v1/health`. Un contenedor de
producción quedaría `unhealthy` para siempre con la aplicación funcionando. En `docker-compose` está
corregido — se arregló ahí y no en la imagen.

ADMIN, BASE y CLIENT **no tienen `Dockerfile` de producción**, sólo `.dev`. Y el job `docker` de CI
construye `./Dockerfile`, que no existe en la raíz.

**Los tres hallazgos D2 son el mismo camino visto desde tres sitios**: esquema (H-014), pipeline
(H-015) e imagen (H-017). Ninguna de las tres piezas se ha ejecutado nunca.

### El TRD cita una línea que ya dice otra cosa (H-016, MEDIA)

`03-TRD.md:13` declara `NestJS ^10.3.0` **citando `src/api/package.json:36`**. Los cuatro servicios
están en `^11.0.0` desde PT-126. La cita convierte un número viejo en un dato falso avalado.

Segundo caso, encontrado sin buscarlo: `CLAUDE.md:138` documenta `/health` y `/health/detailed`.
Ninguna de las dos existe. Dos casos en una sesión sugieren que hay más — de ahí la recomendación
de medirlo en vez de corregirlo a mano.

---

## LO QUE ESTÁ SANO, Y CÓMO SE COMPROBÓ

Todo ejecutado por el auditor (`[A5]`, `[R61]`). Nada de segunda mano.

| | |
|---|---|
| **D1 — 14 reglas de dominio sobre salida real** | `rubric_compliance_score = 100`, 0 violaciones |
| **Nivel 3 — coherencia inter-producto** | 5 parejas, 0 desviaciones. `cross_coherence_verified` |
| **D2 — dependencias** | **0 avisos** en producción, línea base vacía. **TD-015 cerrado** (PT-126) |
| **D2 — compilación y pruebas** | typecheck limpio · API 83 suites / 603 tests · CORE 8 / 134 |
| **D2 — esquema real** | 33 tablas · 17 columnas de dinero, **todas** `numeric` · **0** float |
| **D3 — traza de pagos** | 49 eventos, 8 pasos · **0 credenciales** · 4 redacciones que nombran qué ocultaron |
| **D3 — logs en vivo** | JSON estructurado con `traceId` extremo a extremo · 0 excepciones sin manejar |
| **D3 — checkpoint** | `trace_completeness = 100 %` · `silent_failure_count = 25` (línea base) |
| **D5** | Success 100 % · Retry 0 % · Failure 0 %, los tres verdes |
| **Superficie autenticada** | 401 en los tres endpoints sensibles probados |
| **WebSockets** | los 5 `emit` van a salas `auction:<id>` con datos públicos. Ningún dato por usuario |

**H-008 y H-009 quedan comprobados corregidos en la fuente real**: 0 vulnerabilidades, y los cinco
documentos del alcance seguidos por git.

---

## PRODUCTOS

| Estado | Productos |
|---|---|
| **`VALIDADO`** | P-001 · P-002 · P-003 · P-004 · P-005 · **P-006** ⚠️ · P-007 · P-008 · P-009 · P-010 · P-011 |
| `IDENTIFICADO` | P-012 CfdiRecord — sin instancias, bloqueado por H-005 |

Ninguna transición esta sesión. Los tres hallazgos nuevos son **sistémicos** (`producto_id: null`,
§13.7): penalizan su dimensión y no se imputan a producto. H-014 no dice que P-004 esté mal — dice
que el artefacto que reconstruiría su base en otro entorno lo está.

⚠️ **P-006 Dispute**: llegó a VALIDADO en DS-008 con evidencia E-015 sobre disputas reales. La base
se reconstruyó después y hoy `disputes` tiene 0 filas. E-015 sigue siendo captura válida de lo que
se observó; **no es reproducible hoy**. No se degrada el estado, pero queda anotado.

---

## FRESCURA

```
score_freshness:
  last_verified: 2026-07-27
  commits_since_audit: 0
  status: FRESH
```

`audit_due` de los cinco productos CRÍTICOS: **2026-08-26**.

---

## LO QUE ESTA AUDITORÍA NO CUBRE

Declarado para que no se confunda con cobertura:

| Área | Estado |
|---|---|
| **P-006 y P-012** | Sin salida real hoy (0 filas). `coverage` = 10 de 12 |
| **Revisión documental exhaustiva** | **No hecha.** F7 verificó la versión del framework y tres afirmaciones de CLAUDE.md. Otras podrían estar desactualizadas sin medir |
| **Historial de GitHub Actions** | `gh` no disponible. No se sabe **desde cuándo** H-015 está así |
| **Qué migración introdujo cada divergencia** | No medido |
| **El área de despliegue, recién metida en el alcance** | `.github/workflows/**`, `src/api/scripts/**` y los `Dockerfile` entraron en el alcance **en esta sesión**. Se auditó lo que saltó a la vista y salieron tres hallazgos. **No es una revisión exhaustiva de esa área**: es su primera pasada |
| **Explotación de vulnerabilidades** | No aplica: 0 avisos |
| **Concurrencia y carga** | Fuera de alcance |
| **Nivel 4 del Acid Test** | `NO_APLICA` — sistema determinista |

Y la limitación de siempre, sin adornos: la muestra es pequeña —4 monederos, 3 pujas, 1 pago
liquidado—. Demuestra que los invariantes no se violan en el camino observado, **no** que sean
inviolables bajo concurrencia.

---

## RECOMENDACIÓN

1. **H-015, H-014 y H-017 son un solo trabajo**, en ese orden. El paso de esquema que le falta al
   job de CI es exactamente la prueba de que las migraciones funcionan; y un pipeline que construya
   y arranque la imagen una vez cierra H-017 solo. **Recorrer el camino entero una vez** cierra los
   tres y deja el mecanismo que impide que vuelvan. Arreglarlos por separado es lo que permitió que
   esto durase nueve sesiones.
2. **Para H-014, decidir la vía**: rebasar el historial (`migrate resolve --applied` tras una
   migración de reconciliación) o colapsar las 23 en una inicial. La primera conserva historia; la
   segunda es más limpia. Es decisión de plataforma.
3. **H-005 sigue esperando una decisión de negocio**, no técnica: quién emite la factura. Las tres
   opciones están en F-1 § U-005. Sin ella P-012 no existe y D1 no pasa de 85.
4. **H-016 cuesta minutos.** Y si se quiere que no vuelva, el repositorio ya tiene el patrón:
   una prueba que compare las versiones citadas en el TRD contra los `package.json`, como
   `coherencia-deuda-tecnica.spec.ts` hace con la deuda.
5. **D1.N1 y D3 no tienen job en CI.** Están declarados como checkpoints y se ejecutan porque el
   auditor los ejecuta. Cae dentro de H-015, pero conviene no perderlo de vista.

---

## CRITERIO DE COMPLECIÓN (`[R74]`)

`auditoria_estado` **no** puede ser `COMPLETADA`. Falla el punto 1: P-012 no tiene estado final
(`IDENTIFICADO`, bloqueado por H-005). Los otros seis puntos se cumplen: trazabilidad completa,
evidencias catalogadas con origen y fingerprint, validaciones registradas como hallazgo con
severidad y dimensión, `F10_Matriz_Maestra.md` al día, `RESUMEN.md` coherente con las fases, y
`score-history.json` y `score_freshness` actualizados.
