import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Table / matrix per-row list rendering (W1-12, W1-13, W1-14, W1-15), driven
 * entirely by live endpoint data — no dependency on a fixed `e2e-dashboard`
 * fixture.
 *
 * A probe page is assembled in the test from `/api/endpoint-datasets`:
 *  - a table visual: axis on a text column A (≥2 distinct non-empty values),
 *    value = a `VALUES(A)` list measure → one chip per row group (W1-12);
 *  - a card visual with the same list measure and no axis → the global
 *    distinct list (W1-13);
 *  - the same table with `listAgg='count'` → a positive integer per row,
 *    never 0 (W1-15);
 *  - the same table with `listAgg='sum'` over a numeric column → a single
 *    treated value per row, never the chip list / bare 0 (W1-15).
 *
 * Assertions are structural (chips present, per-row chip sets differ, no bare
 * 0, treated cells collapse to a number or —), never pinned to a snapshot.
 */

type Dataset = {
    slug: string;
    label: string | null;
    object: string | null;
    columns: { name: string; type: string }[] | null;
    sample_data: Record<string, unknown>[] | null;
};

const PAGE_PRESET = {
    preset: '16:9',
    width: 1280,
    height: 720,
    background: 'var(--card)',
    wallpaper: 'var(--muted)',
    tooltip: false,
    hidden: false,
};

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

/** Mirror of `tableName()` in `@/lib/pbi/datasets`. */
function tableNameOf(d: Dataset): string {
    return d.label || d.object || d.slug.split('/').pop() || d.slug;
}

function normalizeType(t: string): 'number' | 'date' | 'boolean' | 'text' {
    if (t === 'number' || t === 'integer' || t === 'float') return 'number';
    if (t === 'date') return 'date';
    if (t === 'boolean' || t === 'bool') return 'boolean';
    return 'text';
}

/** Column name, effective type and distinct non-empty values. */
function columnsOf(
    d: Dataset,
): { name: string; type: string; distinct: Set<string> }[] {
    const rows = d.sample_data ?? [];
    let names: string[];
    let declared: Map<string, string>;
    if (d.columns && d.columns.length) {
        names = d.columns.map((c) => c.name);
        declared = new Map(d.columns.map((c) => [c.name, c.type]));
    } else {
        names = Object.keys(rows[0] ?? {});
        declared = new Map();
    }
    return names.map((name) => {
        const nonEmpty = rows
            .map((r) => r[name] ?? null)
            .filter((v) => v !== null && v !== undefined && v !== '');
        const numeric =
            nonEmpty.length > 0 &&
            nonEmpty.every((v) => isFinite(Number(String(v).trim())));
        const type = declared.has(name)
            ? declared.get(name)!
            : numeric
              ? 'number'
              : 'text';
        return {
            name,
            type,
            distinct: new Set(nonEmpty.map((v) => String(v).trim())),
        };
    });
}

/**
 * First dataset with a text column A (≥2 distinct non-empty values, at least
 * one non-numeric, `0` absent) and a numeric column with a finite value.
 */
async function pickListDataset(
    page: Page,
): Promise<{ name: string; axisCol: string; numCol: string } | null> {
    const res = await page.request.get('/api/endpoint-datasets');
    expect(res.ok()).toBeTruthy();
    const body: { datasets?: Dataset[] } = await res.json();
    for (const d of body.datasets ?? []) {
        const cols = columnsOf(d);
        const axis = cols.find(
            (c) =>
                normalizeType(c.type) === 'text' &&
                c.distinct.size >= 2 &&
                [...c.distinct].some((v) => !isFinite(Number(v))) &&
                !c.distinct.has('0'),
        );
        if (!axis) continue;
        const rows = d.sample_data ?? [];
        const num = cols.find((c) => {
            if (normalizeType(c.type) !== 'number') return false;
            return rows.some((r) => {
                const v = r[c.name];
                return (
                    v !== null &&
                    v !== undefined &&
                    v !== '' &&
                    isFinite(Number(String(v).trim()))
                );
            });
        });
        if (!num) continue;
        return { name: tableNameOf(d), axisCol: axis.name, numCol: num.name };
    }
    return null;
}

function mkTableVisual(
    id: string,
    axis: { table: string; name: string },
    values: unknown[],
) {
    return {
        id,
        type: 'table',
        name: 'Table probe',
        title: '',
        x: 8,
        y: 8,
        w: 800,
        h: 400,
        z: 1,
        hidden: false,
        axis: [{ table: axis.table, name: axis.name, agg: 'count' }],
        legend: [],
        values,
        tooltips: [],
        smallMultiples: [],
        drillFields: [],
        minimum: [],
        maximum: [],
        target: [],
        showTitle: true,
        showLegend: true,
        showLabels: false,
        background: 'var(--card)',
        border: true,
        shadow: false,
        altText: '',
        colorIndex: 0,
        analytics: [],
        conditionalFormat: false,
        subtotals: false,
        drillLevel: 0,
        maxCategories: 200,
        rotation: 0,
        numberFormat: 'auto',
    };
}

function mkCardVisual(id: string, values: unknown[]) {
    return {
        id,
        type: 'card',
        name: 'Card probe',
        title: '',
        x: 820,
        y: 8,
        w: 400,
        h: 200,
        z: 2,
        hidden: false,
        axis: [],
        legend: [],
        values,
        tooltips: [],
        smallMultiples: [],
        drillFields: [],
        minimum: [],
        maximum: [],
        target: [],
        showTitle: true,
        showLegend: true,
        showLabels: false,
        background: 'var(--card)',
        border: true,
        shadow: false,
        altText: '',
        colorIndex: 0,
        analytics: [],
        conditionalFormat: false,
        subtotals: false,
        drillLevel: 0,
        maxCategories: 200,
        rotation: 0,
    };
}

function buildLayout(visuals: unknown[]): { version: number; pbi: object } {
    const page = {
        id: 'p1',
        name: 'Page 1',
        visuals,
        format: { ...PAGE_PRESET },
        mobile: {},
        tabOrder: (visuals as { id: string }[]).map((v) => v.id),
    };
    return {
        version: 2,
        pbi: {
            pages: [page],
            activePageId: 'p1',
            selectedId: null,
            selectedIds: [],
            filters: [],
            parameters: [],
            slicerSelections: {},
            slicerDateRanges: {},
            slicerSync: {},
            crossFilter: null,
            interactions: {},
            defaultInteraction: 'highlight',
            tooltipHover: null,
            editInteractions: false,
            bookmarks: [],
            theme: 'default',
            customThemes: [],
            showGridlines: true,
            snapToGrid: true,
            zoom: 100,
            mobileView: false,
            fullscreen: false,
            ribbonTab: 'Insertion',
            openPanes: {
                filters: true,
                visualizations: true,
                data: true,
                selection: false,
                bookmarks: false,
                syncSlicers: false,
                analytics: false,
                themes: false,
            },
            drillthrough: null,
        },
    };
}

async function createProbe(
    page: Page,
    slug: string,
    layout: { version: number; pbi: object },
): Promise<{ id: number; slug: string }> {
    const res = await page.request.post('/api/builder-pages', {
        data: { name: 'E2E table lists probe', slug },
        headers: await apiHeaders(page),
    });
    expect(res.ok()).toBeTruthy();
    const created: { page: { id: number; slug: string } } = await res.json();
    const saved = await page.request.put(
        `/api/builder-pages/${created.page.id}`,
        {
            data: { layout },
            headers: await apiHeaders(page),
        },
    );
    expect(saved.ok()).toBeTruthy();
    return { id: created.page.id, slug: created.page.slug };
}

async function deleteProbe(page: Page, id: number): Promise<void> {
    await page.request
        .delete(`/api/builder-pages/${id}`, { headers: await apiHeaders(page) })
        .catch(() => {});
}

async function createListMeasure(
    page: Page,
    expression: string,
): Promise<{ id: number; name: string }> {
    const name = `Probe Liste ${Date.now()}${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    const res = await page.request.post('/api/measures', {
        data: { name, expression },
        headers: await apiHeaders(page),
    });
    expect(res.ok()).toBeTruthy();
    const body: { measure: { id: number; name: string } } = await res.json();
    return { id: body.measure.id, name: body.measure.name };
}

async function deleteMeasure(page: Page, id: number): Promise<void> {
    await page.request
        .delete(`/api/measures/${id}`, { headers: await apiHeaders(page) })
        .catch(() => {});
}

function daxTable(name: string): string {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
        ? name
        : `'${name.replace(/'/g, "''")}'`;
}

const listAggWell = (name: string, listAgg?: string) => ({
    table: 'Measures',
    name,
    agg: 'sum',
    ...(listAgg ? { listAgg } : {}),
});

/** First two tbody rows with a non-empty axis label. */
async function nonEmptyAxisRows(
    table: ReturnType<Page['locator']>,
): Promise<number[]> {
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    const idx: number[] = [];
    for (let i = 0; i < count && idx.length < 2; i++) {
        const label =
            (await rows.nth(i).locator('td').nth(0).textContent())?.trim() ?? '';
        if (label) idx.push(i);
    }
    return idx;
}

test('table renders per-row list chips and distinct chip sets (W1-12, W1-14)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await login(page);
    const picked = await pickListDataset(page);
    expect(picked).not.toBeNull();
    const { name, axisCol } = picked!;

    const measure = await createListMeasure(
        page,
        `Probe = VALUES(${daxTable(name)}[${axisCol}])`,
    );
    try {
        const layout = buildLayout([
            mkTableVisual('t1', { table: name, name: axisCol }, [
                listAggWell(measure.name),
            ]),
        ]);
        const probe = await createProbe(
            page,
            `e2e-tlists-chips-${Date.now().toString(36)}`,
            layout,
        );
        try {
            await page.goto(`/p/${probe.slug}`);
            const table = page.getByTestId('visual-t1').locator('table');
            const rows = table.locator('tbody tr');
            await expect(rows.first()).toBeVisible({ timeout: 60_000 });

            // The list column renders per-row chips, and the live dataset has
            // at least two distinct axis values → ≥2 chip groups.
            const chips = table.locator(
                'tbody tr td:nth-child(2) span.font-mono',
            );
            await expect(chips.first()).toBeVisible({ timeout: 60_000 });
            expect(await chips.count()).toBeGreaterThanOrEqual(2);

            // At least one chip is a text code, not a bare number (W1-12).
            const chipTexts = await chips.allTextContents();
            expect(
                chipTexts.some((c) => !/^-?\d[\d.,]*$/.test(c.trim())),
            ).toBe(true);

            // Two different axis groups render different chip sets (W1-14).
            const idx = await nonEmptyAxisRows(table);
            expect(idx.length).toBeGreaterThanOrEqual(2);
            const setOf = async (i: number) =>
                new Set(
                    await rows
                        .nth(i)
                        .locator('td')
                        .nth(1)
                        .locator('span.font-mono')
                        .allTextContents(),
                );
            const a = await setOf(idx[0]!);
            const b = await setOf(idx[1]!);
            expect(a.size).toBeGreaterThan(0);
            expect(b.size).toBeGreaterThan(0);
            expect(a).not.toEqual(b);

            // Regression net: the list column never renders a bare 0.
            const texts = (
                await table.locator('tbody tr td:nth-child(2)').allTextContents()
            ).map((t) => t.trim());
            expect(texts).not.toContain('0');
        } finally {
            await deleteProbe(page, probe.id);
        }
    } finally {
        await deleteMeasure(page, measure.id);
    }
});

test('card keeps the global list with no axis (W1-13)', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    const picked = await pickListDataset(page);
    expect(picked).not.toBeNull();
    const { name, axisCol } = picked!;

    const measure = await createListMeasure(
        page,
        `Probe = VALUES(${daxTable(name)}[${axisCol}])`,
    );
    try {
        const layout = buildLayout([
            mkCardVisual('c1', [listAggWell(measure.name)]),
        ]);
        const probe = await createProbe(
            page,
            `e2e-tlists-card-${Date.now().toString(36)}`,
            layout,
        );
        try {
            await page.goto(`/p/${probe.slug}`);
            const card = page.getByTestId('visual-c1');
            await expect(card).toBeVisible({ timeout: 60_000 });
            const items = card.locator('div.leading-snug');
            await expect(items.first()).toBeVisible({ timeout: 60_000 });
            // Global distinct list of the axis column (≥2 by selection).
            expect(await items.count()).toBeGreaterThanOrEqual(2);
        } finally {
            await deleteProbe(page, probe.id);
        }
    } finally {
        await deleteMeasure(page, measure.id);
    }
});

test('listAgg=count applies the treatment per row (W1-15)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await login(page);
    const picked = await pickListDataset(page);
    expect(picked).not.toBeNull();
    const { name, axisCol } = picked!;

    const measure = await createListMeasure(
        page,
        `Probe = VALUES(${daxTable(name)}[${axisCol}])`,
    );
    try {
        const layout = buildLayout([
            mkTableVisual('t1', { table: name, name: axisCol }, [
                listAggWell(measure.name, 'count'),
            ]),
        ]);
        const probe = await createProbe(
            page,
            `e2e-tlists-count-${Date.now().toString(36)}`,
            layout,
        );
        try {
            await page.goto(`/p/${probe.slug}`);
            const table = page.getByTestId('visual-t1').locator('table');
            const rows = table.locator('tbody tr');
            await expect(rows.first()).toBeVisible({ timeout: 60_000 });

            // Every non-empty group collapses to a positive integer (its
            // distinct-list size), never 0 and never the chip list.
            const idx = await nonEmptyAxisRows(table);
            expect(idx.length).toBeGreaterThanOrEqual(2);
            for (const i of idx) {
                await expect(rows.nth(i).locator('td').nth(1)).toHaveText(
                    /^[1-9]\d*$/,
                );
            }
        } finally {
            await deleteProbe(page, probe.id);
        }
    } finally {
        await deleteMeasure(page, measure.id);
    }
});

test('listAgg=sum applies the numeric treatment per row (W1-15)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await login(page);
    const picked = await pickListDataset(page);
    expect(picked).not.toBeNull();
    const { name, numCol } = picked!;

    const measure = await createListMeasure(
        page,
        `Probe = VALUES(${daxTable(name)}[${numCol}])`,
    );
    try {
        const layout = buildLayout([
            mkTableVisual('t1', { table: name, name: numCol }, [
                listAggWell(measure.name, 'sum'),
            ]),
        ]);
        const probe = await createProbe(
            page,
            `e2e-tlists-sum-${Date.now().toString(36)}`,
            layout,
        );
        try {
            await page.goto(`/p/${probe.slug}`);
            const table = page.getByTestId('visual-t1').locator('table');
            const rows = table.locator('tbody tr');
            await expect(rows.first()).toBeVisible({ timeout: 60_000 });

            // Numeric mode: each non-empty group collapses to a single treated
            // value — a number when it has numeric codes, otherwise —. Never
            // the chip list.
            const idx = await nonEmptyAxisRows(table);
            expect(idx.length).toBeGreaterThanOrEqual(1);
            const texts: string[] = [];
            for (const i of idx) {
                const t =
                    (await rows.nth(i).locator('td').nth(1).textContent())
                        ?.trim() ?? '';
                expect(t).toMatch(/^(?:-?\d[\d.,]*|—)$/);
                texts.push(t);
            }
            expect(
                texts.some((t) => /^-?\d[\d.,]*$/.test(t)),
            ).toBe(true);
        } finally {
            await deleteProbe(page, probe.id);
        }
    } finally {
        await deleteMeasure(page, measure.id);
    }
});
