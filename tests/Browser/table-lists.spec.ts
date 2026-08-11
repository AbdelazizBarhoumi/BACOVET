import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Table / matrix per-row list rendering (W1-12, W1-13, W1-14, W1-15).
 *
 * Targets `/p/e2e-dashboard` (page 14). Its active page ("Page 4") holds the
 * exact fixtures: a card `vmskywg8y2` with a list measure and no axis (global
 * list, W1-13) and a table `vmskyy3ue3` with axis `wip_chaine[ProdGroup]` and
 * value `Liste opérations` (per-row list, W1-12/14/15).
 *
 * Assertions are structural (chips present, per-row chip sets differ, dash
 * for empty chains, no bare 0, count treatment yields a positive integer)
 * rather than pinned to a specific data snapshot: the app reads live-synced
 * endpoint data that drifts from any static capture.
 *
 * The `listAgg` case patches a throwaway copy of the page via the builder API
 * (never the user's e2e-dashboard) and deletes it afterwards.
 */

const E2E_DASHBOARD_SLUG = 'e2e-dashboard';
const TABLE_VISUAL_ID = 'vmskyy3ue3';
const CARD_VISUAL_ID = 'vmskywg8y2';
const PAGE4_ID = 'pmskyvxr01';
const PROBE_SLUG = 'e2e-listagg-probe';
const PROBE_SUM_SLUG = 'e2e-listagg-sum-probe';
const PROBE_CARD_SLUG = 'e2e-listagg-card-probe';

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

test.describe('per-row list rendering (W1-12/13/14/15)', () => {
    test.describe.configure({ mode: 'serial', timeout: 90_000 });

    test('table renders per-row list chips, not numbers (W1-12)', async ({
        page,
    }) => {
        const table = await openDashboard(page);
        const rows = table.locator('tbody tr');
        await expect(rows.first()).toBeVisible({ timeout: 60_000 });

        // Row 0 is the first chain (CH01): per-row distinct ops as chips,
        // never a bare number.
        await expect(rows.nth(0).locator('td').nth(0)).toHaveText(/CH01/);
        const chips = rows
            .nth(0)
            .locator('td')
            .nth(1)
            .locator('span.font-mono');
        await expect(chips.first()).toBeVisible({ timeout: 60_000 });
        expect(await chips.count()).toBeGreaterThan(0);
        await expect(rows.nth(0).locator('td').nth(1)).not.toHaveText(/^\d+$/);
    });

    test('table shows the value column contents instead of repeating the chain label', async ({
        page,
    }) => {
        const table = await openDashboard(page);
        const rows = table.locator('tbody tr');
        await expect(rows.first()).toBeVisible({ timeout: 60_000 });

        const firstAxis = (await rows.nth(0).locator('td').nth(0).textContent())
            ?.trim();
        const firstValue = (await rows.nth(0).locator('td').nth(1).textContent())
            ?.trim();

        expect(firstAxis).toBeTruthy();
        expect(firstValue).toBeTruthy();
        expect(firstValue).not.toEqual(firstAxis);

        // Ensure at least one row has a value cell not starting with the chain
        // prefix, so we are not just mirroring the left column.
        const valueCells = table
            .locator('tbody tr td:nth-child(2)')
            .allTextContents();
        const values = (await valueCells).map((text) => text.trim());
        expect(values.some((text) => text && !/^CH\d/.test(text))).toBe(true);
    });

    test('different chains show different chip sets and empty renders — (W1-14, W1-15)', async ({
        page,
    }) => {
        const table = await openDashboard(page);
        const rows = table.locator('tbody tr');
        await expect(rows.first()).toBeVisible({ timeout: 60_000 });

        // Row 2 = CH02, a real chain: at least one op chip.
        await expect(rows.nth(2).locator('td').nth(0)).toHaveText(/CH02/);
        const row2Chips = rows
            .nth(2)
            .locator('td')
            .nth(1)
            .locator('span.font-mono');
        await expect(row2Chips.first()).toBeVisible({ timeout: 60_000 });
        expect(await row2Chips.count()).toBeGreaterThan(0);

        // Row 1 = CH01B, a chain with no empdefecteff rows -> `—`, never 0.
        await expect(rows.nth(1).locator('td').nth(0)).toHaveText(/CH01B/);
        await expect(rows.nth(1).locator('td').nth(1)).toHaveText('—');
        await expect(
            rows.nth(1).locator('td').nth(1).locator('span.font-mono'),
        ).toHaveCount(0);

        // Different chains render different chip sets (per-row scoping).
        const chipSet = async (n: number) =>
            new Set(
                await rows
                    .nth(n)
                    .locator('td')
                    .nth(1)
                    .locator('span.font-mono')
                    .allTextContents(),
            );
        const set0 = await chipSet(0);
        const set2 = await chipSet(2);
        expect(set0.size).toBeGreaterThan(0);
        expect(set2.size).toBeGreaterThan(0);
        expect(set0).not.toEqual(set2);

        // Regression net: no bare 0 anywhere in the list column.
        const texts = (
            await table.locator('tbody tr td:nth-child(2)').allTextContents()
        ).map((t) => t.trim());
        expect(texts).not.toContain('0');
        expect(texts).toContain('—');
    });

    test('card keeps the global list with no axis (W1-13)', async ({
        page,
    }) => {
        await login(page);
        await page.goto(`/p/${E2E_DASHBOARD_SLUG}`);
        const card = page.getByTestId(`visual-${CARD_VISUAL_ID}`);
        await expect(card).toBeVisible({ timeout: 60_000 });
        const items = card.locator('div.leading-snug');
        await expect(items.first()).toBeVisible({ timeout: 60_000 });
        expect(await items.count()).toBeGreaterThan(10);
    });

    test('listAgg=count applies the treatment per row (W1-15)', async ({
        page,
    }) => {
        await login(page);
        await page.goto(`/p/${E2E_DASHBOARD_SLUG}`);
        await expect(
            page.getByTestId(`visual-${TABLE_VISUAL_ID}`).locator('table'),
        ).toBeVisible({ timeout: 60_000 });

        const dashboard = await readPage(page, E2E_DASHBOARD_SLUG);
        const layout = structuredClone(dashboard.layout);
        const probe = await page.request.post('/api/builder-pages', {
            data: { name: 'E2E listAgg probe', slug: PROBE_SLUG },
            headers: await apiHeaders(page),
        });
        expect(probe.ok()).toBeTruthy();
        const probePage = (await probe.json()).page;
        try {
            const page4 = layout.pbi.pages.find(
                (p: { id: string }) => p.id === PAGE4_ID,
            );
            const vis = page4.visuals.find(
                (v: { id: string }) => v.id === TABLE_VISUAL_ID,
            );
            vis.values[0].listAgg = 'count';
            const saved = await page.request.put(
                `/api/builder-pages/${probePage.id}`,
                {
                    data: { layout },
                    headers: await apiHeaders(page),
                },
            );
            expect(saved.ok()).toBeTruthy();

            await page.goto(`/p/${probePage.slug}`);
            const table = page
                .getByTestId(`visual-${TABLE_VISUAL_ID}`)
                .locator('table');
            const rows = table.locator('tbody tr');
            await expect(rows.first()).toBeVisible({ timeout: 60_000 });

            // CH01 -> a positive integer (its distinct-op count); CH01B ->
            // no rows -> "—", never "0".
            await expect(rows.nth(0).locator('td').nth(0)).toHaveText(/CH01/);
            await expect(rows.nth(0).locator('td').nth(1)).toHaveText(
                /^[1-9]\d*$/,
            );
            await expect(rows.nth(1).locator('td').nth(0)).toHaveText(/CH01B/);
            await expect(rows.nth(1).locator('td').nth(1)).toHaveText('—');
        } finally {
            await page.request
                .delete(`/api/builder-pages/${probePage.id}`, {
                    headers: await apiHeaders(page),
                })
                .catch(() => {});
        }
    });

    test('listAgg=sum applies the numeric treatment per row (W1-15)', async ({
        page,
    }) => {
        await login(page);
        await page.goto(`/p/${E2E_DASHBOARD_SLUG}`);
        await expect(
            page.getByTestId(`visual-${TABLE_VISUAL_ID}`).locator('table'),
        ).toBeVisible({ timeout: 60_000 });

        const dashboard = await readPage(page, E2E_DASHBOARD_SLUG);
        const layout = structuredClone(dashboard.layout);
        const probe = await page.request.post('/api/builder-pages', {
            data: { name: 'E2E listAgg sum probe', slug: PROBE_SUM_SLUG },
            headers: await apiHeaders(page),
        });
        expect(probe.ok()).toBeTruthy();
        const probePage = (await probe.json()).page;
        try {
            const page4 = layout.pbi.pages.find(
                (p: { id: string }) => p.id === PAGE4_ID,
            );
            const vis = page4.visuals.find(
                (v: { id: string }) => v.id === TABLE_VISUAL_ID,
            );
            vis.values[0].listAgg = 'sum';
            const saved = await page.request.put(
                `/api/builder-pages/${probePage.id}`,
                {
                    data: { layout },
                    headers: await apiHeaders(page),
                },
            );
            expect(saved.ok()).toBeTruthy();

            await page.goto(`/p/${probePage.slug}`);
            const table = page
                .getByTestId(`visual-${TABLE_VISUAL_ID}`)
                .locator('table');
            const rows = table.locator('tbody tr');
            await expect(rows.first()).toBeVisible({ timeout: 60_000 });

            // Numeric mode: the cell collapses to a single treated value — a
            // number when the row has numeric codes, otherwise "—". It must
            // never render the chips list nor a bare 0. (Op codes are
            // text-dominated on this live dataset, so most rows are "—", which
            // is exactly the ignored-codes contract.)
            await expect(rows.nth(0).locator('td').nth(0)).toHaveText(/CH01/);
            const cell1 = rows.nth(0).locator('td').nth(1);
            const cellText = (await cell1.textContent())?.trim() ?? '';
            expect(cellText).toMatch(/^(?:[0-9]+|—)$/);
            await expect(rows.nth(1).locator('td').nth(1)).toHaveText('—');

            // Regression net: no chips and no bare 0 anywhere in the column.
            const texts = (
                await table.locator('tbody tr td:nth-child(2)').allTextContents()
            ).map((t) => t.trim());
            expect(texts.every((t) => /^(?:[0-9]+|—)$/.test(t))).toBe(true);
            expect(texts).not.toContain('0');
            expect(texts).toContain('—');
        } finally {
            await page.request
                .delete(`/api/builder-pages/${probePage.id}`, {
                    headers: await apiHeaders(page),
                })
                .catch(() => {});
        }
    });

    test('card applies the listAgg treatment and non-numeric codes fall back to — (W1-15)', async ({
        page,
    }) => {
        await login(page);
        await page.goto(`/p/${E2E_DASHBOARD_SLUG}`);
        await expect(
            page.getByTestId(`visual-${CARD_VISUAL_ID}`),
        ).toBeVisible({ timeout: 60_000 });

        const dashboard = await readPage(page, E2E_DASHBOARD_SLUG);
        const layout = structuredClone(dashboard.layout);
        const probe = await page.request.post('/api/builder-pages', {
            data: { name: 'E2E listAgg card probe', slug: PROBE_CARD_SLUG },
            headers: await apiHeaders(page),
        });
        expect(probe.ok()).toBeTruthy();
        const probePage = (await probe.json()).page;
        try {
            const page4 = layout.pbi.pages.find(
                (p: { id: string }) => p.id === PAGE4_ID,
            );
            const vis = page4.visuals.find(
                (v: { id: string }) => v.id === CARD_VISUAL_ID,
            );
            vis.values[0].listAgg = 'count';
            const saved = await page.request.put(
                `/api/builder-pages/${probePage.id}`,
                {
                    data: { layout },
                    headers: await apiHeaders(page),
                },
            );
            expect(saved.ok()).toBeTruthy();

            await page.goto(`/p/${probePage.slug}`);
            const card = page.getByTestId(`visual-${CARD_VISUAL_ID}`);
            await expect(card).toBeVisible({ timeout: 60_000 });
            // count treatment -> a positive integer, no chips list.
            await expect(
                card.locator('div.leading-snug'),
            ).toHaveCount(0);
            await expect(card.locator('span.text-xl')).toHaveText(/^[1-9]\d*$/);

            // A numeric mode over a text-only list ignores every code and
            // renders the "—" fallback, not 0.
            const layout2 = structuredClone(layout);
            const vis2 = layout2.pbi.pages
                .find((p: { id: string }) => p.id === PAGE4_ID)
                .visuals.find((v: { id: string }) => v.id === CARD_VISUAL_ID);
            vis2.values[0].listAgg = 'sum';
            const saved2 = await page.request.put(
                `/api/builder-pages/${probePage.id}`,
                {
                    data: { layout: layout2 },
                    headers: await apiHeaders(page),
                },
            );
            expect(saved2.ok()).toBeTruthy();
            await page.reload();
            await expect(card).toBeVisible({ timeout: 60_000 });
            await expect(card.locator('span.text-xl')).toHaveText('—');
        } finally {
            await page.request
                .delete(`/api/builder-pages/${probePage.id}`, {
                    headers: await apiHeaders(page),
                })
                .catch(() => {});
        }
    });
});
