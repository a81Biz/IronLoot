# Manual de Administrador — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/D` (rutas admin), `B §Admin` (endpoints), `E` (config) |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 05-UIUX §Admin, 09-Security |
| **Código usado** | `src/admin/src/modules/*`, `admin.controller.ts` |
| **Nivel de confianza** | Alto |

> Backoffice en `admin.ironloot.local` (puerto 3001). Autenticación por **sesión** (usuario/contraseña + TOTP opcional). **Rol único** `isAdmin` — no hay sub-roles (finanzas vs moderación). ⚠️ Ver advertencias de seguridad al final.

## 1. Acceso

- Login en `/login` (usuario/contraseña; TOTP si `ADMIN_TOTP_SECRET` está configurado).
- ⚠️ **Cambiar credenciales por defecto**: `ADMIN_USERNAME/PASSWORD` traen defaults `admin`/`admin` y la API-key `dev-admin-key` (`AUD-004`). No usar en producción sin sobrescribir.

## 2. Módulos del backoffice (18)

| Grupo | Módulo | Acciones principales |
|---|---|---|
| Catálogo | **auctions** | listar, ver, aprobar/rechazar/suspender/cancelar/force-close/reopen |
| Catálogo | **lots** | bloquear/desbloquear, editar, categoría |
| Catálogo | **moderation** | cola de moderación (aprobar/rechazar) |
| Usuarios | **users** | suspender/banear/desbanear, habilitar/deshabilitar vendedor |
| Usuarios | **kyc** | aprobar/rechazar/pedir corrección |
| Finanzas | **orders** | listar (lectura) |
| Finanzas | **payments** | listar transacciones (lectura) |
| Finanzas | **refunds** | crear reembolso, cambiar estado |
| Finanzas | **reconciliation** | conciliar + exportar CSV (⚠️ stub, `AUD-016`) |
| Finanzas | **commissions** | config global/por vendedor, marcar cobrada |
| Fiscal | **cfdi** | generar/cancelar/descargar (✗ no funcional, `AUD-016`) |
| Operaciones | **disputes** | resolver a favor comprador/vendedor, pedir evidencia |
| Operaciones | **notifications** | campañas masivas |
| Operaciones | **reports** | financiero/operativo/fiscal + CSV |
| Operaciones | **audit** | visor de log inmutable + export |
| Config | **configuration** | plataforma, SMTP, storage, CFDI, pasarelas de pago |
| Config | **seo** | metadatos por página |
| Config | **cms** | contenido key/value |

## 3. Flujos clave

### Resolver una disputa ⚠️
1. `/disputes` → abrir la disputa.
2. Pedir evidencia si es necesario.
3. Resolver a favor del comprador o vendedor.
4. ⚠️ **La resolución NO ejecuta el reembolso automáticamente** (`AUD-010`). Si procede devolver dinero, hazlo en **Refunds → crear reembolso**.

### Configurar comisiones ⚠️
- Fija tasa **global** o **por vendedor** en `commissions`.
- ⚠️ **Nota:** hoy el cobro real al cierre usa un **10% fijo** independiente de esta configuración (`AUD-005`). La configuración se refleja en registros/reportes pero no necesariamente en el cobro.

### Emitir CFDI ✗
- La generación de CFDI **no está operativa** (falta proveedor PAC, `AUD-016`). Configura `CFDI_*` cuando se seleccione el PAC.

### Moderar subastas
- Aprobar/rechazar/suspender desde `auctions`. ⚠️ Estas acciones cambian el estado directamente sin pasar por las reglas de transición de dominio (`AUD-011`) — usar con criterio.

## 4. Configuración de plataforma (runtime)

Desde **configuration/platform** (persistido en SystemConfig): soft-close, moderación obligatoria, incremento mínimo (⚠️ no aplicado, `AUD-009`), duración de subasta, verificación de email, KYC obligatorio, expiración de pago, ventana de disputa. También SMTP, storage, pasarelas y CFDI.

## 5. Advertencias de seguridad (operación)

- ⚠️ **Sin CSP ni CSRF** en el backoffice (`AUD-007`): evita sesiones admin en navegadores con pestañas no confiables; usa red segura.
- ⚠️ Cambiar todas las credenciales/secretos por defecto antes de producción (`AUD-004`).
- ⚠️ Restringir el panel de **diagnostics** en producción (`AUD-025`).

Ver [FAQ y Mensajes](FAQ-y-Mensajes.md) y [Registro de Hallazgos](../transversal/Registro-de-Hallazgos.md).
