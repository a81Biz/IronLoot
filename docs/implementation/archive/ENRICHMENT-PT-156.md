# ENRICHMENT.md — PT-156

**STATE 1-E.** `FEATURE`, promovido desde `R-017` (FPGE-003).

> **Estado: espera una decisión de producto.** El paquete de la tanda lo declaró bloqueado y sigue
> siéndolo. Aquí están las tres alternativas con sus criterios; **no implemento ninguna**, porque
> elegir sería decidir por ti un rasgo del producto.

---

## El hecho, verificado

`ratings.controller.ts:17` aplica `@UseGuards(JwtAuthGuard)` a toda la clase, así que
`GET /api/v1/users/:userId/ratings` (línea 28) **exige sesión**.

## Por qué está en el roadmap

Es exactamente el dato que un comprador consulta **antes** de tener cuenta. La protección impide el
uso que justifica el dato: quien evalúa si registrarse en una plataforma de subastas mira la
reputación de los vendedores, y aquí no puede.

Detectado en S-002-V y marcado desde entonces como **«Humano decide»** — nunca fue un bug con
tratamiento obvio.

## Por qué NO lo decido yo

Puede haber una razón deliberada, y las tres que se me ocurren son legítimas:

- **Raspado de reputación** por un competidor.
- **Privacidad del vendedor** — el número de valoraciones revela volumen de ventas.
- **Inferencia comercial**: con el histórico se reconstruye la actividad de un vendedor.

Abrirlo sin saber cuál pesa sería elegir por el producto.

## Las tres alternativas

### A) Abierto, sin más

`@Public()` en el endpoint.

- **Criterios de aceptación:** un cliente sin sesión recibe 200 con las valoraciones · un usuario
  inexistente recibe 404, no 401 (hoy 401 filtra si el guard va antes) · nada del perfil privado
  viaja en la respuesta.
- **A favor:** resuelve el caso de uso entero, coste mínimo.
- **En contra:** raspado trivial. El rate limiting global (100/min) no lo impide de verdad.

### B) Abierto con límite de tasa agresivo — **la recomendación, si hay que elegir una**

`@Public()` + `@Throttle` propio, del orden de 10/min por IP.

- **Criterios:** los de A · la petición 11 en un minuto recibe 429 · el límite es **configurable por
  variable**, no una constante enterrada.
- **A favor:** el caso de uso funciona y el raspado masivo cuesta.
- **En contra:** un límite por IP no detiene a quien rote direcciones. Levanta el listón, no cierra la
  puerta.

### C) Agregado público, detalle con sesión

Endpoint nuevo `GET /users/:id/reputation` que devuelve **media y total**, público. El detalle
—comentarios, quién valoró, cuándo— sigue exigiendo sesión.

- **Criterios:** sin sesión se obtiene media y recuento y **nada más** · el detalle sigue en 401 ·
  el agregado no permite reconstruir el histórico (sin fechas, sin desglose por periodo).
- **A favor:** el comprador ve lo que necesita para decidir; el competidor no obtiene el histórico.
- **En contra:** un endpoint más que mantener, y hay que definir qué es «suficiente agregado».

## Fuera de alcance, decida lo que decida

- Cambiar cómo se **calculan** las valoraciones.
- Tocar el resto de endpoints de `RatingsController`.
- Exponer datos de perfil que hoy no salen por ninguna vía pública.

## NFR aplicables

- **Seguridad:** ninguna alternativa expone el correo, el teléfono ni el RFC del vendedor.
- **Rendimiento:** al ser público entra en la superficie cacheable; conviene `Cache-Control` corto.
- **Coherencia:** si se abre, **`rutas-que-los-ssr-invocan.spec.ts` (PT-148) ya cubre** que BASE lo
  invoque correctamente. Esa guarda se amplió esta misma jornada.

## Qué hace falta para desbloquear

**Una línea tuya: A, B o C.** Con eso, PT-156 pasa a STATE 2 y se implementa con sus pruebas.

## Estado

`BLOCKED` — esperando decisión de producto. No es trabajo pendiente de hacer: es trabajo pendiente de
**decidir**, y el registro que manda para eso es `PENDING_TASKS.md`.
