# PT-118 — design.md

**FEATURE · STANDARD · PTSA H-008 / PENDIENTES DS-004 #2**

## D1 — Una línea base, no un umbral

La tentación es `npm audit --audit-level=high`. Fallaría desde el primer día por las 27 ya triadas,
el CI quedaría rojo permanente, y alguien lo desactivaría en una semana. **Así es como muere un
control**: no se borra, se ignora hasta que estorba.

La línea base dice qué se ha mirado **y por qué sigue ahí**. Lo que no esté en ella es nuevo, y lo
nuevo es lo único que importa: es lo que nadie ha decidido tolerar.

## D2 — Se compara paquete y severidad, no la cifra

«No más de 27» mide lo que no importa. 27 hoy y 27 mañana puede ser un arreglo y una entrada nueva,
y el número no lo distingue.

Comparar por paquete **y por severidad** cubre además el caso silencioso: un aviso conocido que sube
de `moderate` a `critical` sigue siendo el mismo paquete, pero ya no es la misma decisión.

## D3 — También corre a mano

`npm run audit:check`. Un control que sólo existe en el CI no se usa mientras se programa, y
entonces se descubre el problema al hacer *push* en vez de al instalar la dependencia.

## D4 — El fallo tiene que leerse sin abrir el JSON

Si el mensaje dice «3 vulnerabilidades nuevas» sin nombrarlas, el siguiente paso es abrir un JSON de
miles de líneas. La mitad de las veces eso significa que nadie lo mira.

El mensaje nombra el paquete, la severidad, la cadena por la que entra, y qué hacer.

## Lo que este PT NO hace

- **No arregla ninguna de las 27.** Eso es TD-015 y va en PT-119.
- No añade los checkpoints D3, D5 ni D1.N1, también declarados y también sin ejecutar. Cada uno mide
  algo distinto; meterlos aquí haría el PT irrevisable.
- No introduce un servicio externo.
