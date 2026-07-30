/**
 * PT-134 — Validación por NAVEGADOR de los hallazgos corregidos en S-002.
 *
 * PTSA `[R39]`/`[R68]` exigen evidencia observada en la **fuente real** para dar un hallazgo por
 * verificado. Las pruebas unitarias y los e2e por HTTP lo demuestran a nivel de código y de API;
 * esto lo demuestra **como lo ve un usuario**, que es lo que el hallazgo describía.
 *
 * Qué valida cada bloque:
 *
 *   H-020  La página «Configuración» del portal CARGA. Pedía `/api/v1/users/settings`, que no
 *          existe: caía en `@Get(':id')`, el `ParseUUIDPipe` rechazaba la cadena y devolvía 400.
 *          No cargaba para ningún usuario.
 *
 *   H-019  Un `PATCH` parcial NO borra las ramas que no envías. Se cambia el idioma desde la
 *          interfaz y se comprueba que las preferencias de notificación siguen ahí.
 *
 *   H-018  `POST /wallet/deposit` y `POST /payments/checkout` están retirados (PT-133) **y el
 *          depósito real del portal sigue funcionando**: es la comprobación de que se retiró la
 *          puerta que sobraba y no la que se usa.
 *
 * Uso:  node 90-validacion-hallazgos.js
 */
const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');
const cfg = require('./config.js');

const resultados = [];
const anotar = (id, ok, detalle) => {
  resultados.push({ id, ok, detalle });
  console.log(`[${ok ? 'PASS' : 'FALLA'}] ${id.padEnd(12)} ${detalle}`);
};

(async () => {
  const OUT = path.join(cfg.OUT_ROOT, 'validacion-hallazgos-' + Date.now());
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await lib.launch();
  const ctx = await lib.newContext(browser);
  const page = await ctx.newPage();
  const cap = lib.attachCapture(page);

  // ---- Un usuario real, creado por la vía pública ----
  const marca = Date.now();
  const email = `valida_${marca}@test.local`;
  const pass = 'TestPassword123!';

  await page.goto(`${cfg.BASE}/auth/register`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', email).catch(() => {});
  await page.fill('#password', pass).catch(() => {});
  await page.fill('#username', `valida${marca}`).catch(() => {});
  await page.fill('#displayName', 'Validacion').catch(() => {});
  await page.click('button[type=submit]').catch(() => {});
  await page.waitForTimeout(1500);

  // Verificación de correo por la vía real (Mailhog), como hace el resto de la suite.
  const msgs = await lib.mailhogMessages().catch(() => []);
  const mio = (msgs || []).find((m) => JSON.stringify(m).includes(email));
  const enlace = mio && (JSON.stringify(mio).match(/https?:\/\/[^"\\ ]*verify-email[^"\\ ]*/) || [])[0];
  if (enlace) {
    await page.goto(enlace.replace(/&amp;/g, '&'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
  }

  await page.goto(`${cfg.BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', email).catch(() => {});
  await page.fill('#password', pass).catch(() => {});
  await page.click('button[type=submit]').catch(() => {});
  await page.waitForTimeout(2000);

  // ============ H-020 — la pagina de Configuracion carga ============
  const resp = await page.goto(`${cfg.CLIENT}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await lib.shot(page, 'H-020_settings', OUT);

  const http = resp ? resp.status() : 0;
  const texto = await page.textContent('body').catch(() => '');
  const pintaError = /uuid|Validation failed|error|no se pudo/i.test(texto || '');

  anotar('H-020-01', http === 200, `La pagina /settings responde ${http}`);
  anotar('H-020-02', !pintaError, `La pagina no muestra el error de validacion de uuid`);

  // ============ H-019 — el PATCH parcial conserva las ramas ============
  // Se lee el estado por la misma via que usa la pagina, con la sesion del navegador.
  const antes = await page.evaluate(async () => {
    const r = await fetch('/api/v1/users/me/settings', { credentials: 'include' });
    return r.ok ? r.json() : null;
  }).catch(() => null);

  const trasPatch = await page.evaluate(async () => {
    const r = await fetch('/api/v1/users/me/settings', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'en' }),
    });
    return r.ok ? r.json() : null;
  }).catch(() => null);

  const conservado = !!(trasPatch && trasPatch.notifications && trasPatch.notifications.email === true);
  anotar('H-019-01', !!antes, `Estado inicial legible :: ${JSON.stringify(antes)}`);
  anotar('H-019-02', conservado, `Tras PATCH {language:en} :: ${JSON.stringify(trasPatch)}`);

  const conFalse = await page.evaluate(async () => {
    const r = await fetch('/api/v1/users/me/settings', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: { email: false } }),
    });
    return r.ok ? r.json() : null;
  }).catch(() => null);

  const falseAplica = !!(conFalse && conFalse.notifications && conFalse.notifications.email === false
    && conFalse.notifications.inApp === true);
  anotar('H-019-03', falseAplica, `Un false SI se aplica y no borra su hermana :: ${JSON.stringify(conFalse)}`);

  // ============ H-018 / PT-133 — los endpoints retirados ============
  const retirados = await page.evaluate(async () => {
    const probar = async (p) => (await fetch(p, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: '{}',
    })).status;
    return {
      deposito: await probar('/api/v1/wallet/deposit'),
      checkout: await probar('/api/v1/payments/checkout'),
      initiate: await probar('/api/v1/payments/initiate'),
    };
  }).catch(() => ({}));

  anotar('H-018-01', retirados.deposito === 404, `POST /wallet/deposit -> ${retirados.deposito} (retirado)`);
  anotar('H-018-02', retirados.checkout === 404, `POST /payments/checkout -> ${retirados.checkout} (retirado)`);
  anotar('H-018-03', retirados.initiate !== 404, `POST /payments/initiate -> ${retirados.initiate} (VIGENTE)`);

  // ============ La pagina de deposito sigue viva ============
  const rDep = await page.goto(`${cfg.CLIENT}/wallet/deposit`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await lib.shot(page, 'PT-133_deposito', OUT);
  anotar('PT-133-01', (rDep ? rDep.status() : 0) === 200, `La pagina de deposito responde ${rDep ? rDep.status() : 0}`);

  fs.writeFileSync(path.join(OUT, 'validacion.json'), JSON.stringify({ resultados, consola: cap.consoleErrors }, null, 2));

  const ok = resultados.filter((r) => r.ok).length;
  console.log(`\n=== VALIDACION DE HALLAZGOS === total=${resultados.length} PASS=${ok} FALLA=${resultados.length - ok}`);
  console.log(`    capturas y json en: ${OUT}`);

  await browser.close();
  process.exit(ok === resultados.length ? 0 : 1);
})();
