/**
 * PT-101 — Configuración de Jest, replicada de CLIENT.
 *
 * Este proyecto no tenía dónde poner una prueba. Es la razón por la que la guarda de PT-100 —un
 * defecto de este mismo panel— tuvo que ir a la suite de navegador: minutos y todo el stack
 * levantado, para comprobar algo que un test unitario resuelve en milisegundos.
 *
 * `isolatedModules` transpila sin comprobar tipos: de eso ya se encarga `npm run typecheck`, y
 * duplicarlo sólo haría los tests más lentos.
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/test/**/*.spec.ts'],
  transform: {
    '^.+\.ts$': ['ts-jest', { isolatedModules: true }],
  },
};
