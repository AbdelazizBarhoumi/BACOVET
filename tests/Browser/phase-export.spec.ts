import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { decode as decodePng } from 'fast-png';

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

/** Fraction of pixels that differ from the page's dominant (background) color. */
function nonBackgroundRatio(buf: Buffer): number {
    const { data } = decodePng(buf);
    const counts = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let dominant = '';
    let dominantCount = 0;
    for (const [k, c] of counts) {
        if (c > dominantCount) {
            dominantCount = c;
            dominant = k;
        }
    }
    if (!dominant) return 0;
    const [dr, dg, db] = dominant.split(',').map(Number);
    let differing = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        total += 1;
        if (
            Math.abs(data[i] - dr) > 8 ||
            Math.abs(data[i + 1] - dg) > 8 ||
            Math.abs(data[i + 2] - db) > 8
        ) {
            differing += 1;
        }
    }
    return total ? differing / total : 0;
}

/**
 * Clicks an export menu option and, while the off-screen export surface is
 * mounted, verifies the page visuals actually render data: chart shapes
 * (bars / lines / pie sectors / areas), table rows, or numeric KPI values.
 * This is what catches "empty" exports where charts are captured before they
 * finish drawing.
 */
async function triggerExportAndCheckSurface(page: Page, option: string) {
    await page.locator('button').filter({ hasText: 'Exporter' }).click();
    await page.getByText(option).click();
    const pageNode = page.locator('[data-export-page]').first();
    await pageNode.waitFor({ state: 'attached', timeout: 5000 });
    const visuals = pageNode.locator('[data-export-visual]');
    expect(await visuals.count()).toBeGreaterThan(0);
    const rendered = await visuals.evaluateAll((els) =>
        els.filter((el) => {
            const content = (el.textContent ?? '').trim();
            if (!content || content === 'Blank page') return false;
            return (
                el.querySelector('.recharts-bar-rectangle') !== null ||
                el.querySelector('.recharts-line-curve') !== null ||
                el.querySelector('.recharts-pie-sector') !== null ||
                el.querySelector('.recharts-area-area') !== null ||
                el.querySelector('table tbody tr') !== null ||
                /[0-9]/.test(content)
            );
        }).length,
    );
    expect(rendered).toBeGreaterThan(0);
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

    test('downloads a PNG of the current page with rendered content', async ({
        page,
    }) => {
        const { filename, path } = await downloadFrom(page, async () => {
            await triggerExportAndCheckSurface(page, 'Image PNG — page actuelle');
        });
        expect(filename).toMatch(/\.png$/);
        const buf = await readFile(path);
        expect(nonBackgroundRatio(buf)).toBeGreaterThan(0.005);
    });

    test('downloads a PDF of the current page with rendered content', async ({
        page,
    }) => {
        const { filename } = await downloadFrom(page, async () => {
            await triggerExportAndCheckSurface(page, 'PDF — page actuelle');
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
