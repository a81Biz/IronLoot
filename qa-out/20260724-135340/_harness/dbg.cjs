const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext()).newPage();
  p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE.ERR:', m.text().slice(0, 160)); });
  p.on('pageerror', (e) => console.log('PAGEERR:', String(e).slice(0, 160)));
  let apiResp = null;
  p.on('response', async (r) => {
    if (r.url().includes('/auth/register')) { apiResp = { status: r.status() }; try { apiResp.body = (await r.text()).slice(0, 200); } catch {} }
  });
  await p.goto('http://localhost:5174/auth/register', { waitUntil: 'domcontentloaded' });
  await p.fill('#username', 'dbg_user');
  await p.fill('#email', 'dbg_user@test.local');
  await p.fill('#password', 'Passw0rd!2026');
  console.log('before click url=', p.url());
  await p.click('button[type=submit]');
  await p.waitForTimeout(3500);
  console.log('after click url=', p.url());
  console.log('register API resp=', JSON.stringify(apiResp));
  const err = await p.textContent('#registerError').catch(() => '');
  console.log('registerError text=', JSON.stringify((err || '').trim()));
  // probar el selector problemático
  try {
    const el = await p.$('.alert-error:visible, #loginError:visible, #registerError:visible');
    console.log('combined :visible selector OK, matched=', !!el);
  } catch (e) {
    console.log('combined :visible selector THREW:', e.message.slice(0, 120));
  }
  await b.close();
})();
