# PT-203 — evidencia

## Por qué existe este PT, y es lo primero que hay que decir

`S-012` cerró `H-037` y dejó la guarda escrita como *«recomendación para FDGE»*, sin ejecutarla,
invocando que PTSA audita y no escribe código.

**Esa separación es real y no autorizaba a parar.** Prohíbe escribir código **dentro** del sync; no
prohíbe cerrar el sync y abrir el PT acto seguido. Convertí un traspaso en una parada, con la
instrucción explícita de no dejar nada pendiente encima de la mesa. Este PT es esa parada deshecha.

## Lo que faltaba en el contrato

`RULE-31` decía *«la evidencia que un documento cita está en git»* y su guarda medía **sólo**
`docs/implementation/evidence/`. Las `E-XXX` de PTSA —**lo que sostiene el veredicto de cada
hallazgo**— llevaban tres meses fuera.

La regla nació de un problema de `.gitignore` y se escribió mirando esa carpeta. **La pregunta que hace
es más general que el sitio donde se aplicó**, y la mitad no vigilada resultó ser la que falló.

## La guarda, vista fallar con sabotaje comprobado

Se sabotea `H-037` para que cite una evidencia inexistente, **comprobando que el reemplazo se aplicó**
antes de ejecutar nada:

```
  sabotaje APLICADO y verificado: H-037 cita E-998, que no existe

✕ C5: ningun hallazgo cita una evidencia que no existe
    + Array [
    +   "H-008 → E-011",
    +   "H-037 → E-998",
    + ]
```

## Y cazó algo que yo daba por corregido

**`H-008 → E-011` seguía roto.** En `S-012` declaré la pérdida de `E-011` en una `## Revisión`… y **dejé
la cita del frontmatter apuntando a un fichero inexistente**. La prosa decía la verdad y el campo
legible por máquina seguía mintiendo.

Es la lección de `RULE-38` girada: allí el defecto era **cambiar el símbolo y dejar la frase** —un `⚠️`
por un `✅` sin tocar el texto—; aquí fue **escribir la frase y dejar el símbolo**. Las dos mitades
tienen que moverse, y una guarda que sólo lee una de las dos no lo nota.

Corregido: `evidencias: [E-013]`, con la nota de por qué. El frontmatter de un hallazgo es actualizable;
el cuerpo, append-only — se respetan las dos cosas.

## Verificación

```
✓ C5 · AC-08 · AC-09 · AC-10        (los tres controles, en los dos sentidos)
guardas de documentación:  20 suites / 214 pruebas
suite completa del API:   139 suites / 1143 pruebas
```

## Por qué es FEATURE y no BUG

El defecto (`H-037`) **ya está cerrado**: las dos citas rotas se corrigieron en S-012 y aquí se completó
la que quedaba a medias. Lo que añade este PT es **cobertura nueva de una regla existente** — que es
exactamente lo que FDGE clasifica como FEATURE, con criterios de aceptación verificables:

- [x] `RULE-31` amplía su alcance a las `E-XXX`, con el motivo escrito y su fila en el Delta Log.
- [x] La guarda falla con una cita inventada, nombrándola.
- [x] Tres casos de control: extracción sólo del frontmatter, acusación, y no-pasar-en-vacío.
- [x] Cero citas rotas en los 37 hallazgos.
