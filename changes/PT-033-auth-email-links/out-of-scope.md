# PT-033 — Out of Scope

**PT**: PT-033  
**Fecha**: 2026-06-23

Las siguientes acciones están **explícitamente excluidas** de este PT.

---

## 1. Desbloqueo de usuarios existentes en `PENDING_VERIFICATION`

**Por qué excluido:** Los usuarios que se registraron mientras el bug estaba activo tienen su estado
atrapado en `PENDING_VERIFICATION`. La corrección del código no modifica datos existentes.
Desbloquearlos requiere una de estas acciones:
- Re-enviar email de verificación a usuarios afectados (acción admin).
- Implementar un endpoint `POST /admin/users/:id/resend-verification`.
- Un script SQL directo actualiza `state = 'ACTIVE'` para usuarios que consienten.

Estas opciones implican decisiones de negocio (¿quiénes son los afectados? ¿cuántos?) que están
fuera del alcance técnico de este fix. Se registran como deuda en `10-Technical-Debt.md`.

---

## 2. Endpoint "Reenviar email de verificación" (`POST /auth/resend-verification`)

**Por qué excluido:** Sería una mejora de producto (FEATURE), no parte de este bug fix.
Requiere STATE 1-E (Enrichment) propio, con criterios de aceptación, limitación de rate, etc.
Candidato para futuro PT vía FPGE.

---

## 3. Cambios en la lógica de `AuthController` o `AuthService`

**Por qué excluido:** La lógica de auth (register, login, verify-email, reset-password) es correcta.
Solo la URL de los emails estaba mal. No se toca ningún servicio de auth en este PT.

---

## 4. Migración de páginas de wallet en CLIENT a SSR completo

**Por qué excluido:** Mejora futura identificada en PT-028 (H-006). Candidato para un PT separado.
No relacionado con el bug de email links.

---

## 5. Cambios en el layout `layouts/client.html` para ocultar sidebar en 404

**Por qué excluido:** CLIENT siempre requiere autenticación para sus rutas. El 404 en CLIENT
con sidebar es el comportamiento correcto cuando un usuario autenticado navega a una ruta inexistente.
El problema era que los links de email llevaban al usuario a CLIENT en lugar de a BASE.
Al corregir los links, los usuarios nunca deberían llegar a CLIENT con estas URLs de auth.

---

## 6. CFDI/PAC integration (PT-027)

**Por qué excluido:** Bug totalmente diferente, bloqueado por decisión de negocio (selección de PAC SAT).

---

## 7. Variables de entorno adicionales no relacionadas con BASE_URL

**Por qué excluido:** Este PT solo documenta `BASE_URL` porque es la variable directamente
relacionada con el bug. Auditar y documentar todas las variables faltantes en `.env.example`
es un trabajo de mayor alcance para un PT separado o la siguiente ejecución de Foundation Protocol.

---

## 8. Cambios en nginx.conf

**Por qué excluido:** El routing de nginx ya es correcto: `^/auth → base.ironloot.local`.
El problema nunca estuvo en nginx — estaba en las URLs generadas en los emails.
No se toca `src/nginx/nginx.conf`.
