# PT-184 — Autorrevisión (FDGE STATE 5)

**Fecha**: 2026-07-29 · **Rama**: `fix/PT-184-las-pasarelas-sin-tope`
**Cierra**: H-034 (D3, MEDIA)

---

## Checklist

- [x] **Criterio verificado.** La «Corrección esperada» pedía un tope por llamada, **derivado y no elegido**, con
      la asimetría del dominio. Es lo que hay: `consulta` 8 s / `operacion` 20 s, y C3 pin­cha si alguien las
      igualara o invirtiera.
- [x] **Escenarios pasando.** 7 casos, suite de pagos **222/222**, suite completa **966 / 119 suites**,
      `typecheck` limpio, checkpoint D3 en la línea base (25) y el API en pie (`/health` 200).
- [x] **C1 y C2 vistos fallar** devolviendo la llamada de Mercado Pago a su forma original.
- [x] **Sin efectos colaterales.** Los tres adaptadores conservan su comportamiento: PT-179 (un 4xx del tercero
      no es avería nuestra) y PT-086 (la traza registra estado y duración) siguen intactos, y la suite de pagos
      completa lo confirma.
- [x] **Convenciones respetadas.** Es la aplicación directa de **RULE-36**, escrita en el PT anterior: declarar
      los topes de todo lo que hable con un tercero.
- [x] **Commits atómicos**, trazables a PT-184.
- [x] **Documentación al día**: HISTORY, PENDING_TASKS, HANDOFF, la ficha del hallazgo, E-037 y los derivados de
      PTSA en el delta sync S-008.

---

## Lo que no salió como estaba planeado

**1. El hallazgo lo encontró la recomendación del PT anterior, no yo.** S-007 cerró diciendo que los candidatos
siguientes eran los otros terceros —la pasarela de pago, Redis, el almacenamiento—. El primero de la lista tenía
el defecto.

Eso no es un acierto del barrido: **es la señal de que H-033 no era un caso aislado del correo.** Antes de hoy,
exactamente dos ficheros del API declaraban un tope, y los dos se escribieron hoy. No era un descuido puntual:
era la forma de este sistema al hablar con un tercero.

**2. C2 no supo fallar a la primera** — y es la **segunda vez en dos PT**. Sólo exigía que el fichero
*contuviera* `conSenalDeAborto`, y con eso bastaba la línea del `import`: al devolver una llamada a su forma sin
tope, el caso seguía verde. Ahora **cuenta** una envoltura por `fetch`.

El patrón de mi error es identificable y conviene nombrarlo: **compruebo que exista una cadena en vez de una
relación.** En PT-183 fue «que el bloque contenga H-032»; aquí, «que el fichero contenga el helper». Las dos
veces la corrección fue la misma: contar o acotar, en vez de buscar.

**3. C1 tuvo el error simétrico, y ése es peor.** Recortaba una ventana fija de 500 caracteres desde el `fetch`,
y el cuerpo de `POST /payments` de HeyBanco es más largo, así que **acusaba una llamada ya corregida**. Un falso
negativo deja pasar un defecto; **un falso positivo enseña a desconfiar de la guarda**, que es la forma
silenciosa de perderla. Ahora cierra por paréntesis balanceados.

**4. Encontré once capturas que parecen defectos y no lo son.** El barrido dio 11 `catch` sin `throw` ni
registro. Ninguno es hallazgo: están declarados en la línea base del checkpoint D3, que exige motivo escrito por
entrada, y los dos más sensibles están razonados en `CLAUDE.md`.

Lo anoto porque **el número por sí solo alarma**, y porque la lección es la de este PT y el anterior juntos: once
capturas sin `throw` suenan a once defectos y son once decisiones. **La diferencia la hace el motivo escrito** —
que es exactamente lo que faltaba en H-032, donde la captura tenía una **pregunta sin responder** en vez de una
razón.

---

## Lo que este PT NO afirma

- **Que se haya observado una llamada colgada contra una pasarela real.** El defecto está comprobado **leyendo**
  las seis llamadas y el directorio completo; la consecuencia se **infiere** del comportamiento de `fetch` sin
  señal. H-033 se **midió**; esto se leyó, y `[A1]` exige decirlo.
- **Que 8 s y 20 s sean los topes correctos.** Están derivados de la banda que el sistema ya usa con terceros y
  de la asimetría del dominio; **no medidos** contra las pasarelas bajo carga.
- **Que no queden terceros sin tope.** Quedan **Redis** y el **almacenamiento de ficheros**, los otros dos
  candidatos de la lista. No se han mirado, y siguen escritos como siguiente paso en vez de darse por hechos.
  Con Redis hay una ventaja: **se puede parar** en desarrollo, así que ahí el fallo se podrá **medir**.
