# PT-102 — out-of-scope.md

Lo que este PT **no** hace, dicho para que no se busque:

| Fuera de alcance | Por qué |
|---|---|
| **Empaquetar socket.io localmente** | Eliminaría la clase entera de fallo, pero exige un empaquetador en un frontend que es JS plano por decisión explícita. Cambio de arquitectura, no arreglo de bug. Anotado en `design.md` §D1 para que la decisión sea trazable |
| **Revisar los otros 21 ficheros JS de navegador** | Se comprobó que **ninguno** tiene el problema: solo dos plantillas cargan scripts externos y la de ADMIN tiene el orden correcto. Mirar más sería trabajo sin hallazgo |
| **Los otros dos `catch`** (`dashboard-charts.js`, `pages-auth-login.js`) | **No son mudos**: uno hace `console.warn`, el otro avisa al usuario. Ya cumplen la regla |
| **Las capturas `undefined.png` de la suite** | Defecto real y anotado en `HANDOFF.md`, pero de otra familia. Mezclarlo haría el commit irrevisable — misma razón por la que PT-091 separó formato de fondo |
| **Extender la guarda a BASE y ADMIN** | La guarda se escribe para CLIENT, que es donde vive el fallo. Se **comprueba** que ADMIN pasaría, pero generalizarla a los tres sitios sin un fallo que lo justifique es especulación |
| **Cerrar el bug** | FDGE: el agente no cierra bugs. Termina en `VALIDATION_PENDING` |
| **Validar PT-096 y PT-098** | Se desbloquean con este PT, pero quien los valida es el humano |
