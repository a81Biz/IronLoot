/**
 * PT-135 — npm no se ejecuta en el host. Se ejecuta en el contenedor.
 *
 * Invocado como `preinstall` desde los tres puntos de instalacion del monorepo: la raiz (que arrastra
 * los workspaces `base`, `client` y `core`), `src/api` y `src/admin`.
 *
 * POR QUE EXISTE, medido:
 *
 * Un `npm install` en Windows regenera `package-lock.json` con el arbol de ESA plataforma y se lleva
 * las entradas de los binarios nativos de Linux. Paso en PT-126: el lock del API cayo de 17 paquetes
 * de plataforma a 2. El contenedor instalo entonces menos de lo que necesitaba y murio al arrancar:
 *
 *     Error: Cannot find module '@css-inline/css-inline-linux-x64-gnu'
 *
 * No fallo al instalar. Fallo al arrancar, un dia despues, en otra maquina — y con el volumen anonimo
 * de `node_modules` tapandolo mientras no se recreara. Con el API `unhealthy`, los otros cuatro
 * contenedores no arrancaron nunca.
 *
 * Es la tercera vez que el repositorio se encuentra este defecto (PT-129 en musl, PT-135 en gnu). Las
 * dos anteriores se cerraron con un parche en un Dockerfile. Un parche no impide la cuarta.
 *
 * LA SENAL ES LA PLATAFORMA, Y NO `/.dockerenv`. Medido antes de elegir:
 *
 *     docker exec ironloot-api ls /.dockerenv          -> existe
 *     ci.yml: `runs-on: ubuntu-latest` SIN `container:` -> los siete jobs corren directamente sobre
 *                                                         la VM, donde /.dockerenv NO existe
 *
 * Exigir `/.dockerenv` habria bloqueado la instalacion en los siete jobs. `process.platform` cubre el
 * caso real —el host del desarrollador, Windows o macOS— sin romper CI, que DEBE poder instalar.
 *
 * SIN PUERTA DE ESCAPE por variable de entorno. Una invariante con `--force` vuelve a ser una
 * costumbre, y este PT existe porque una costumbre no basto.
 */

/** La unica plataforma donde se instala: la de las dos imagenes que construimos, y la de CI. */
const SISTEMAS_PERMITIDOS = ['linux'];

/** @param {string} plataforma valor de `process.platform` */
function permitido(plataforma) {
  return SISTEMAS_PERMITIDOS.includes(plataforma);
}

/**
 * El mensaje ensena el camino correcto, no solo prohibe.
 *
 * Una guarda que unicamente dice «no» empuja a saltarsela; la que dice que ejecutar en su lugar, no.
 *
 * @param {string} plataforma valor de `process.platform`
 */
function mensaje(plataforma) {
  return [
    '',
    `  npm no se ejecuta en el host (plataforma detectada: ${plataforma}).`,
    '  Este proyecto se desarrolla en Docker, y el lock se genera en el contenedor.',
    '',
    '  Si querias instalar dependencias:',
    '      docker compose build api          # o el servicio que toque',
    '',
    '  Si querias regenerar un package-lock.json:',
    '      npm run lock:api                 # o lock:admin / lock:root',
    '',
    '  Por que: un npm install en Windows deja el lock sin los binarios nativos de Linux.',
    '  El contenedor instala menos de lo que necesita y muere al arrancar, no al instalar.',
    '  Paso en PT-126 y costo cinco contenedores caidos. Ver PT-135.',
    '',
  ].join('\n');
}

module.exports = { SISTEMAS_PERMITIDOS, permitido, mensaje };

// Ejecutado como script (el `preinstall`), no importado por una prueba.
if (require.main === module) {
  if (!permitido(process.platform)) {
    process.stderr.write(mensaje(process.platform));
    process.exit(1);
  }
}
