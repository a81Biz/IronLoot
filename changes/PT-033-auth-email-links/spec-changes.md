# PT-033 — Specification Changes

**PT**: PT-033  
**Fecha**: 2026-06-23

---

## PRD — Sin cambios

El comportamiento correcto siempre fue el documentado en PRD §1.1:
> "Password reset via email token (forgot-password → reset-password flow)"
> "Email verification required to activate account"

El bug era de implementación, no de especificación. El PRD no requiere cambios.

---

## TRD — Actualización: `BASE_URL` como variable de entorno requerida del servicio API

**Sección a actualizar:** `03-TRD.md` — añadir entrada en la tabla de configuración del servicio API.

**Cambio:**
```
| BASE_URL | URL del sitio BASE (sitio público). Usada por EmailService para construir |
|          | URLs de autenticación en emails (verify-email, reset-password).           |
|          | Valor dev local: http://localhost:5174                                    |
|          | Valor Docker: http://base.localhost                                       |
```

> Nota: `03-TRD.md` vive en `docs/enterprise-documentation/` que está gitignored.
> El cambio aplica a disco local. El delta queda registrado en `11-Conventions.md` Delta Log.

---

## API — Sin cambios de endpoints

Ningún endpoint de la API cambia. `POST /auth/verify-email` y `POST /auth/reset-password`
mantienen exactamente el mismo contrato. No hay cambios en DTOs ni en respuestas.

---

## Modelo de datos — Sin cambios

No hay modificaciones al schema Prisma ni migraciones.

---

## docker-compose.yml — Cambio operacional

**Servicio afectado:** `api`  
**Cambio:** Agregar al bloque `environment`:
```yaml
- BASE_URL=http://base.localhost
```

**Justificación:** El servicio `api` necesita conocer la URL del sitio BASE para que `EmailService`
construya correctamente las URLs de los emails transaccionales dentro de la red Docker.

---

## .env.example — Cambio documental

**Cambio:** Añadir en la sección de URLs de servicios:
```bash
# Public BASE site URL — used by the API's EmailService to build auth email links
# Local dev:   http://localhost:5174
# Docker:      http://base.localhost
# Production:  https://www.ironloot.com (or your public domain)
BASE_URL=http://localhost:5174
```

---

## 11-Conventions.md — Delta Log

Añadir entrada al Delta Log:

```
| 2026-06-23 | BASE_URL agregada como env var requerida del servicio API (EmailService) | PT-033 |
```
