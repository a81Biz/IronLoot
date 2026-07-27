# spec-changes.md — PT-035: Iron Loot Design System

**PT-035** | **Fecha**: 2026-06-23

---

## 1. Correcciones al ENRICHMENT (detectadas en STATE 2)

Los siguientes Acceptance Criteria del ENRICHMENT eran incorrectos y se corrigen aquí:

### AC-CSP-01 — ELIMINADO (ya satisfecho)

**Original**: `src/apps/base/src/main.ts` debe incluir `'https://fonts.googleapis.com'` en `styleSrc` y `'https://fonts.gstatic.com'` en `fontSrc`.

**Corrección**: Verificado en `src/apps/base/src/main.ts:49-50` — la CSP **ya incluye** ambas directivas:
```typescript
styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
fontSrc:  ["'self'", 'https://fonts.gstatic.com', 'data:'],
```
**Estado**: ELIMINADO del scope. Sin acción requerida.

---

### AC-CSP-02 — ELIMINADO (ya satisfecho)

**Original**: `src/apps/client/src/main.ts` debe incluir las mismas directivas CSP para Google Fonts.

**Corrección**: Verificado en `src/apps/client/src/main.ts:32-33` — CSP ya incluye Google Fonts.

**Estado**: ELIMINADO del scope. Sin acción requerida.

---

### AC-CSP-03 — ELIMINADO (no aplica)

**Original**: `src/admin/src/main.ts` debe incluir directivas CSP para Google Fonts.

**Corrección**: `src/admin/src/main.ts` no implementa `helmet()` en absoluto. El admin carga Google Fonts directamente vía `<link>` en `admin.html` (líneas 7-10) sin restricción CSP. Sin CSP en el admin, no hay acción necesaria ni posible en `main.ts`.

**Estado**: ELIMINADO del scope. Sin acción requerida.

---

### AC-CSP-04 — RETENIDO como verificación positiva

**Original**: En navegador, la carga de Google Fonts no genera errores CSP en la consola.

**Estado**: Retenido. La verificación sigue siendo válida: confirmar en DevTools > Console que no hay errores CSP en ninguno de los 3 sitios (ya satisfecho en BASE/CLIENT antes de este PT; se verifica que no se rompa accidentalmente).

---

### AC-CLIENT-NAV-04 — MODIFICADO

**Original**: Los emojis de los nav-items son reemplazados por íconos SVG inline o eliminados en favor de texto puro.

**Corrección**: El admin nunca tuvo emojis (usa Material Symbols). El CLIENT sí tiene emojis en `client.html`. Se eliminan emojis del CLIENT sidebar y se reemplazan por texto plano (no SVG icons — no hay icon set disponible para CLIENT sin dependencia adicional).

**Estado**: MODIFICADO — solo aplica a CLIENT `client.html`.

---

## 2. Decisión de implementación (confirmada por el desarrollador)

**Logos**: SVG inline basado en el brief visual (`docs/design/Modo_Oscuro.md` + `docs/design/logos.png` como referencia), no PNGs recortados.

**Rationale**: Documentado en `design.md §1`.

---

## 3. Cambios a documentación del sistema

### docs/enterprise-documentation/05-UIUX-Brief.md

Actualizar en STATE 7 (History & Handoff) para reflejar:
- Sistema de tokens CSS (`--cl-*`, `--ff-*`) añadido
- Layout de home: 6 secciones según mockup Index.png
- Layout list: sidebar + grid
- SVG logo inline como patrón de brand

> Esta actualización es post-PT (State 7), no un prerequisito para implementación.

### docs/enterprise-documentation/11-Conventions.md — Delta Log

Añadir entrada en el Delta Log al cerrar PT-035:

```markdown
| 2026-06-23 | Design System Iron Loot implementado: tokens CSS --cl-*/--ff-*, SVG logo inline, layouts redesignados | PT-035 |
```

---

## 4. Sin cambios a

- Schema Prisma — ninguno
- DTOs — ninguno
- Controladores — ninguno
- Servicios — ninguno
- Variables de entorno — ninguno
- docker-compose.yml — ninguno
- Archivos .env.example — ninguno
- Tests unitarios — ninguno (no existe suite de tests para CSS/HTML)
- main.ts de cualquier sitio — ninguno
