# PT-150 — Escáner de vulnerabilidades de la imagen base

## El hueco

`npm run audit:check` compara los paquetes npm contra `security-baseline.json`. **La imagen base no
la miraba nadie.** `node:20-alpine` trae su propio sistema de ficheros, sus librerías de sistema y su
OpenSSL, y nada de eso aparece en un `npm audit`.

No es que saliera verde: es que no se miraba. En superficie de producción.

## Lo construido

Un paso en el job `docker` de CI —**que ya tiene las imágenes construidas** desde PT-147, así que no
hay que reconstruir nada— más `src/api/scripts/base-image-audit.js` y su línea base declarada.

Corre **después** de arrancar las imágenes, para que un fallo del escáner no pueda confundirse con un
fallo de arranque.

## Verificado en las tres direcciones

```
1) Vulnerabilidad nueva, sin triar
   [base-image] 1 vulnerabilidad(es) NUEVA(s):
     HIGH  CVE-2099-0001  openssl 3.1.0  → corregida en 3.1.4
   EXIT=1

2) La misma, triada en la línea base
   [base-image] OK — Sin novedades respecto a la línea base.
   EXIT=0

3) Sin fichero de línea base
   [base-image] FALTA la línea base: …/base-image-baseline.json
   [base-image] Sin ella no se puede distinguir «nuevo» de «ya triado». Se aborta.
   EXIT=1
```

La tercera importa tanto como las otras dos: **un control que se aprueba a sí mismo cuando falta su
configuración es un control que no existe** (RULE-14). Aquí aborta nombrando el fichero, que es la
misma decisión que RULE-17 toma con las variables de conexión.

## Por qué línea base y no «cero vulnerabilidades»

Un control que rompe el pipeline el primer día acaba desactivado, y con él todo lo que protegía — la
lección de PT-103. `security-baseline.json` tiene la misma forma por el mismo motivo.

La línea base **nace vacía a propósito**: se declara el mecanismo antes de conocer lo que mide. La
primera corrida en CI producirá el inventario real, guardado como artefacto 30 días.

**Y no es una lista de excusas**: cada entrada exige `id`, `fecha` y `motivo`. Llenarla sin justificar
cada línea es exactamente cómo este control dejaría de valer.

## Alcance declarado

`CRITICAL` y `HIGH` **con corrección publicada** (`ignore-unfixed: true`). Una vulnerabilidad sin
parche disponible no es accionable hoy y rompería el pipeline sin darle salida a nadie.

**Fuera de alcance:** corregir lo que encuentre. Este PT construye el instrumento; lo que mida es
trabajo posterior con su propia evidencia. **TD-016 se cierra** con las dos escrituras (RULE-08).
