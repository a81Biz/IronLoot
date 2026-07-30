# PT-196 — Self-Review (FDGE STATE 5)

**Objetivo:** rotar el refresh token y detectar su reuso. Un token robado deja de servir siete días, y
**su uso se nota**.

---

## Las 12 tareas, en cuatro bloques

| Bloque | Tareas | Estado |
|---|---|---|
| 1 — El CLIENT persiste el token nuevo | 1, 2, 3 | ✅ |
| 2 — El esquema | 4, 5 | ✅ |
| 3 — La rotación | 6, 7, 8, 9, 10 | ✅ |
| 4 — Guarda y cierre | 11, 12 | ✅ |

**El orden se respetó**, y no es una formalidad: el bloque 1 va antes porque si el API rotara primero,
cada usuario perdería la sesión en su segundo refresco. El bloque 1 es **inocuo por sí solo** —escribe
una cookie con el mismo valor que ya tenía—, y por eso se pudo comprometer y verificar por separado.

## Verificación

- **API**: 1101 pruebas / 136 suites (eran 1082 / 134).
- **CLIENT**: 144 / 12 (eran 134 / 11).
- **`npm run audit:schema`**: sin deriva. La migración reproduce `schema.prisma`.
- Typecheck limpio en los dos.

## Tests-first, con el RED anotado

| Prueba | RED verificado |
|---|---|
| `cookies-de-sesion.spec.ts` | suite entera: el módulo no existía |
| Casos nuevos en guard e interceptor | **2 de 30** fallando, exactamente los de la persistencia |
| `rotacion-del-refresh-token.spec.ts` | **10 de 10** fallando |

## Cada guarda vista fallar por su propio motivo

| Sabotaje | Qué cae |
|---|---|
| Quitar el `FOR UPDATE` de la rotación | `C2` de la guarda estructural |
| Dar reserva a `ROTATION_GRACE_SEC` | `C5` — **tras corregirla**, ver abajo |

## Lo que salió mal, porque es evidencia

**1. Mi guarda no cazó su propio sabotaje.** `C5` exigía el `||` **pegado** al nombre de la variable, y
la reserva real iba detrás de `?.trim()`:

```ts
process.env.ROTATION_GRACE_SEC?.trim() || '30'
```

Medir la forma en vez de la relación, otra vez. Corregido a mirar **la línea entera**, con `AC-04`
fijando exactamente la forma que se le escapó — para que la corrección no dependa de que yo me acuerde.

**2. Y mi implementación de la gracia arrancaba sana y fallaba en el primer refresco.** La primera
versión validaba **dentro de la función**: el API habría arrancado `healthy` y habría fallado al primer
refresco de cualquier usuario. Es el modo de fallo **exacto** de `AUD-026`, que yo mismo cerré hoy.

**Lo cazó el caso de control de su propia prueba** (`AC-01`), que exigía que el `require` del módulo
lanzara. La prueba tenía razón y el código no. Ahora se evalúa al cargar el módulo, y `C4` lo fija.

**3. Un contador de migraciones en `audit-scope.yaml`.** Decía «2 migraciones» y ahora son 3. Lo detectó
`alcance-de-auditoria-existe.spec.ts` en la suite completa — una cifra documentada que tiene guarda,
funcionando.

## Decisiones que quedaron donde se leen

- **La familia es la fila de sesión.** Ni cadena ni grupo: se rota dentro de la fila guardando el
  anterior. Revocar es escribir `revokedAt` donde ya estás.
- **Cuatro casos, ninguno ambiguo**, y el orden de las comprobaciones está probado: revocada y expirada
  **antes** que el reuso, o el registro se llena de ruido justo cuando hay que leerlo.
- **El reuso lleva las dos puntas** —IP y `userAgent` de la sesión y de la presentación—: con una sola
  queda «hubo un reuso» y no se puede investigar.
- **La gracia son 30 s derivados** del tope de refresco del CLIENT, no elegidos.

## Lo que este PT NO hace

- **Sólo recuerda un token hacia atrás.** Un robo que llega tras dos rotaciones del legítimo se lee
  como sesión caducada. **Se detecta menos, no se falla más.**
- **No avisa al usuario** de que hubo un robo. Queda el evento en el registro.
- **El usuario legítimo también pierde la sesión** cuando se detecta reuso. Es correcto —no se sabe
  cuál de las dos copias es la suya— y es visible.

## Estado

Toca el camino de autenticación **y** el esquema: **`VALIDATION_PENDING`**.
