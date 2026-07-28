# PT-128 — Fuera de alcance

---

## No entra

### La reconciliación de migraciones
**Es PT-127 (H-014).** Este PT **depende** de que esté hecha: usa `migrate deploy` y necesita que
produzca un esquema correcto. No la arregla.

### El job `docker` y las imágenes de producción
La ruta `./Dockerfile` inexistente y los tres servicios sin imagen. **Es PT-129 (H-017).** Este PT
desbloquea el job; que lo que construye esté bien es del otro.

### La documentación desactualizada
**Es PT-130 (H-016).**

### Reescribir la suite e2e
No se refactorizan los 17 ficheros, no se añade cobertura, no se reorganizan. **Sólo se toca el
teardown de los que el diagnóstico señale.**

### Fallos legítimos que aparezcan en los 15 ficheros no probados
**Este es el límite importante.** Sólo se ha ejecutado `auth` (9 tests). Si al correr el resto
aparecen fallos reales de aplicación:

- **Se registran como hallazgos nuevos** (PTSA) o entradas de `DISCOVERY.md`.
- **No se arreglan aquí.**
- Si impiden que el job pase, se documenta cuáles y por qué el job queda rojo hasta que se traten.

Es la regla que PT-119 aplicó con la segunda copia de `nodemailer`: lo encontrado se registra, no se
arrastra.

### `audit:domain` en CI
Devolvería `SIN_DATOS` en cada corrida sobre una base vacía, y alguien acabaría leyéndolo como
verde. **Se reclasifica como métrica de delta sync** (D5 ya pasó por esto en PT-122). El trabajo de
este PT es escribir esa clasificación, no forzar el job.

### Despliegue continuo
`ci.yml` no tiene job de despliegue y **este PT no lo añade**. Decidir si el pipeline despliega es
una decisión de plataforma, no una corrección de defecto.

### Paralelizar la suite e2e
Sólo si B4 (duración > 10 min) lo obliga. No se optimiza por optimizar.

### Migrar de GitHub Actions
No.

---

## Se registra pero no se resuelve

| Observación | Dónde va |
|---|---|
| `npm install` en la raíz no genera el cliente Prisma | **Sí se resuelve**: D3 lo añade explícito |
| No se sabe desde cuándo el job está roto (`gh` no disponible) | Se anota en `HANDOFF.md`; requiere acceso al historial de Actions |
| `--passWithNoTests` enmascara la ausencia de tests | Se anota. Con 17 ficheros presentes hoy no engaña, pero es una bandera que puede dar un verde falso el día que alguien mueva la carpeta |

---

## Criterio de crecimiento

- **Impide que el job termine en verde** → entra, y se anota en el delta.
- **No lo impide** → se registra y no se arrastra.
