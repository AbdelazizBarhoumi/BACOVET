import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Browser E2E harness for the BACOVET report builder.
 *
 * - Starts the full dev stack (`php artisan serve` + Vite) via `npm run dev:all`
 *   unless something is already answering on the Laravel port.
 * - Credentials come from `BROWSER_USERNAME` / `BROWSER_PASSWORD` (env or
 *   `.env`); there is no fallback password committed anywhere.
 *
 * The three smoke specs (M0 scaffolding) live in `tests/Browser/**` and are
 * wrapped up by the wizard flow in Wave 1, then the per-row list and export
 * scenarios in Waves 1/2.
 */

function envFromDotenv() {
    const file = path.resolve(process.cwd(), '.env');
    if (!existsSync(file)) return {};
    return Object.fromEntries(
        readFileSync(file, 'utf8')
            .split(/\r?\n/)
            .filter((line) => !line.trim().startsWith('#') && line.includes('='))
            .map((line) => {
                const idx = line.indexOf('=');
                return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
            }),
    );
}

const dotenv = envFromDotenv();
const BROWSER_USERNAME =
    process.env.BROWSER_USERNAME ?? dotenv.BROWSER_USERNAME ?? '';
const BROWSER_PASSWORD =
    process.env.BROWSER_PASSWORD ?? dotenv.BROWSER_PASSWORD ?? '';

/**
 * Logs into BACOVET from the /login screen. Throws a clear error when the
 * browser credentials are missing (they must be set in `.env` — see W-M0).
 */
export async function login(page) {
    if (!BROWSER_USERNAME || !BROWSER_PASSWORD) {
        throw new Error(
            'BROWSER_USERNAME / BROWSER_PASSWORD are not set (add them to .env): see docs/measure-assistant-implementation.md W-M0',
        );
    }
    await page.goto('/login');
    await page.getByPlaceholder('admin@example.com').fill(BROWSER_USERNAME);
    await page.getByPlaceholder('••••••••').fill(BROWSER_PASSWORD);
    await page.getByRole('button', { name: 'Validation Identité' }).click();
    await page.waitForFunction(
        () => !window.location.pathname.startsWith('/login'),
        undefined,
        { timeout: 15_000 },
    );
}

export const baseURL = 'http://127.0.0.1:8010';

export default defineConfig({
    testDir: 'tests/Browser',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['list']],
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run dev:all',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});