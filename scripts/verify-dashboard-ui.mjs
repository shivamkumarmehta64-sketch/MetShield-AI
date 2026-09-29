import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

/**
 * A throwaway visual + structural probe of the dashboard.
 *
 * This exists because the KPI verdict band and the scenario picker both render
 * on the client only — `DashboardTabs` calls `useSearchParams()`, so neither
 * appears in the server HTML and neither can be checked by curling the route.
 * Reading the source proves the JSX is well-formed; it does not prove the
 * verdict selects the right branch, that the picker's active state follows the
 * pick, or that nothing overflows at 390 px. AGENTS.md §7 asks for a runtime
 * probe, so this drives a real browser and reports what it measured.
 *
 * Usage: node scripts/verify-dashboard-ui.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? 'http://localhost:3111';
const OUT = path.resolve('./tmp-ui-check');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, note) {
  results.push({ name, ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`);
}

const browser = await chromium.launch({
  // The bundled browser revision may not match the installed Playwright on this
  // machine; reuse whatever chromium is already downloaded rather than
  // requiring a fresh ~150 MB download to run a check.
  executablePath:
    process.env.CHROMIUM_PATH ||
    path.join(
      process.env.LOCALAPPDATA ?? '',
      'ms-playwright',
      'chromium-1234',
      'chrome-win64',
      'chrome.exe'
    ),
});

try {
  // ── Desktop ───────────────────────────────────────────────────────────────
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=NETWORK STATUS', { timeout: 15000 });

  // 1. The verdict band renders, and it is a live region for screen readers.
  const verdict = await page.evaluate(() => {
    const band = document.querySelector('[role="status"]');
    if (!band) return null;
    return {
      headline: band.querySelector('.t-section-title')?.textContent?.trim() ?? null,
      detail: band.querySelector('p')?.textContent?.trim() ?? null,
      provenance: band.textContent?.includes('BENCHMARK') ?? false,
    };
  });
  check('verdict band renders', !!verdict?.headline, verdict?.headline ?? 'absent');
  check('verdict names a station', /STATIONS? (REPORT HARDWARE FAULT|NEED ATTENTION)/.test(verdict?.headline ?? '') || verdict?.headline === 'NETWORK NOMINAL', verdict?.headline ?? '');
  check('verdict states not-weather for a fault', (verdict?.detail ?? '').includes('not weather'), verdict?.detail ?? '');
  check('provenance chip present once', verdict?.provenance === true);

  // 2. The four values are de-tinted: the 26 px figures must not be coloured
  //    by status any more. Computed style, not class inspection.
  const valueColours = await page.evaluate(() =>
    Array.from(document.querySelectorAll('section[aria-label="Network key figures"] .t-mono'))
      .filter((el) => /^\d/.test(el.textContent.trim()))
      .map((el) => getComputedStyle(el).color)
  );
  const distinct = [...new Set(valueColours)];
  check('KPI values share one ink colour (de-tinted)', distinct.length === 1, distinct.join(' | '));

  // 3. Exactly one BENCHMARK chip in the strip.
  const chipCount = await page.evaluate(
    () => (document.querySelector('section[aria-label="Network key figures"]').textContent.match(/BENCHMARK/g) ?? []).length
  );
  check('one provenance chip, not four', chipCount === 1, `found ${chipCount}`);

  // 4. Scenario picker: active state, check glyph, descriptions surfaced.
  const picker = await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('.card')).find((c) =>
      c.textContent.includes('RUNNING SCENARIO')
    );
    if (!card) return null;
    const buttons = Array.from(card.querySelectorAll('button'));
    return {
      header: card.querySelector('.t-card-title')?.textContent?.trim() ?? null,
      count: buttons.length,
      pressed: buttons.filter((b) => b.getAttribute('aria-pressed') === 'true').length,
      descriptionsShown: buttons.filter((b) => b.querySelectorAll(':scope > div > span').length === 1).length,
      labels: buttons.map((b) => b.textContent.trim().slice(0, 40)),
    };
  });
  check('picker renders all 8 scenarios', picker?.count === 8, `found ${picker?.count ?? 0}`);
  check('no scenario pre-selected on load', picker?.pressed === 0, `${picker?.pressed} pressed`);
  check('header states the default run, not a scenario', picker?.header === 'Default network run', picker?.header ?? '');
  check('every scenario shows a description', picker?.descriptionsShown === 8, `${picker?.descriptionsShown}/8`);

  // 5. Clicking a scenario moves the active state and renames the header.
  const target = page.getByRole('button', { name: /Convective Storm/ });
  await target.click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('.card')).find((c) =>
      c.textContent.includes('RUNNING SCENARIO')
    );
    const buttons = Array.from(card.querySelectorAll('button'));
    const active = buttons.filter((b) => b.getAttribute('aria-pressed') === 'true');
    return {
      header: card.querySelector('.t-card-title')?.textContent?.trim() ?? null,
      pressed: active.length,
      activeLabel: active[0]?.textContent?.trim().slice(0, 30) ?? null,
      checkGlyph: !!active[0]?.querySelector('svg'),
    };
  });
  check('active state follows the click', after.pressed === 1, after.activeLabel ?? '');
  check('header renames to the running scenario', after.header === 'Convective Storm', after.header ?? '');
  check('active row carries a check glyph', after.checkGlyph);

  // 6. No horizontal overflow at desktop width.
  const deskOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('no horizontal scroll at 1280', deskOverflow <= 0, `${deskOverflow}px`);

  await page.screenshot({ path: path.join(OUT, 'dashboard-1280.png'), fullPage: false });

  // ── Mobile ────────────────────────────────────────────────────────────────
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  m.on('pageerror', (e) => consoleErrors.push(`mobile pageerror: ${e.message}`));
  await m.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await m.waitForSelector('text=NETWORK STATUS', { timeout: 15000 });
  const mobOverflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('no horizontal scroll at 390', mobOverflow <= 0, `${mobOverflow}px`);

  // The verdict headline must wrap rather than clip on a phone.
  const clipped = await m.evaluate(() => {
    const h = document.querySelector('[role="status"] .t-section-title');
    if (!h) return true;
    return h.scrollWidth > h.clientWidth + 1;
  });
  check('verdict headline does not clip at 390', clipped === false);

  // The station table folds its secondary channels into one line below md. If
  // that fold silently stopped applying, the columns would be hidden with no
  // substitute and the phone view would quietly lose three readings.
  const folded = await m.evaluate(() => {
    const row = document.querySelector('table tbody tr td');
    if (!row) return null;
    const lines = Array.from(row.querySelectorAll('div')).map((d) => d.textContent.trim());
    return {
      hasFold: lines.some((t) => t.includes('°C') && t.includes('hPa') && t.includes('%RH')),
      visibleCols: Array.from(document.querySelectorAll('table thead th')).filter(
        (th) => getComputedStyle(th).display !== 'none'
      ).length,
    };
  });
  check('mobile row folds T/P/RH into one line', folded?.hasFold === true);
  check('mobile table shows 3 of 7 columns', folded?.visibleCols === 3, `${folded?.visibleCols} visible`);
  await m.screenshot({ path: path.join(OUT, 'dashboard-390.png'), fullPage: false });

  // ── Other routes still render after the change ────────────────────────────
  for (const route of ['/', '/incidents', '/analytics', '/stations', '/audit-report', '/demo', '/mobile']) {
    const r = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    check(`${route} responds 200`, r?.status() === 200, `got ${r?.status()}`);
  }

  check('no console errors across the run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in ${OUT}`);
process.exit(failed.length === 0 ? 0 : 1);
