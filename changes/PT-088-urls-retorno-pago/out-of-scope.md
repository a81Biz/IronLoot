# out-of-scope — PT-088

- **HTTPS y certificados.** `PUBLIC_SCHEME=https` está soportado por la configuración, pero ni se
  emitieron certificados ni se añadió el bloque `listen 443` a nginx. Es trabajo de despliegue.
- **El clic del checkout de Mercado Pago.** Exige credenciales de un comprador de prueba que no
  tenemos. Se demuestra la redirección, el retorno y la acreditación; el cobro se crea con la
  Orders API, que es el mismo pago real.
- **Las páginas de retorno de retiros, reembolsos y órdenes.** Solo se unificó el depósito.
- **Stripe y HeyBanco.** Sus adaptadores ya usan la fuente única, pero no están configurados y no
  se verificaron contra sus pasarelas.
- **Los dos scripts de ADMIN** que entraron al repositorio al corregir el `.gitignore`
  (`src/admin/public/js/`). Estaban sin versionar; se incorporan tal cual, **sin revisar su
  contenido**. Merecen una lectura.
- **El resto del JavaScript de navegador que sigue inline** en las plantillas. Funciona porque la
  CSP de los sitios SSR permite `'unsafe-inline'`, pero es una deuda: el script nuevo de PT-088 sí
  es un fichero.
