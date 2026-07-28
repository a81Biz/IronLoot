# PT-135 — Escenarios de prueba

Cada escenario dice **qué se ejecuta** y **qué se observa**. Los que llevan **(control)** existen para
ver fallar a la guarda: sin ellos no hay guarda, hay un comentario que se ejecuta (RULE-14).

---

## E1 — El lock declara las plataformas que construimos

- **Dado** `src/api/package-lock.json` regenerado en el contenedor.
- **Cuando** se leen sus entradas de plataforma.
- **Entonces** contiene `@css-inline/css-inline-linux-x64-gnu`,
  `@css-inline/css-inline-linux-x64-musl` y `@msgpackr-extract/msgpackr-extract-linux-x64`.
- **Hoy**: falla. HEAD sólo tiene `win32-x64-msvc` y `msgpackr-extract-win32-x64`.

## E2 — G1 falla con el lock roto **(control)**

- **Dado** un lock de prueba **sin** la entrada `linux-x64-gnu`.
- **Entonces** `lock-declara-plataformas.spec.ts` **falla**, nombrando el paquete que falta.
- **Por qué**: es el estado exacto de `master` hoy. Una guarda que no lo caza no sirve de nada.

## E3 — G1 pasa con el lock correcto

- **Dado** el lock regenerado.
- **Entonces** la prueba pasa, y **sin comprobar versiones** — sólo presencia de claves (o se vuelve
  frágil y alguien la apagará).

## E4 — La imagen lleva el binario

- **Cuando** `docker run --rm --entrypoint sh ironloot-api:latest -c 'ls node_modules/@css-inline'`.
- **Entonces** ≥2 directorios.
- **Hoy**: uno solo — `css-inline`.

## E5 — Los ocho contenedores, desde volumen limpio

- **Dado** `docker compose down -v` y `build --no-cache api`.
- **Cuando** `up -d`.
- **Entonces** los **ocho** `healthy`; ninguno en `Created`.
- **Hoy**: API `unhealthy`, y nginx/admin/base/client nunca arrancan.
- **Trampa que este escenario evita**: verificar sobre el volumen viejo, que **tapa** el defecto y
  taparía igual un arreglo falso. La evidencia declara el volumen usado.

## E6 — El correo se rinde de verdad

- **Cuando** se dispara una notificación por correo.
- **Entonces** el correo aparece en Mailhog (`:8026`) **con su HTML**.
- **Por qué**: `@css-inline` lo arrastra el adaptador de Handlebars. Que el binario cargue no prueba
  que el HTML se rinda, y el arranque no lo delataría.

## E7 — `msgpackr` con prebuild, no compilando

- **Entonces** el prebuild `@msgpackr-extract/msgpackr-extract-linux-x64` está presente **y** no
  existe `node_modules/msgpackr-extract/build/Release/extract.node`.
- **Hoy**: al contrario — compiló desde fuente porque el prebuild desapareció del lock.

## E8 — G2 rechaza el host **(control)**

- **Cuando** se ejecuta la guarda con la plataforma forzada a `win32`.
- **Entonces** aborta con código distinto de 0, **y el mensaje dice el comando correcto**.

## E9 — G2 permite el contenedor y CI

- **Cuando** se ejecuta con plataforma `linux`.
- **Entonces** pasa.
- **Y además**: los **siete jobs** de `ci.yml` instalan igual, y `prepare: husky install`
  (`src/api/package.json:25`) sigue funcionando.

## E10 — Un `npm install` real en el host falla

- **Cuando** se intenta `npm install` en la máquina de desarrollo.
- **Entonces** no instala nada y explica qué ejecutar.
- **Por qué es el escenario que importa**: es exactamente lo que produjo este defecto en PT-126.

## E11 — Los comandos de regeneración funcionan sin npm en el host

- **Cuando** `npm run lock:api` / `lock:admin` / `lock:root`.
- **Entonces** el lock se regenera **dentro del contenedor**; el host sólo invocó Docker.
- **Detalle que se comprueba**: sin `--entrypoint`, el comando caería en `entrypoint.dev.sh`.

## E12 — El inventario de locks, completo y coherente

- **Entonces** `git ls-files` muestra los **tres** locks (raíz, api, admin) y `.gitignore` ya no
  contiene la línea `package-lock.json`.
- **Hoy**: dos seguidos contra la regla, uno no seguido, y la regla ignorándolos a los tres.

## E13 — Las cinco imágenes construyen con `npm ci`

- **Entonces** las cuatro de desarrollo `healthy` **y** las cuatro de producción construidas y
  arrancadas hasta `healthy`.
- **Riesgo que cubre**: los tres SSR pasan a construir **con** lock por primera vez. Cambia lo que
  instalan.

## E14 — Los siete jobs, en un push real

- **Entonces** los siete pasan con `npm ci`, **vistos**.
- **Puerta de salida**: si uno destapa un desajuste que excede el PT, ese punto vuelve a
  `npm install` y **se dice** en la evidencia. No se deja rojo (PT-118).

## E15 — Sin regresión

- **Entonces** 919 unitarias · 77 e2e · 136 por navegador · `lint` 0 · `npm audit --omit=dev` = 0 en
  los cinco · **cero cambios en `src/api/src/`**.
- **Aviso**: `run-all.sh` trunca la base de datos.

## E16 — La documentación no miente

- **Entonces** `src/api/Dockerfile:53-62` explica la causa verdadera (el lock, no npm-sobre-alpine),
  `coherencia-deuda-tecnica.spec.ts` en verde, y el ADR nuevo registra la decisión que no existía.
