# PT-237 — Self-Review

**Tipo:** BUG · **Complejidad:** STANDARD · **Rama:** `fix/PT-237-seleccion-de-pac`
**Discovery:** `docs/implementation/DISCOVERY.md` § PT-237 · **Diseño:** `changes/PT-237-seleccion-de-pac/design.md`

## Lo que se midió antes de tocar nada

```
$ docker exec ironloot-db psql -U ironloot -d ironloot_db \
    -c "SELECT status, count(*) FROM cfdi_records GROUP BY status ORDER BY 1;"
 status | count
--------+-------
(0 rows)
```

**Cero filas.** El daño era **latente, no realizado**, porque la facturación está apagada por defecto —
y ahí estaba justamente el peligro, igual que en `H-029` con reCAPTCHA: *el día que alguien lo encendiera,
creería estar a un paso de facturar y no lo estaría.*

Y se midió el otro extremo: **cero puntos del sistema leen un `cfdiRecord` en `PENDING` para avanzarlo.**
Sólo se **cuentan**, en `admin.service.ts:270`, para el panel.

```
$ grep -rn "cfdiRecord" src/api/src --include=*.ts | grep -v cfdi.service.ts
admin.service.ts:270:  cfdiRecord.count({ where: { status: 'PENDING' } })
admin.service.ts:646/649/652:  cfdiRecord.count(...)
```

## Los tres defectos, y qué se hizo con cada uno

| # | Defecto | Qué se hizo |
|---|---|---|
| 1 | `generate()` escribía `PENDING` y lanzaba: fila muerta y contador que sólo crece | Un solo camino de fallo, que deja `ERROR` con el motivo |
| 2 | El mensaje citaba `ICfdiPacProvider (@ironloot/core integrations)`, retirado entero en PT-193 | Nombra lo que existe: `CfdiPacProvider` en `CFDI_PAC_PROVIDERS`, y `TD-001` |
| 3 | `pacUrl` texto libre: una decisión que el sistema no podía recibir | `CfdiPacRegistry` + `CFDI_PAC_PROVIDER` validado contra él |

**El texto de la pantalla repetía la cita falsa palabra por palabra** —*«implementar `ICfdiPacProvider` en
@ironloot/core»*—, así que el operador la leía **dos veces**: en la pantalla y en el error.

## Criterios de aceptación

| AC | Qué exige | Verificado |
|---|---|---|
| AC-1 | Activar sin PAC disponible falla **nombrando el motivo** | ✅ `BadRequestException` con `/PAC/i`, y `CFDI_ENABLED` no se escribe |
| AC-2 | Una clave de PAC no registrada se rechaza | ✅ y la cadena vacía («ninguno») **sí** se acepta |
| AC-3 | `generate()` sin PAC no deja ninguna fila en `PENDING` | ✅ se comprueba que escribe algo **y** que todo es `ERROR` |
| AC-4 | Ningún mensaje nombra un símbolo o paquete inexistente | ✅ y hay control de que la guarda lee el fichero de verdad |
| AC-5 | Las cuatro con guarda y control en las dos direcciones | ✅ `seleccion-de-pac.spec.ts`, 9 casos |

## Las dos guardas que me acusaron, y tenían razón

**`RULE-17` — `CFDI_PAC_PROVIDER` se leía sin estar declarada.** Es una clave de `system_config`, no del
entorno, y la regla **no distingue de dónde se lee**: si el código la lee, tiene que estar declarada.
Declarada en `.env.example` y en `Integraciones-y-Configuracion.md`, donde ya estaban sus hermanas.

**`RULE-31` — `evidence/PT-237/` se citaba en `tasks.md` antes de existir.** Correcto: una cita a una
carpeta que no está es una cita rota, aunque la carpeta vaya a crearse después.

Ninguna de las dos se silenció.

## Un hallazgo lateral, ya resuelto

`src/packages/core/dist/integrations/` **seguía en disco** con la interfaz retirada: `tsc` no borra la
salida de fuentes eliminadas. Está en `.gitignore`, así que **no es un defecto del repositorio** — es
staleness de máquina—, pero en esta habría dado autocompletado de un puerto que ya no existe. `dist/`
regenerado desde cero. Se anota porque el siguiente que compile core partiendo de un árbol viejo lo tendrá.

## Checklist

- [x] Criterios verificados sobre salida real (consulta a la BD) y sobre el código, no sobre lectura
- [x] Escenarios pasando; sin regresiones
- [x] Sin efectos colaterales — `/cfdi` sólo lista y cancela; no toca `generate()`
- [x] `11-Conventions.md` respetado: `RULE-17` (variable declarada), `RULE-40` (clases existentes),
      `RULE-41` (la acción anuncia su resultado)
- [x] Commit atómico trazable a PT-237
- [x] Sin artefactos de depuración
- [x] Documentación actualizada: `TD-001`, `.env.example`, `Integraciones-y-Configuracion.md`

## Una prueba que cambió, y por qué no es hacerla pasar

`cfdi.service.spec.ts` afirmaba *«`updateConfig()` persists the enabled flag»* con `enabled: true`.
**Eso era el defecto**: el interruptor encendía un subsistema que no podía funcionar. Se sustituye por dos
casos —apagar siempre se puede; encender sin PAC se rechaza— con el motivo escrito al lado.

Es la misma distinción que PT-229 hizo con `wallet.controller.spec.ts`: **el contrato cambió de verdad**.

## Lo que este PT deja dicho

**Un stub que no hace nada es honesto; un stub que acepta configuración y escribe estado simula estar a un
paso de funcionar.** `TD-001` estaba bien declarada y el `PRD` era honesto —E10 `✗ No funcional`—, y aun
así el panel ofrecía un formulario que sugería lo contrario. La declaración de una limitación no protege de
que la interfaz la contradiga: eso es `RULE-42` mirando hacia dentro, al operador en vez de al usuario.
