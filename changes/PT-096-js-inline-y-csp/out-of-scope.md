# out-of-scope — PT-096

- **`'unsafe-inline'` en `styleSrc`.** Un estilo inline no ejecuta código. Otra directiva, otro
  riesgo, otro trabajo. Queda como deuda anotada.
- **Reescribir la lógica de los scripts extraídos.** Se mueven tal cual. Mezclar mudanza con
  cambio de comportamiento haría el resultado irrevisable — la misma razón por la que PT-091
  separó formato de fondo en dos commits.
- **`crossOriginEmbedderPolicy` y el resto de cabeceras de Helmet.** Solo se toca `scriptSrc`.
- **Tests unitarios en ADMIN.** Sigue sin infraestructura (F-31); por eso sus guardas viven en la
  suite de navegador.
