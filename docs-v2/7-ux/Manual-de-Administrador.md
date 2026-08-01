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
- ✅ **En producción el arranque las rechaza** (`AUD-004` corregido, PT-036): `validateStartupConfig` aborta si `ADMIN_USERNAME` es `admin`, si `ADMIN_PASSWORD` es un placeholder o si los secretos son conocidos. En desarrollo siguen siendo `admin`/`admin`, así que **cámbialas igual** antes de exponer el panel. No usar en producción sin sobrescribir.

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
4. ✅ **Resolver a favor del comprador ejecuta el reembolso en el mismo acto** (`AUD-010` corregido, PT-191). El importe **sale del vendedor**: de su holdback si la venta sigue retenida, y si ya se liberó le queda un descubierto que no podrá retirar hasta cubrir. No hay que hacer nada en **Refunds** después.

### Configurar comisiones ⚠️
- Fija tasa **global** o **por vendedor** en `commissions`.
- ✅ **Corregido (`AUD-005`, PT-042).** El cobro al cierre usa **esta** configuración: `auction-scheduler` resuelve la tasa con `commissionsService.resolveRatePercent(sellerId)` y con ella calcula el neto del vendedor.

### Emitir CFDI ✗
- La generación de CFDI **no está operativa** (falta proveedor PAC, `AUD-016`). Configura `CFDI_*` cuando se seleccione el PAC.

### Moderar subastas
- Aprobar/rechazar/suspender desde `auctions`. ✅ Las seis acciones pasan por `AuctionStateMachine` (`AUD-011` corregido, PT-191): una transición imposible —aprobar algo que ya corre, reabrir una cerrada— se rechaza nombrando las dos puntas, en vez de aplicarse en silencio.

### Aprobar KYC del vendedor (PT-069)
1. `kyc` → revisar los documentos de la solicitud (estado PENDING).
2. **Aprobar** (`PATCH /admin/kyc/:id/approve`) habilita `isSeller` y desbloquea vender y retirar (`RN-62`). Rechazar/pedir corrección según el caso.

### Procesar un retiro del vendedor (PT-072) — payout manual

> **Corregido en PT-232.** Este procedimiento se describía como flujo **de pantalla** y esa pantalla
> **no existía**: `grep -rn "withdraw" src/admin` devolvía cero resultados. El administrador habría
> tenido que operar por API a mano para pagar a los vendedores. La entrega `PT-216`, en **Finanzas →
> Retiros**.

1. **Finanzas → Retiros** (`/withdrawals`, filtrable por estado) → cola de solicitudes. Cada una muestra vendedor, monto y método (CLABE + titular).
2. **Aprobar** (`PATCH /admin/withdrawals/:id/approve`): REQUESTED→APPROVED (los fondos ya están reservados desde que el vendedor solicitó, `RN-65`).
3. **Ejecutar la transferencia SPEI manualmente** desde la banca a la CLABE del titular.
4. **Marcar pagado** (`PATCH /admin/withdrawals/:id/mark-paid`): APPROVED→PAID; registra `payoutReference`. ⚠️ Marca PAID **sólo tras** confirmar el SPEI (`RN-66`, `PayoutProvider` manual).
5. **Rechazar** (`PATCH /admin/withdrawals/:id/reject`, motivo): REQUESTED/APPROVED→REJECTED y **reintegra** el saldo al vendedor automáticamente. La dispersión automática llegará en Fase 2 (`RN-67`).

## 4. Configuración de plataforma (runtime)

Desde **configuration/platform** (persistido en SystemConfig): soft-close, moderación obligatoria, incremento mínimo (`AUD-009` corregido: se aplica), duración de subasta, verificación de email, KYC obligatorio, expiración de pago, ventana de disputa. También SMTP, storage, pasarelas y CFDI.

## 5. Advertencias de seguridad (operación)

- ✅ **Con Helmet y CSP** (`admin/src/main.ts:21-22`, `AUD-007` corregido). El CSRF se mitiga por `SameSite=Lax` en la sesión de ADMIN y Bearer hacia el API — **los tokens de doble envío no se usan, y es una decisión escrita**, no un olvido.
- ✅ Cambiar credenciales y secretos por defecto: en producción **el arranque falla si no se hace** (`AUD-004` corregido).
- ✅ **`diagnostics` no existe en producción**: todo el controlador va detrás de `DevelopmentOnlyGuard`. `AUD-025` corregido.

Ver [FAQ y Mensajes](FAQ-y-Mensajes.md) y [Registro de Hallazgos](../transversal/Registro-de-Hallazgos.md).
