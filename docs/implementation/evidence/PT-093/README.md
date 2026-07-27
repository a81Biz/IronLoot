# Evidencia — PT-093 (TD-004)

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-093-admin-segundo-factor`

## El defecto

`app.controller.ts:26` calculaba `requiresTotp = !!process.env.ADMIN_TOTP_SECRET`, y la variable
**viene vacía por defecto**. En producción el backoffice podía quedar protegido solo con usuario
y contraseña sin que nada lo advirtiera.

El backoffice aprueba retiros, suspende usuarios y cancela subastas: es el contexto de más
privilegio del sistema.

## La corrección

El proyecto ya tenía el sitio exacto: `validateStartupConfig`, una función **pura** que devuelve
la lista de errores y solo aplica en producción — la misma que protege `JWT_SECRET`,
`SESSION_SECRET` y las credenciales admin desde PT-036. Se añade ahí, en vez de inventar un
mecanismo nuevo.

**Mínimo de 16 caracteres**: es un secreto TOTP base32 de 80 bits (RFC 4226 recomienda 128). Más
corto reduce el espacio de búsqueda y anula el segundo factor que se pretende.

**En desarrollo no se exige.** Obligar un segundo factor para entrar a un panel local no compensa
y llevaría a desactivarlo de formas peores.

## Verificado

4 tests: falla sin secreto, falla con secreto corto, pasa con secreto válido, y **no aplica en
desarrollo**.

Además, `VALID_PROD` del propio spec —que define «configuración de producción válida»— tuvo que
incluirlo. Es la comprobación más limpia de que la regla entró donde debía: rompió la definición
existente de configuración válida.

API **63 suites / 452 tests**.
