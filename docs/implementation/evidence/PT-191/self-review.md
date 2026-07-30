# PT-191 — Self-Review (FDGE STATE 5)

**Objetivo:** cerrar los cinco `AUD` que la tabla de veredictos declaraba **abiertos** —AUD-006,
AUD-010, AUD-011, AUD-012 y AUD-027—, cada uno hasta el final y con guarda.

## Lo que hay que decir antes que nada: ninguno era lo que su enunciado decía

| Hallazgo | Lo que decía el enunciado | Lo que había, medido |
|---|---|---|
| **AUD-027** | «dos rutas de config SMTP» — suena cosmético | El panel tenía un **formulario completo** que guardaba y respondía «guardado», y el mailer lee `MAIL_*` del entorno: **no configuraba nada**, ni entonces ni tras reiniciar |
| **AUD-011** | «`admin.service.ts` no menciona `AuctionStateMachine`» | **Seis** operaciones escribiendo `status` a mano, dos sin llamar siquiera a `assertAuctionModifiable` — y **la máquina estaba incompleta**: cablearla sin completarla habría roto la moderación |
| **AUD-010** | «resolver una disputa no mueve dinero» | **Tres** defectos encadenados. El tercero: `createRefund` sólo acredita, así que cablearlo sin más habría **impreso dinero** |
| **AUD-012** | «el VO `Money` no lo importa nadie» | **30 de 42** símbolos de `core` sin un solo consumidor. Y uno de ellos no estaba muerto: **mentía** sobre cómo se valida un IPN |
| **AUD-006** | «el WebSocket no autentica el handshake» | Cierto **y deliberado**. Lo que faltaba no era autenticación: era que la decisión fuera comprobable. Y había dos armas cargadas apuntándole, ambas con cero llamantes |

Es la respuesta a *«¿por qué siempre salen más casos?»*: **el enunciado de un hallazgo es su síntoma,
no su tamaño.** Revisar «qué falta» leyendo enunciados devuelve la lista de síntomas.

## Checklist

- [x] **Cada hallazgo cerrado hasta el final**, no hasta que el síntoma desaparece.
- [x] **Tests-first**: las cinco guardas se escribieron en RED. `resolver-mueve-dinero` falló con
      `TS2339: Property 'reversarVenta' does not exist`; `emisiones-publicas` falló C1/C2/C3.
- [x] **Cada guarda vista fallar por su propio motivo.** Sabotaje dirigido en AUD-010: quitar el
      congelado por disputa tumba **sólo** C2; dejar de cargar al vendedor tumba **sólo** C3. Ningún
      otro caso se disparó de más.
- [x] **Casos de control en los dos sentidos** en las cinco guardas.
- [x] Sin regresiones: **1043 pruebas / 128 suites** en el API; **93 / 6 suites** en `core`.
- [x] Documentación actualizada: 49 reescrituras en 13 documentos de `docs-v2/`, la tabla de
      veredictos, `10-Technical-Debt.md` (ND-001 corregida + `TD-024` nueva) y `CLAUDE.md`.
- [x] Sin artefactos de depuración ni código comentado.

## Lo que se hizo mal por el camino, porque también es evidencia

1. **La guarda de `core` se leyó a sí misma.** `HUERFANOS_DECLARADOS` nombra los 24 símbolos, así que
   contaba como su propio consumidor: encontraba **cero** huérfanos y `C1` pasaba **en vacío**. Verde
   por no medir nada. Lo delató `C3`, que compara la cuenta contra la lista en vez de conformarse con
   «no hay huérfanos nuevos». Es el tercer caso de esta familia en la jornada.
2. **Una mención en prosa contaba como consumo.** `IPaymentProvider` salía «usado» por **un
   comentario** de `test-app.ts` — que además era falso, citaba el contrato equivocado. Se descartan
   los comentarios antes de medir, y se corrigió la cita.
3. **Metí un símbolo en la lista de declarados por suposición**, no del listado medido
   (`IPaymentProvider` sí tenía consumidor). Lo cazó `AC-02`, que existe justo para eso.
4. **Un sabotaje mal hecho no mide.** El primer intento rompió la compilación: «0 tests» no es «la
   guarda falló». Se rehízo quirúrgico, conservando sintaxis válida.
5. **Acepté un `OK` sobre una base vacía.** La comprobación del filtro de disputas dio `0 === 0` —el
   `SIN_DATOS` que la lección de PT-122 dice no aceptar—. Se resolvió leyendo **el SQL que genera
   Prisma**, que es más concluyente que un conteo: el `j1.id IS NOT NULL` que añade es lo único que
   evita que la lógica ternaria de SQL congelara **toda** la liquidación en silencio.

## Estado

Los cinco son **BUG**: quedan en `VALIDATION_PENDING`. El agente no cierra bugs (FDGE STATE 6).
