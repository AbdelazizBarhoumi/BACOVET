import { test, expect, type Page } from '@playwright/test';

async function enterView(page: Page) {
    await page.goto('/v5/p/test');
    if (/\/v5\/login/.test(page.url())) {
        const password = process.env.V5_TEST_PASSWORD;
        if (!password) throw new Error('V5_TEST_PASSWORD is required.');
        await page.locator('button').filter({ hasText: 'Super admin' }).click();
        const inputs = page.locator('input[type="password"]');
        const create = page.locator('button').filter({ hasText: 'Créer et se connecter' });
        if (await create.count()) {
            await inputs.nth(0).fill(password);
            await inputs.nth(1).fill(password);
            await create.click();
            await page.waitForURL(/\/v5$/);
        } else {
            await inputs.first().fill(password);
            await page.locator('button').filter({ hasText: 'Connexion' }).click();
            await page.waitForURL(/\/v5$/);
        }
        await page.goto('/v5/p/test');
    }
    const view = page.locator('button').filter({ hasText: 'Voir' });
    if (await view.count()) await view.click();
    await expect(page.locator('button').filter({ hasText: 'Exporter' })).toBeVisible();
}

async function downloadFrom(
    page: Page,
    trigger: () => Promise<void>,
): Promise<{ filename: string; path: string }> {
    const dl = page.waitForEvent('download');
    await trigger();
    const download = await dl;
    const path = await download.path();
    if (!path) throw new Error('download had no path');
    return { filename: download.suggestedFilename(), path };
}

test.describe('Phase 7 — Export menu', () => {
    test.beforeEach(async ({ page }) => enterView(page));

    test('shows the export dropdown with all formats', async ({ page }) => {
        await page.locator('button').filter({ hasText: 'Exporter' }).click();
        await expect(page.getByText('Exporter le rapport')).toBeVisible();
        await expect(page.getByText('PDF — toutes les pages')).toBeVisible();
        await expect(page.getByText('PDF — page actuelle')).toBeVisible();
        await expect(page.getByText('Image PNG — page actuelle')).toBeVisible();
        await expect(page.getByText('PowerPoint — toutes les pages')).toBeVisible();
        await expect(page.getByText('Excel — toutes les données')).toBeVisible();
    });

    test('downloads a PNG of the current page', async ({ page }) => {
        const { filename } = await downloadFrom(page, async () => {
            await page.locator('button').filter({ hasText: 'Exporter' }).click();
            await page.getByText('Image PNG — page actuelle').click();
        });
        expect(filename).toMatch(/\.png$/);
    });

    test('downloads a PDF of the current page', async ({ page }) => {
        const { filename } = await downloadFrom(page, async () => {
            await page.locator('button').filter({ hasText: 'Exporter' }).click();
            await page.getByText('PDF — page actuelle').click();
        });
        expect(filename).toMatch(/rapport_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    test('downloads a PowerPoint deck', async ({ page }) => {
        const { filename } = await downloadFrom(page, async () => {
            await page.locator('button').filter({ hasText: 'Exporter' }).click();
            await page.getByText('PowerPoint — toutes les pages').click();
        });
        expect(filename).toMatch(/\.pptx$/);
    });

    test('downloads an Excel workbook', async ({ page }) => {
        const { path } = await downloadFrom(page, async () => {
            await page.locator('button').filter({ hasText: 'Exporter' }).click();
            await page.getByText('Excel — toutes les données').click();
        });
        const fs = await import('node:fs/promises');
        const XLSX = await import('xlsx');
        const buf = await fs.readFile(path);
        const wb = XLSX.read(buf);
        expect(wb.SheetNames.length).toBeGreaterThan(0);
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!]!, {
            header: 1,
        }) as unknown[][];
        expect(rows.length).toBeGreaterThan(1);
    });
});

test.describe('Phase 7 — Visual export button', () => {
    test.beforeEach(async ({ page }) => enterView(page));

    test('downloads a CSV for a hovered visual', async ({ page }) => {
        const visual = page.locator('[aria-label]').first();
        await visual.hover();
        const { filename, path } = await downloadFrom(page, async () => {
            await page
                .locator('button[aria-label="Exporter les données du visuel"]')
                .first()
                .click();
            await page.getByText('CSV', { exact: true }).click();
        });
        expect(filename).toMatch(/\.csv$/);
        const fs = await import('node:fs/promises');
        const content = await fs.readFile(path, 'utf8');
        expect(content).toContain(',');
    });
});
