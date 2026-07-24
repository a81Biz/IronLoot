/** Jest config mínima para el paquete CLIENT (PT-038 / AUD-003).
 *  Usa ts-jest en modo transpile-only (isolatedModules) para no depender del type-check.
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/test/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
};
