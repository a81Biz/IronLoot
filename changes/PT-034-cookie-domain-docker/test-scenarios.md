# PT-034 — Test Scenarios

**PT:** PT-034  
**Fecha:** 2026-06-23

---

## Nota metodológica

PT-034 es un fix de **configuración de entorno puro** — no se modifica ningún archivo en `src/`. RULE-06 (tests RED antes de código) aplica a código de aplicación; aquí no hay lógica nueva que cubrir con unit tests. Los test scenarios son verificaciones de integración/E2E que confirman el comportamiento antes y después del fix.

Los escenarios TS-034.1 a TS-034.3 son **RED antes del fix** (comportamiento actual bugueado) y **GREEN después del fix** (comportamiento esperado). TS-034.4 y TS-034.5 son verificaciones de no-regresión.

---

## TS-034.1 — Login con credenciales válidas completa el flujo (principal)

**Pre-condición:** Stack Docker corriendo con `base.localhost` y `client.localhost`. Usuario ACTIVE con email verificado existe en la BD.  
**Pasos:**
1. Navegar a `http://base.localhost/auth/login`
2. Ingresar email y contraseña válidos
3. Hacer click en "Entrar"

**RED (antes del fix):** Página vuelve a mostrar `http://base.localhost/auth/login` — usuario no llega al dashboard.  
**GREEN (después del fix):** Navegador navega a `http://client.localhost/dashboard` — usuario autenticado ve su dashboard.

---

## TS-034.2 — Cookie `access_token` tiene atributo `Domain=.localhost`

**Pre-condición:** Stack Docker corriendo. Usuario ha completado login exitosamente.  
**Verificación:** En DevTools (Application > Cookies > `base.localhost`), la cookie `access_token` muestra:
- `Domain: .localhost` (con punto inicial)
- `HttpOnly: true`
- `SameSite: Lax`

**RED (antes del fix):** `Domain` vacío o scoped a `base.localhost` sin punto.  
**GREEN (después del fix):** `Domain: .localhost` visible en DevTools.

---

## TS-034.3 — Logout limpia correctamente la cookie

**Pre-condición:** Usuario autenticado en `client.localhost/dashboard`.  
**Pasos:**
1. Hacer click en "Cerrar sesión" (o navegar a `GET /auth/logout`)
2. Verificar en DevTools que `access_token` ya no existe

**RED (antes del fix):** N/A (no se llegaba al dashboard).  
**GREEN (después del fix):** Cookie `access_token` eliminada de `Domain: .localhost` — no visible en ningún subdominio.

---

## TS-034.4 — Credenciales incorrectas muestran error en formulario

**Pre-condición:** Stack Docker corriendo. Cualquier estado de BD.  
**Pasos:**
1. Navegar a `http://base.localhost/auth/login`
2. Ingresar email válido + contraseña incorrecta
3. Hacer click en "Entrar"

**Expected (antes y después del fix):** `#loginError` visible con texto "Credenciales incorrectas." o mensaje del API. La página NO navega a ningún otro lado.

---

## TS-034.5 — Tests de regresión API: 153/153 pasan

**Comando:** `cd src/api && npm test --no-coverage`  
**Expected:** 29 suites, 153 tests, 0 failures.  
**Aplica:** Antes Y después del fix (los cambios de configuración no deben afectar tests unitarios).

---

## TS-034.6 — Build limpio de BASE y CLIENT

**Comandos:**
- `cd src/apps/base && npm run build`
- `cd src/apps/client && npm run build`

**Expected:** Ambos exits 0, sin errores TypeScript.  
**Aplica:** Después del fix (los archivos modificados son docker-compose y .env.example, no TypeScript).
