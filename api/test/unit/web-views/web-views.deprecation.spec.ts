/**
 * Deprecation guard for the web-views module.
 *
 * This test verifies that web-views was fully eliminated in PT-013
 * and prevents its re-introduction. Routes migrated to apps/base/ (public)
 * and apps/client/ (private).
 *
 * If this test fails, it means someone re-created or re-imported the web-views module.
 * New SSR routes MUST go to apps/base/ or apps/client/ — never to the API.
 * See: implementation/AI_AGENT_RULES.md §Regla PT013-3
 */
import * as fs from 'fs';
import * as path from 'path';

const WEB_VIEWS_DIR = path.join(__dirname, '../../../src/modules/web-views');
const APP_MODULE_PATH = path.join(__dirname, '../../../src/app.module.ts');

describe('WebViews module — deprecation guard (PT-013 / PT-015)', () => {
  it('web-views module file must NOT exist — eliminated in PT-013', () => {
    const modulePath = path.join(WEB_VIEWS_DIR, 'web-views.module.ts');
    expect(fs.existsSync(modulePath)).toBe(false);
  });

  it('web-views controller must NOT exist — eliminated in PT-013', () => {
    const controllerPath = path.join(WEB_VIEWS_DIR, 'web-views.controller.ts');
    expect(fs.existsSync(controllerPath)).toBe(false);
  });

  it('app.module.ts must NOT have an active import of WebViewsModule', () => {
    const content = fs.readFileSync(APP_MODULE_PATH, 'utf-8');
    // Only match actual import statements (not comments that mention the name)
    expect(content).not.toMatch(/^import\s+.*WebViewsModule/m);
    expect(content).not.toMatch(/^import\s+.*web-views\.module/m);
  });
});
