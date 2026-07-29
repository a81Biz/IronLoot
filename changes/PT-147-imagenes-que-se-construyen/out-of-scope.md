# PT-147 — Fuera de alcance

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **Escáner de vulnerabilidades de la imagen base** | `audit:check` mira npm y no la imagen | **TD-016** |
| 2 | **`src/nginx/Dockerfile`** | No es un servicio de aplicación: es el proxy, y probarlo de verdad exige tener detrás los cuatro | PT propio si se quiere |
| 3 | **Publicar imágenes** | `push: false`. Publicar exige registro y credenciales, que es una decisión de despliegue | — |
| 4 | **Tocar los `Dockerfile`** | Los creó PT-129 y arrancaban. Lo que faltaba era que CI lo comprobara | — |
| 5 | **Afinar el tamaño de la imagen del API** (541 MB, se lleva dependencias de desarrollo) | Registrado desde S-002. No es lo que este PT arregla | Pendiente conocido |
| 6 | **Un `docker-compose` de producción** | El compose actual usa los `.dev`. Unificarlos es otra decisión | PT propio |

## Lo que sí entra aunque parezca de otro

- **Arrancar, no sólo construir.** Es más caro y es la única forma de que este job signifique algo:
  H-017 fue exactamente una imagen que construía bien y no servía.
- **Volcar el log cuando una imagen no llega a `healthy`.** Sin eso, el job dice «falló» y obliga a
  reproducirlo a mano.
- **Al menos una construcción sin caché.** La caché tapó un lock roto durante un día en PT-135.

## Deuda que este PT NO deja

**Cero deuda diferida.** Lo que el triaje destape se corrige aquí si es del job, o abre PT si es del
repositorio.
