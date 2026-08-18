const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
function envFromDotenv() {
  const file = path.resolve(process.cwd(), '.env');
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}
(async () => {
  const dotenv = envFromDotenv();
  const user = process.env.BROWSER_USERNAME ?? dotenv.BROWSER_USERNAME;
  const pass = process.env.BROWSER_PASSWORD ?? dotenv.BROWSER_PASSWORD;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8010/login');
  await page.getByPlaceholder('admin@example.com').fill(user);
  await page.getByPlaceholder('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022').fill(pass);
  await page.getByRole('button', { name: 'Validation Identité' }).click();
  await page.waitForFunction(
    () => !window.location.pathname.startsWith('/login'),
    undefined,
    { timeout: 15000 },
  );
  const res = await page.request.get('http://127.0.0.1:8010/api/builder-pages/e2e-dashboard');
  const json = await res.json();
  const layout = json.layout;
  for (const p of layout.pbi.pages) {
    console.log(
      'PAGE',
      p.id,
      JSON.stringify(p.name),
      '| visuals:',
      p.visuals.map((v) => `${v.id}(${v.type})`).join(', '),
    );
  }
  console.log('--- fixture visuals:');
  for (const p of layout.pbi.pages)
    for (const v of p.visuals) {
      if (v.id === 'vmskyy3ue3' || v.id === 'vmskywg8y2') {
        console.log(
          'found',
          v.id,
          'on page',
          p.id,
          JSON.stringify({ axis: v.axis, values: v.values, format: v.format, tableNumber: v.tableNumber }),
        );
      }
    }
  console.log('--- first table visual example (any page):');
  outer: for (const p of layout.pbi.pages)
    for (const v of p.visuals) {
      if (v.type === 'table' || v.type === 'matrix') {
        console.log(
          JSON.stringify(
            { type: v.type, axis: v.axis, legend: v.legend, values: v.values, format: v.format, tableNumber: v.tableNumber, id: v.id, page: p.id },
            null,
            1,
          ),
        );
        break outer;
      }
    }
  await browser.close();
})().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});