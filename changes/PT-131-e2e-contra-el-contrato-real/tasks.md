# PT-131 — Tareas atómicas

**Prerequisito**: PT-128 (la suite tiene que terminar). Cumplido.
Ninguna empieza antes del ACK del Proposal Gate.

---

## PT-131.1 — Medir antes de arreglar

- **Objetivo**: saber el trabajo real. Con `beforeAll` en cascada, 42 fallos pueden ser 3 causas.
- **Entrada**: la corrida de PT-128 (`evidence/PT-128/suite-e2e-host.txt`).
- **Salida**: tabla fichero → causa raíz, separando lo que es contrato viejo de lo que no.
- **Validación**: cada uno de los 42 fallos tiene causa asignada.
- **Status**: PENDING

## PT-131.2 — El helper de subasta válida

- **Objetivo**: un solo sitio que sepa cómo es un `CreateAuctionDto` válido hoy.
- **Entrada**: `create-auction.dto.ts`; patrón de `test/core/auth-helper.ts`.
- **Salida**: helper que devuelve un DTO válido, con fechas derivadas del momento de ejecución.
- **Validación**: crear subasta con él da **201**.
- **Status**: PENDING

## PT-131.3 — Los diez ficheros pasan a usar el helper

- **Validación**: ninguno construye su DTO a mano. Volver a medir: el número de fallos baja.
- **Status**: PENDING

## PT-131.4 — `wallet.e2e-spec.ts`: prefijo y moneda

- **Objetivo**: `/wallet/deposit` → `/api/v1/wallet/deposit`; moneda esperada `USD` → `MXN`.
- **Validación**: el spec habla del sistema que existe.
- **Nota**: el `500` de ese fichero **no se toca** — es H-018 y tiene su propio camino.
- **Status**: PENDING

## PT-131.5 — Las subastas que deben cerrar (decisión D5)

- **Objetivo**: resolver la tensión entre la duración mínima de 1 h y los tests que necesitan cierre.
- **Salida**: vía (a) — crear por la vía pública y **después** adelantar `endsAt` en la base, con
  comentario que explique por qué se salta la validación a propósito.
- **Validación**: los specs de pedido, envío y valoración pasan **sin tocar el producto**.
- **Status**: PENDING — **la vía la confirma el Gate**

## PT-131.6 — Lo que quede, clasificado

- **Objetivo**: los fallos que sobrevivan a .3, .4 y .5 no son contrato viejo.
- **Salida**: cada uno, **hallazgo registrado** (PTSA o `DISCOVERY.md`). Ninguno maquillado.
- **Validación**: cero `skip` nuevos, cero aserciones relajadas para que salga el verde.
- **Status**: PENDING

## PT-131.7 — Verde de punta a punta

- **Validación**: 17 ficheros verdes · `test-integration` verde · **`build` y `docker` se ejecutan
  por primera vez** · 619 tests unitarios intactos · **cero cambios en `src/api/src/`**.
- **Status**: PENDING

## PT-131.8 — Evidencia, self-review y registro

- **Salida**: `evidence/PT-131/` con el antes (42 fallos) y el después · `HISTORY.log` · `HANDOFF.md`.
- **Status**: PENDING

---

## Commits previstos

```
test:  PT-131 un helper que sabe como es una subasta valida hoy      (.2)
test:  PT-131 los diez ficheros e2e contra el contrato real          (.3 .4 .5)
docs:  PT-131 evidencia e historia                                    (.8)
```
