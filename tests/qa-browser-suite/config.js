// Configuración compartida del harness QA IronLoot
const path = require('path');

const OUT_ROOT = 'C:\\DevOps\\Desarrollos\\IronLoot\\qa-out';

// PT-097 (F-29) — La suite apuntaba a `localhost:<puerto>` y quedo INCOMPATIBLE con PT-088.
//
// Desde PT-088 la cookie de sesion se emite con `Domain=.ironloot.local`. Un navegador situado
// en `localhost:5174` RECHAZA esa cookie por dominio distinto: el login «funciona» —el API
// responde 200— pero la sesion no cuaja, y la suite lo veia como un fallo de login que arrastraba
// el bootstrap entero, los E2E y el retiro. 9 fallos de un solo origen.
//
// No se puede volver a los puertos: los navegadores rechazan `Domain=.localhost` (dominio de uso
// especial), que es justo por lo que PT-088 adopto `ironloot.local`. Requiere las entradas del
// fichero hosts, y PT-095 avisa al arrancar si faltan.
//
// Se puede sobreescribir con QA_BASE / QA_CLIENT / QA_ADMIN para correr contra otro entorno.
const DOMINIO = process.env.QA_DOMAIN || 'ironloot.local';

module.exports = {
  BASE: process.env.QA_BASE || `http://base.${DOMINIO}`,
  CLIENT: process.env.QA_CLIENT || `http://client.${DOMINIO}`,
  ADMIN: process.env.QA_ADMIN || `http://admin.${DOMINIO}`,
  API: 'http://localhost:3000/api/v1',
  MAILHOG: 'http://localhost:8026',
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'admin',
  OUT_ROOT,
  // Modo visible por decisión del usuario
  HEADED: true,
  SLOWMO: 120,
  DEFAULT_TIMEOUT: 15000,
  // Contraseña estándar para cuentas creadas en las pruebas
  TEST_PASSWORD: 'Passw0rd!2026',
};
