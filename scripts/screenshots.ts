import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// One-off: capture README screenshots from a running app (next start -p 3100).
const BASE = process.env.SHOT_BASE ?? 'http://localhost:3100';
const OUT = 'docs/screenshots';

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/01-sign-in.png` });

  await page.locator('input[name="email"]').fill('admin@acme.test');
  await page.locator('input[name="password"]').fill('Password123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/02-dashboard.png` });

  await page.goto(`${BASE}/tickets`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/03-tickets.png`, fullPage: true });

  await page.getByRole('link', { name: 'Where is my order?' }).first().click();
  await page.waitForURL(/\/tickets\/.+/);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/04-ticket-ai-suggestion.png`, fullPage: true });

  await page.goto(`${BASE}/knowledge`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/05-knowledge.png`, fullPage: true });

  await page.goto(`${BASE}/metrics`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/06-metrics.png`, fullPage: true });

  await browser.close();
  console.log('Screenshots written to', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
