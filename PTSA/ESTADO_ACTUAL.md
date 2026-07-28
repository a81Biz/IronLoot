# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-27 | **Sesión**: S-002 — corrida completa desde F-1

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase B   (bajada desde A)
Health:         76.0 / 100
Risk:           100 / 100   CRÍTICO — saturado desde 41 brutos
Confidence:     90.0 / 100  ALTA
Freshness:      FRESH
Productos:      11 VALIDADO · 1 IDENTIFICADO
```

## Por qué baja de A a B

**No es el dominio.** D1 sigue en 85, las 14 reglas cumplen sobre salida real, la coherencia
inter-producto está limpia y la Regla del Agua Potable **no** está activada.

Es **D2 = 40**. Tres hallazgos, y los tres son la misma cosa vista desde tres sitios:

| | |
|---|---|
| **Esquema** | Las 23 migraciones no se han ejecutado nunca y no reproducen la base (H-014) |
| **Pipeline** | El job de integración no puede terminar en verde; bloquea `build` y `docker` (H-015) |
| **Imagen** | El healthcheck de producción apunta a un 404; tres servicios sin imagen (H-017) |

**El camino de este entorno a cualquier otro no se ha recorrido nunca.** Ninguna de las nueve
sesiones anteriores lo miró porque nada de eso estaba en `auditable_patterns`.

## Dimensiones

| | Score | Hallazgos activos |
|---|--:|---|
| D1 Dominio | 85 | H-005 |
| D2 Arquitectura | **40** | **H-014** · **H-015** · **H-017** |
| D3 Observabilidad | 100 | — |
| D4 Documental | 95 | H-016 |

## Hallazgos activos

| ID | Dim | Sev | Qué | Riesgo |
|---|:--|:--|---|--:|
| **H-014** | D2 | CRITICA | Las 23 migraciones no reproducen el esquema; `_prisma_migrations` no existe | 8 ALTO |
| **H-015** | D2 | ALTA | El job «Integration Tests» no puede terminar en verde | 12 CRÍTICO |
| **H-017** | D2 | ALTA | Healthcheck de producción a un 404; 3 de 4 servicios sin imagen | 6 MEDIO |
| **H-016** | D4 | MEDIA | El TRD cita una línea que ya dice otra cosa; `/health` documentado no existe | 6 MEDIO |
| H-005 | D1 | ALTA | Nadie ha decidido quién emite la factura | 6 MEDIO |

Cerrados con validación humana previa: H-001 … H-004, H-006 … H-013.
**Ninguno lo cerró el agente** (`[R44]`).

## Lo que queda, por orden

1. **H-015 + H-014 + H-017 son un solo trabajo.** Recorrer el camino de despliegue una vez, de
   principio a fin: esquema aplicado por migraciones → pipeline en verde → imagen construida y
   arrancada con su healthcheck en verde. Los tres se cierran juntos, y el mecanismo que los cierra
   es el que impide que vuelvan.
2. **H-005** — decisión de negocio y fiscal, no técnica. Tres opciones en F-1 § U-005.
3. **H-016** — subió a ALTA en la revisión S-002-R2. No son «dos filas viejas»: las **cinco** citas
   de la tabla de stack del TRD apuntan a la línea equivocada y **tres de cinco versiones son
   falsas**. La columna que existe para poder verificar el documento no permite verificar nada.

Cerrar los tres de D2 devuelve el Health a **94.0**; cerrando además H-016, **95.5**. Clase A en ambos casos, con H-005 todavía abierto.

## Cambios en el alcance (S-002)

Añadidos a `auditable_patterns`: **`.github/workflows/**`**, **`src/api/scripts/**`** y los
**`Dockerfile`**. Los tres huecos por los que se colaron H-015, H-014 y H-017.

Cifras de `coverage_targets` recontadas: **33** modelos, **23** migraciones, **159** rutas
(declaraban 27, 12 y ~84 desde el 23-jun).

> El área de despliegue lleva **una sola pasada**. No está exhaustivamente auditada.

## Deuda técnica

**TD-015 cerrado** por PT-126. `npm run audit:check`: 0 avisos en producción, línea base vacía.
