# out-of-scope — PT-101

- **Los 18 servicios de ADMIN.** Envoltorios de `fetch`; cubrirlos repetiría la implementación.
- **Tests de integración con Nest levantado.** Se intentó en PT-097 y **cuelga**: importar los
  módulos arrastra Redis y BullMQ.
- **Umbral de cobertura.** Un número invita a escribir tests para el número.
- **Los controladores de ADMIN.** Renderizan plantillas; lo que importa de ellos —que las
  plantillas no lleven JavaScript— ya lo cubre `plantillas-sin-js-inline.spec.ts` (PT-096).
