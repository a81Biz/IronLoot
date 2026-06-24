# PT-033 — Test Scenarios

**PT**: PT-033  
**Fecha**: 2026-06-23  
**Tipo**: BUG — los escenarios de reproducción deben estar en RED antes del fix.

---

## Escenarios unitarios (automatizados) — `email.service.spec.ts`

### TS-033.1 — [RED antes del fix] `sendVerificationEmail` genera URL con BASE_URL

**Archivo:** `src/api/test/unit/notifications/email.service.spec.ts`

```
Dado:   ConfigService.get('BASE_URL') devuelve 'http://test-base.localhost'
Cuando: emailService.sendVerificationEmail('user@test.com', 'abc123')
Entonces:
  - mailerService.sendMail fue llamado 1 vez
  - el context.url pasado al template empieza con 'http://test-base.localhost'
  - el context.url contiene '/auth/verify-email?token=abc123'
  - el context.url NO contiene 'client' ni '5175' ni '5173'
```

**Estado esperado antes del fix:** FAIL (URL contiene `5173` o `client`)  
**Estado esperado después del fix:** PASS

---

### TS-033.2 — [RED antes del fix] `sendPasswordResetEmail` genera URL con BASE_URL

```
Dado:   ConfigService.get('BASE_URL') devuelve 'http://test-base.localhost'
Cuando: emailService.sendPasswordResetEmail('user@test.com', 'xyz789')
Entonces:
  - mailerService.sendMail fue llamado 1 vez
  - el context.url empieza con 'http://test-base.localhost'
  - el context.url contiene '/auth/reset-password?token=xyz789'
  - el context.url NO contiene 'client' ni '5175' ni '5173'
```

**Estado esperado antes del fix:** FAIL  
**Estado esperado después del fix:** PASS

---

### TS-033.3 — Fallback cuando BASE_URL no está configurada

```
Dado:   ConfigService.get('BASE_URL') devuelve undefined (variable no configurada)
Cuando: emailService.sendVerificationEmail('user@test.com', 'abc123')
Entonces:
  - el context.url empieza con 'http://localhost:5174'
  - el context.url contiene '/auth/verify-email?token=abc123'
```

**Estado esperado antes del fix:** FAIL (default era `5173`)  
**Estado esperado después del fix:** PASS

---

### TS-033.4 — Error en mailer no propaga la excepción

```
Dado:   mailerService.sendMail lanza un error
Cuando: emailService.sendVerificationEmail('user@test.com', 'token123')
Entonces:
  - No se lanza ninguna excepción (error tragado deliberadamente)
  - El logger registra el error
```

**Estado esperado:** PASS (comportamiento ya correcto — test de regresión)

---

## Escenarios de integración / verificación manual

### TS-033.5 — [Manual] Email de verificación apunta a BASE

```
Pasos:
  1. Iniciar stack con docker-compose up -d
  2. POST /api/v1/auth/register { email: "test@test.com", username: "tester", password: "Pass1234!" }
  3. Abrir Mailhog en http://localhost:8025
  4. Inspeccionar el email de verificación recibido

Resultado esperado:
  - El link en el email contiene 'base.localhost/auth/verify-email?token='
  - El link NO contiene 'client.localhost' ni 'localhost:5173' ni 'localhost:5175'
```

---

### TS-033.6 — [Manual] Flujo completo registro → verificación → login

```
Pasos:
  1. POST /api/v1/auth/register (nuevo usuario)
  2. Copiar link del email en Mailhog
  3. Navegar al link en browser: http://base.localhost/auth/verify-email?token=...
  4. Verificar que la página dice "¡Correo verificado!"
  5. Hacer clic en "Iniciar sesión"
  6. Ingresar credenciales

Resultado esperado:
  - Paso 3: Página BASE renderiza (layouts/base.html, sin sidebar)
  - Paso 4: fetch a /api/v1/auth/verify-email retorna 200
  - Paso 6: Login exitoso → redirect a CLIENT /dashboard
```

---

### TS-033.7 — [Manual] Flujo completo forgot-password → reset-password → login

```
Pasos:
  1. POST /api/v1/auth/forgot-password { email: "user@test.com" }
  2. Copiar link del email en Mailhog
  3. Navegar al link: http://base.localhost/auth/reset-password?token=...
  4. Completar el formulario con nueva contraseña
  5. Hacer clic en "Cambiar contraseña"
  6. Login con nueva contraseña

Resultado esperado:
  - Paso 3: Página BASE renderiza con el formulario de nueva contraseña
  - El hidden input #token contiene el token del query param
  - Paso 5: POST /api/v1/auth/reset-password retorna 200
  - Paso 6: Login exitoso
```

---

### TS-033.8 — [Manual] 404 en BASE renderiza página pública (sin sidebar)

```
Pasos:
  1. Con el stack corriendo, navegar a http://base.localhost/ruta-que-no-existe

Resultado esperado:
  - HTTP status: 404
  - Response: HTML (no JSON)
  - Layout: layouts/base.html (cabecera + pie de página público, SIN sidebar)
  - Texto: "La página que buscas no existe o ha sido movida."
```

---

## Matriz de cobertura

| Escenario | Tipo | Criterio cubierto | Automatizado |
|---|---|---|---|
| TS-033.1 | Unit | URL verify-email apunta a BASE_URL | ✅ Jest |
| TS-033.2 | Unit | URL reset-password apunta a BASE_URL | ✅ Jest |
| TS-033.3 | Unit | Default correcto si BASE_URL no configurada | ✅ Jest |
| TS-033.4 | Unit | Error de mailer no rompe el flujo | ✅ Jest |
| TS-033.5 | Manual | Email generado en Docker apunta a BASE | Manual |
| TS-033.6 | Manual | Flujo completo de verificación funciona | Manual |
| TS-033.7 | Manual | Flujo completo de reset-password funciona | Manual |
| TS-033.8 | Manual | BASE 404 es página HTML pública | Manual |
