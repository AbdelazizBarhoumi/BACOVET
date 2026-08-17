import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Table/matrix value-cell number formatting ("Valeurs numériques" block).
 *
 * Targets `/p/e2e-dashboard` (page 14). The table `vmskyy3ue3` carries the
 * per-row list measure on `empdefecteff` (W1-12 fixtures), which joins to the
 * axis table `wip_chaine[ProdGroup]` — so we can add a plain numeric value
 * well (`empdefecteff[TodayQty]`, agg=sum) that renders per-group numbers.
 *
 * Two probes clone the page via the builder API (never the user's dashboard):
 * - no `tableNumber` block → the numeric column keeps the plain auto integer
 *   format (regression net: unconfigured tables render exactly as before);
 * - `tableNumber = { displayUnits:'none', decimals:2, suffix:'kW' }` → every
 *   numeric cell carries the fixed decimals + suffix.
 *
 * Values are structural (regex on the cell shape), never pinned to a data
 * snapshot, because the app reads live-synced endpoint data.
 */

const E2E_DASHBOARD_SLUG = 'e2e-dashboard';
const TABLE_VISUAL_ID = 'vmskyy3ue3';
const PAGE4_ID = 'pmskyvxr01';

async function csrf(page: Page): Promise<string> {
    return page.evaluate(() => {
        const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    });
}

async function apiHeaders(page: Page) {
    return {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': await csrf(page),
    };
}

async function readPage(page: Page, slug: string) {
    const res = await page.request.get(`/api/builder-pages/${slug}`);
    expect(res.ok()).toBeTruthy();
    return res.json();
}

async function openDashboard(page: Page) {
    await login(page);
    await page.goto(`/p/${E2E_DASHBOARD_SLUG}`);
    const table = page
        .getByTestId(`visual-${TABLE_VISUAL_ID}`)
        .locator('table');
    await expect(table).toBeVisible({ timeout: 60_000 });
    return table;
}

/** Adds a numeric value column to the table visual in a throwaway clone. */
async function probeWithNumericColumn(
    page: Page,
    slug: string,
    tableNumber?: Record<string, unknown>,
): Promise<{ table: ReturnType<Page['locator']>; cleanup: () => Promise<void> }> {
    await openDashboard(page);

    const dashboard = await readPage(page, E2E_DASHBOARD_SLUG);
    const layout = structuredClone(dashboard.layout);
    const probe = await page.request.post('/api/builder-pages', {
        data: { name: 'E2E table number format probe', slug },
        headers: await apiHeaders(page),
    });
    expect(probe.ok()).toBeTruthy();
    const probePage = (await probe.json()).page;

    const page4 = layout.pbi.pages.find(
        (p: { id: string }) => p.id === PAGE4_ID,
    );
    const vis = page4.visuals.find(
        (v: { id: string }) => v.id === TABLE_VISUAL_ID,
    );
    vis.values.push({ table: 'empdefecteff', name: 'TodayQty', agg: 'sum' });
    if (tableNumber) vis.tableNumber = tableNumber;
    const saved = await page.request.put(`/api/builder-pages/${probePage.id}`, {
        data: { layout },
        headers: await apiHeaders(page),
    });
    expect(saved.ok()).toBeTruthy();

    await page.goto(`/p/${probePage.slug}`);
    const table = page
        .getByTestId(`visual-${TABLE_VISUAL_ID}`)
        .locator('table');
    await expect(table.locator('tbody tr').first()).toBeVisible({
        timeout: 60_000,
    });

    return {
        table,
        cleanup: async () => {
            await page.request
                .delete(`/api/builder-pages/${probePage.id}`, {
                    headers: await apiHeaders(page),
                })
                .catch(() => {});
        },
    };
}

/** The non-empty numeric cells of the 3rd column (axis, list, numeric). */
async function numericCells(table: ReturnType<Page['locator']>): Promise<string[]> {
    const texts = (
        await table.locator('tbody tr td:nth-child(3)').allTextContents()
    ).map((t) => t.trim());
    return texts.filter((t) => t && t !== '—');
}

test('unconfigured table keeps the plain auto integer format (tableNumber)', async ({
    page,
}) => {
    test.setTimeout(90_000);
    const { table, cleanup } = await probeWithNumericColumn(
        page,
        'e2e-table-number-format-plain',
    );
    try {
        const cells = await numericCells(table);
        expect(cells.length).toBeGreaterThan(0);
        for (const c of cells) expect(c).toMatch(/^-?\d[\d,]*$/);
    } finally {
        await cleanup();
    }
});

test('tableNumber decimals+suffix format the numeric cells (tableNumber)', async ({
    page,
}) => {
    test.setTimeout(90_000);
    const { table, cleanup } = await probeWithNumericColumn(
        page,
        'e2e-table-number-format-decsuffix',
        { displayUnits: 'none', decimals: 2, suffix: 'kW' },
    );
    try {
        const cells = await numericCells(table);
        expect(cells.length).toBeGreaterThan(0);
        for (const c of cells) expect(c).toMatch(/^-?\d[\d,]*\.\d{2}kW$/);
    } finally {
        await cleanup();
    }
});