// Configuración compartida del harness QA IronLoot
const path = require('path');

const OUT_ROOT = 'C:\\DevOps\\Desarrollos\\IronLoot\\qa-out';

module.exports = {
  BASE: 'http://localhost:5174',
  CLIENT: 'http://localhost:5175',
  ADMIN: 'http://localhost:3001',
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
