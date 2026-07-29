/**
 * PT-172 — La configuración de Jest sale de `package.json` para que el comentario pueda existir.
 *
 * ## Por qué se movió
 *
 * El bloque `jest` de `package.json` llevaba una clave `_comentario_maxWorkers` con la medición de
 * PT-159. JSON no admite comentarios, así que la explicación se colaba como clave — y **Jest la
 * rechaza**, emitiendo en **cada corrida**:
 *
 *     ● Validation Warning:
 *       Unknown option "_comentario_maxWorkers" ... This is probably a typing mistake.
 *
 * Dos veces por invocación. Es pequeño y es exactamente el mecanismo que PT-159 y PT-166 vinieron a
 * quitar: **ruido que enseña a descartar la salida de la suite**. Quien se acostumbra a ver un aviso
 * que no importa deja de leer los que importan.
 *
 * La salida no era borrar el comentario. El comentario **es** la razón de que `maxWorkers` valga 1, y
 * PT-159 lo dejó ahí a propósito porque *«fue una prevención que se quedó en una nota lo que hizo
 * volver a H-014 en cuatro días»*. Así que se conserva íntegro, pegado a la opción que explica, en un
 * fichero donde un comentario es un comentario.
 */
module.exports = {
  // PT-159 / PT-166 — POR QUÉ ESTO VALE 1, Y POR QUÉ NO SE SUBE SIN MEDIR:
  //
  // La suite no cabe en el contenedor con los workers por defecto: tres suites mueren por SIGKILL
  // contra el límite de memoria y el resumen dice «4 failed» sin que nada esté roto. Quien lo lea
  // aprende a descartar los fallos de esta suite, y así es como un fallo verdadero pasa desapercibido.
  //
  // Medido el 2026-07-29: con 2 workers muere; en serie pasan todas.
  //
  // PT-166 — `maxWorkers: 1` dejó de bastar al crecer la suite: con un solo proceso el heap acumula a
  // lo largo de todas. La palanca que faltaba **no era el reciclado de workers**
  // (`workerIdleMemoryLimit` se probó con 1 y con 2 y tumba seis suites) sino el techo de heap:
  // el contenedor va a 2 GB y `NODE_OPTIONS=--max-old-space-size=1536`, los dos en `docker-compose.yml`.
  maxWorkers: 1,

  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/**/*.module.ts', '!src/**/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/test/unit/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  },
};
