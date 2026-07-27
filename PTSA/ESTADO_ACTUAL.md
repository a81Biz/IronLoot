# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-27 | **Sesión**: DS-005 — tras atender los hallazgos

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase B
Health:         94.0 / 100     (DS-004: 90.5)
Clasificación:  B              (sin cap sería A; Confidence 63.4 < 90, §15.6)
Risk:           40 / 100       (DS-004: 92)  MODERADO
Confidence:     63.4 / 100     (BAJA)
Freshness:      STALE
```

## Dimensiones

| | DS-004 | **DS-005** | Hallazgo activo |
|---|--:|--:|---|
| D1 Dominio | 85 | **85** | H-005 — CFDI (causa raíz corregida) |
| D2 Arquitectura | 85 | **95** | H-008 — CORREGIDA_PARCIAL |
| D3 Observabilidad | 100 | **100** | — |
| D4 Documental | 95 | **100** | H-009 — CORREGIDA |

## Lo que cambió

**Risk cae de 92 a 40**: el vector alcanzable sin autenticar está cerrado y la documentación crítica
ya tiene historial.

**Confidence apenas se mueve** (62.8 → 63.4), y es lo honesto: este delta **atendió hallazgos, no
amplió cobertura**. Seis de doce productos siguen sin auditar su salida real, y los doce siguen en
`BORRADOR`. Por eso la clase no sube a A pese al Health de 94.

## Hallazgos

| ID | Dim | Estado |
|---|:--|---|
| **H-005** | D1 | **ABIERTA** — el bloqueo no es el PAC: es que nadie ha decidido quién emite la factura (F-40) |
| **H-008** | D2 | **CORREGIDA_PARCIAL** — 71→63 avisos; quedan 63 sin alcance directo, en TD-015 |
| **H-009** | D4 | **CORREGIDA** — 238 ficheros de decisión versionados, 2658 artefactos fuera |

**Ninguno cerrado.** El agente no cierra hallazgos.

## Lo que apareció al trabajarlos

Tres defectos que sólo salen al tocar el sistema, no al leerlo:

- **F-38** — ADMIN llevaba **desde PT-101 sin compilar**. El `dist` conservado por PT-094 servía
  código viejo y tapaba el fallo.
- **F-39** — Las sesiones de ADMIN **nunca estuvieron en Redis** pese a que el código lo anunciaba.
  Dos causas encadenadas: un `default` inexistente y, debajo, un dialecto de cliente equivocado.
- **F-40** — H-005 llevaba cinco semanas con la causa raíz equivocada.

Los tres son de la misma familia: **un éxito anunciado con un fallo callado**.

## Siguiente acción

1. **Decidir quién emite la factura** (H-005/F-40). Es una decisión de negocio, no técnica, y
   desbloquea D1.
2. **Subir productos de `BORRADOR`** y auditar la salida real de los seis que faltan. Es lo único
   que mueve el Confidence, y con él la clasificación.
3. TD-015: la cadena del mailer, como unidad de actualización propia.
