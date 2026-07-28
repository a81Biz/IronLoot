/**
 * PT-135 — Regenera un `package-lock.json` DENTRO de un contenedor Linux.
 *
 * Uso:  node scripts/regenerar-lock.js src/api        (o `npm run lock:api`)
 *
 * Este script corre en el host, pero **no ejecuta npm en el host**: solo invoca Docker. La invariante
 * de PT-135 prohibe `npm install` fuera del contenedor, no invocar al contenedor.
 *
 * POR QUE ES UN SCRIPT Y NO UNA LINEA EN `package.json`: la ruta del repositorio hay que pasarla al
 * `-v` de Docker, y `%cd%` (cmd) y `$PWD` (sh) no son la misma cosa. Un script de Node vale en las
 * dos, y ademas deja sitio para explicar las tres decisiones de abajo — que no son evidentes y se
 * midieron una por una.
 *
 * LAS TRES COSAS QUE HAY QUE HACER, Y QUE NADIE ADIVINA:
 *
 *   1. BORRAR EL LOCK ANTES. `npm install --package-lock-only` sobre un lock existente responde
 *      «up to date» y **no toca nada**: no re-expande las variantes de plataforma que falten.
 *
 *   2. ENMASCARAR `node_modules`. Aunque npm corra dentro de Linux, deriva el arbol del `node_modules`
 *      REAL, y el del host se instalo en Windows. Sin enmascararlo vuelve a escribir solo `win32` —
 *      medido: fue el segundo intento fallido de PT-135.2.
 *
 *   3. `--ignore-scripts`. El `prepare` del API (`cd ../.. && husky install`) necesita git y el
 *      `node_modules` de la raiz. Sin ellos la invocacion sale con codigo 127 **dejando el lock a
 *      medio escribir**, que es peor que no haberlo tocado.
 *
 * La imagen se fija a `node:20-slim`, la misma de `src/api/Dockerfile.dev`. Si esa cambia, esta
 * tiene que cambiar con ella: un lock generado con otro npm puede resolver otro arbol.
 */
const { spawnSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

/** Misma imagen que `src/api/Dockerfile.dev`. Mantenerlas iguales es parte del contrato. */
const IMAGEN = 'node:20-slim';

const proyecto = (process.argv[2] || '').replace(/\\/g, '/').replace(/\/$/, '') || '.';
const raiz = process.cwd();

if (!existsSync(join(raiz, proyecto, 'package.json'))) {
  process.stderr.write(`\n  No hay package.json en '${proyecto}'.\n  Uso: node scripts/regenerar-lock.js src/api\n\n`);
  process.exit(1);
}

// El directorio de trabajo dentro del contenedor, y los `node_modules` que hay que tapar: el del
// proyecto y el de la raiz (los workspaces resuelven hacia arriba).
const trabajo = proyecto === '.' ? '/repo' : `/repo/${proyecto}`;
const aEnmascarar = [...new Set([`${trabajo}/node_modules`, '/repo/node_modules'])];

const argumentos = [
  'run',
  '--rm',
  '-v',
  `${raiz}:/repo`,
  ...aEnmascarar.flatMap((ruta) => ['-v', ruta]),
  '-w',
  trabajo,
  IMAGEN,
  'sh',
  '-c',
  'rm -f package-lock.json && npm install --package-lock-only --ignore-scripts --no-audit --no-fund',
];

process.stdout.write(`  Regenerando ${proyecto}/package-lock.json dentro de ${IMAGEN}...\n`);

const resultado = spawnSync('docker', argumentos, { stdio: 'inherit', shell: false });

if (resultado.error) {
  process.stderr.write(`\n  No se pudo invocar Docker: ${resultado.error.message}\n`);
  process.stderr.write('  Este proyecto se desarrolla en Docker; sin el no hay forma valida de generar el lock.\n\n');
  process.exit(1);
}

process.exit(resultado.status === null ? 1 : resultado.status);
