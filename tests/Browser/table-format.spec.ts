import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Table/matrix value-cell number formatting ("Valeurs numériques" block),
 * driven entirely by live endpoint data — no dependency on a fixed
 * `e2e-dashboard` fixture.
 *
 * Each probe builds a throwaway builder page whose layout is assembled in the
 * test from the live datasets (`/api/endpoint-datasets`):
 *  - unconfigured → a numeric value column keeps the plain auto format;
 *  - configured (`displayUnits:'none', decimals:2, suffix:'kW'`) → every
 *    numeric cell carries the fixed decimals + suffix;
 *  - a VALUES list measure with `listAgg=sum` → the treated cell goes through
 *    the same block (the regression fixed by `formatTableTreated`).
 *
 * The layout is normalized by the app on load (`normalizeState`), so a
 * minimal but well-formed state works. Assertions are structural (regex on
 * the cell shape), never pinned to a data snapshot.
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

/** Mirror of `normalizeType()` in `@/lib/pbi/datasets`. */
function normalizeType(t: string): 'number' | 'date' | 'boolean' | 'text' {
    if (t === 'number' || t === 'integer' || t === 'float') return 'number';
    if (t === 'date') return 'date';
    if (t === 'boolean' || t === 'bool') return 'boolean';
    return 'text';
}

function hasFinite(rows: Record<string, unknown>[], name: string): boolean {
    return rows.some((r) => {
        const v = r[name];
        return (
            v !== null &&
            v !== undefined &&
            v !== '' &&
            isFinite(Number(String(v).trim()))
        );
    });
}

/** Column names + effective types for a dataset (schema or inferred). */
function typedColumns(d: Dataset): { name: string; type: string }[] {
    if (d.columns && d.columns.length) return d.columns;
    const rows = d.sample_data ?? [];
    const first = rows[0];
    return Object.keys(first ?? {}).map((name) => {
        const nonEmpty = rows
            .map((r) => r[name] ?? null)
            .filter((v) => v !== null && v !== undefined && v !== '');
        const numeric =
            nonEmpty.length > 0 &&
            nonEmpty.every((v) => isFinite(Number(String(v).trim())));
        return { name, type: numeric ? 'number' : 'text' };
    });
}

/** First dataset exposing a numeric column with at least one finite value. */
async function pickNumberDataset(
    page: Page,
): Promise<{ name: string; column: string } | null> {
    const res = await page.request.get('/api/endpoint-datasets');
    expect(res.ok()).toBeTruthy();
    const body: { datasets?: Dataset[] } = await res.json();
    for (const d of body.datasets ?? []) {
        const name = tableNameOf(d);
        const rows = d.sample_data ?? [];
        const col = typedColumns(d).find(
            (c) => normalizeType(c.type) === 'number' && hasFinite(rows, c.name),
        );
        if (col) return { name, column: col.name };
    }
    return null;
}

/** First dataset with a numeric column whose whole-column sum is an integer
 * in [1, 999] — so the unconfigured table's auto format renders it as the
 * plain integer string (no compact K/M, no percent). */
async function pickSmallSumDataset(
    page: Page,
): Promise<{ name: string; column: string; sum: number } | null> {
    const res = await page.request.get('/api/endpoint-datasets');
    expect(res.ok()).toBeTruthy();
    const body: { datasets?: Dataset[] } = await res.json();
    for (const d of body.datasets ?? []) {
        const name = tableNameOf(d);
        const rows = d.sample_data ?? [];
        const col = typedColumns(d).find(
            (c) => normalizeType(c.type) === 'number' && hasFinite(rows, c.name),
        );
        if (!col) continue;
        const sum = rows.reduce<number>((acc, r) => {
            const v = r[col.name];
            const n =
                v === null || v === undefined || v === ''
                    ? NaN
                    : Number(String(v).trim());
            return acc + (isFinite(n) ? n : 0);
        }, 0);
        if (Number.isInteger(sum) && sum >= 1 && sum <= 999)
            return { name, column: col.name, sum };
    }
    return null;
}

/** A fully-default table/matrix visual with the given values well. */
function mkTableVisual(
    id: string,
    values: unknown[],
    tableNumber?: unknown,
    numberFormat: string = 'auto',
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
        numberFormat,
        ...(tableNumber ? { tableNumber } : {}),
    };
}

/** A minimal-but-valid `{version, pbi}` layout for the page builder. */
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
        data: { name: 'E2E table format probe', slug },
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

/** Creates a server-side VALUES measure (registered by every page load). */
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

/** The non-empty value cells of the (axis-less) probe table. */
async function numericCells(table: ReturnType<Page['locator']>): Promise<string[]> {
    const texts = (await table.locator('tbody td').allTextContents()).map((t) =>
        t.trim(),
    );
    return texts.filter((t) => t && t !== '—');
}

test('unconfigured table keeps the plain integer format (tableNumber)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await login(page);
    const picked = await pickSmallSumDataset(page);
    expect(picked).not.toBeNull();
    const { name, column, sum } = picked!;

    const layout = buildLayout([
        mkTableVisual(
            't1',
            [{ table: name, name: column, agg: 'sum' }],
            undefined,
            'int',
        ),
    ]);
    const probe = await createProbe(
        page,
        `e2e-tfmt-plain-${Date.now().toString(36)}`,
        layout,
    );
    try {
        await page.goto(`/p/${probe.slug}`);
        const table = page.getByTestId('visual-t1').locator('table');
        await expect(table.locator('tbody tr').first()).toBeVisible({
            timeout: 60_000,
        });
        const cells = await numericCells(table);
        expect(cells.length).toBeGreaterThan(0);
        // Unconfigured table: the raw aggregate renders as the plain integer
        // it sums to — never a treated list, never a bare 0.
        for (const c of cells) expect(c).toBe(String(sum));
    } finally {
        await deleteProbe(page, probe.id);
    }
});

test('tableNumber decimals+suffix format the numeric cells (tableNumber)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await login(page);
    const picked = await pickNumberDataset(page);
    expect(picked).not.toBeNull();
    const { name, column } = picked!;

    const layout = buildLayout([
        mkTableVisual(
            't1',
            [{ table: name, name: column, agg: 'sum' }],
            { displayUnits: 'none', decimals: 2, suffix: 'kW' },
        ),
    ]);
    const probe = await createProbe(
        page,
        `e2e-tfmt-decsuffix-${Date.now().toString(36)}`,
        layout,
    );
    try {
        await page.goto(`/p/${probe.slug}`);
        const table = page.getByTestId('visual-t1').locator('table');
        await expect(table.locator('tbody tr').first()).toBeVisible({
            timeout: 60_000,
        });
        const cells = await numericCells(table);
        expect(cells.length).toBeGreaterThan(0);
        for (const c of cells) expect(c).toMatch(/^-?\d[\d,]*\.\d{2}kW$/);
    } finally {
        await deleteProbe(page, probe.id);
    }
});

test('listAgg treated cells honor the tableNumber block (tableNumber)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await login(page);
    const picked = await pickNumberDataset(page);
    expect(picked).not.toBeNull();
    const { name, column } = picked!;
    const daxTable = /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
        ? name
        : `'${name.replace(/'/g, "''")}'`;

    const measure = await createListMeasure(
        page,
        `Probe = VALUES(${daxTable}[${column}])`,
    );
    try {
        const layout = buildLayout([
            mkTableVisual(
                't1',
                [
                    {
                        table: 'Measures',
                        name: measure.name,
                        agg: 'sum',
                        listAgg: 'sum',
                    },
                ],
                { displayUnits: 'none', decimals: 2, suffix: 'kW' },
            ),
        ]);
        const probe = await createProbe(
            page,
            `e2e-tfmt-treated-${Date.now().toString(36)}`,
            layout,
        );
        try {
            await page.goto(`/p/${probe.slug}`);
            const table = page.getByTestId('visual-t1').locator('table');
            await expect(table.locator('tbody tr').first()).toBeVisible({
                timeout: 60_000,
            });
            // The treated sum is a number (the column has finite values), so
            // the cell carries the configured decimals + suffix once the list
            // measure resolves — never the raw chip list. Wait for the format
            // rather than reading the cell mid-resolve.
            await expect(table.locator('tbody td').first()).toHaveText(
                /^-?\d[\d,]*\.\d{2}kW$/,
                { timeout: 60_000 },
            );
            const cells = await numericCells(table);
            expect(cells.length).toBeGreaterThan(0);
            for (const c of cells)
                expect(c).toMatch(/^-?\d[\d,]*\.\d{2}kW$/);
        } finally {
            await deleteProbe(page, probe.id);
        }
    } finally {
        await deleteMeasure(page, measure.id);
    }
});
