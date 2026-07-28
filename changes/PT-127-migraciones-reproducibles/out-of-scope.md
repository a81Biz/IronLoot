# PT-127 — Fuera de alcance

Explícito, para que nadie lo dé por incluido.

---

## No entra

### El job de CI de integración
`test-integration` no aplica esquema y no puede terminar en verde. **Es PT-128 (H-015).** Este PT
deja el `migrate deploy` que aquel necesita; no toca el job.

### Las imágenes de producción
El healthcheck a un 404 y los tres servicios sin `Dockerfile`. **Es PT-129 (H-017).**

### La documentación de arquitectura desactualizada
NestJS 10 vs 11, rutas de `health`. **Es PT-130 (H-016).** Sí entra la actualización de las
**tres** referencias que este PT vuelve falsas por sí mismo (cómo se aplica el esquema), que están
listadas en `spec-changes.md`.

### Qué migración concreta introdujo cada divergencia
Interesa para la arqueología, no cambia la corrección. La divergencia se corrige en bloque, no caso
por caso. **No se investiga.**

### Reescribir las 23 migraciones existentes [vía A]
En la vía A se conservan tal cual, con todos sus defectos, y se añade una que reconcilia. No se
tocan una a una: eso multiplicaría el riesgo sin reducir ninguno.

### Migrar a otra herramienta de esquema
Prisma se queda. No se evalúan alternativas.

### Optimizar índices o el modelo de datos
`schema.prisma` no se toca. Si al leerlo aparecen mejoras posibles, **se registran, no se aplican**.

### Copias de seguridad automatizadas
PT-127.0 hace **una** copia manual antes de operar. Una política de respaldo del entorno de
desarrollo es otra conversación.

### Retirar `db:push` de `package.json`
El script (`src/api/package.json:18`) se queda disponible para uso deliberado. Lo que se cierra es
que sea el **camino automático de arranque** (D3). Prohibirlo del todo es una decisión de política
que este PT no toma — y PT-037 ya demostró que prohibirlo por documentación no funciona; lo que
funciona es que un control lo detecte, que es D4.

### Entornos que este auditor no ve
Si existe un staging, una copia o la máquina de alguien con las migraciones aplicadas, **este PT no
lo arregla ni lo detecta**. Es exactamente la pregunta del Proposal Gate, y su respuesta cambia la
vía (`design.md` § D1).

---

## Se registra pero no se resuelve

| Observación | Dónde va |
|---|---|
| `--accept-data-loss` corriendo solo en cada arranque | **Sí se resuelve**: desaparece con D3 |
| El respaldo de `entrypoint.dev.sh:54` que se traga el error con un `echo` | **Sí se resuelve**: D3 |
| `D1.N1` y `D3` declarados como checkpoints sin job en CI | PT-128 |
| Que `ironloot_db` sea a la vez base de desarrollo y dato de auditoría | Riesgo estructural. Se anota en `HANDOFF.md`; merece su propio PT |

---

## Criterio de crecimiento

Si durante la ejecución aparece algo no previsto:

- **Bloquea el objetivo del PT** → entra, y se anota en el delta de `HISTORY.log`.
- **No lo bloquea** → se registra como hallazgo o pendiente y **no se arrastra**.

Es la regla que PT-119 aplicó al descubrir la segunda copia de `nodemailer`, y funcionó.
