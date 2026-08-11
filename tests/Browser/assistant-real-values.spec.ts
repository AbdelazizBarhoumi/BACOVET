import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * The measure ASSISTANT walked against the REAL dataset the app serves from
 * data.json (`storage/app/private/data.json`). Every "expected" figure below
 * is recomputed at runtime from the live `/api/endpoint-datasets` payload AND
 * pinned to the data.json snapshot, so a drifted sync fails loudly with the
 * number to compare against.
 *
 * Snapshots (data.json):
 *   kpi_br_compo    (5 rows)  SUM(nb_rejets)=49, SUM(nb_inspections)=49
 *                             -> DIVIDE(rejets,inspections,0)*100 = 100
 *   kpi_br_print    (8 rows)  SUM(nb_rejets)=24
 *   codestyle       (100 rows) SUM(OrderQty)=54478
 *
 * Manual repro (single): e2e-dashboard → Modifier → Créer une nouvelle mesure
 * → Assistant → « Valeur d’une table » → table kpi_br_compo → Continuer →
 * colonne nb_rejets → Vérifier → « Aperçu en direct » = 49.
 */

const DATASETS_URL = '/api/endpoint-datasets';
const E2E_DASHBOARD_SLUG = 'e2e-dashboard';

type Row = Record<string, unknown>;

/** The live sample rows of a dataset, or fail loudly when it isn't synced. */
async function dsRows(page: Page, table: string): Promise<Row[]> {
    await login(page); // the datasets route requires an authenticated session
    const res = await page.request.get(DATASETS_URL);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
        datasets: { name?: string; slug?: string; sample_data?: Row[] }[];
    };
    const ds = body.datasets.find(
        (d) =>
            d.name === table ||
            (d.slug ?? '').endsWith(`/${table}`),
    );
    expect(
        ds,
        `${table} must be synced from data.json`,
    ).toBeTruthy();
    return ds!.sample_data ?? [];
}

function columnSum(rows: Row[], col: string): number {
    return rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
}

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

/** Remove a measure by name (assistant saves persist to /api/measures). */
async function cleanupMeasure(page: Page, name: string) {
    const res = await page.request.get('/api/measures');
    const body = (await res.json()) as { measures?: { id: number; name: string }[] };
    const m = (body.measures ?? []).find((x) => x.name === name);
    if (m) {
        await page.request
            .delete(`/api/measures/${m.id}`, { headers: await apiHeaders(page) })
            .catch(() => {});
    }
}

/** Login, open e2e-dashboard, open the measure wizard via the Ribbon menu. */
async function openWizard(page: Page) {
    await login(page);
    await page.goto(`/p/${E2E_DASHBOARD_SLUG}`);
    await page
        .getByRole('button', { name: 'Modifier' })
        .waitFor({ state: 'visible', timeout: 45_000 });
    await page.getByRole('button', { name: 'Modifier' }).click();

    const measureButton = page.getByRole('button', {
        name: 'Créer une nouvelle mesure',
    });
    await measureButton.waitFor({ state: 'visible', timeout: 45_000 });
    await measureButton.click();
    await page.getByRole('button', { name: 'Assistant' }).click();
    await expect(page.getByText('Assistant de mesure')).toBeVisible();
}

/** Objectif « Valeur d’une table » → pick `table` → Continuer → Résultat. */
async function walkToResultStep(page: Page, table: string) {
    await openWizard(page);
    await page.getByRole('button', { name: /Valeur d’une table/i }).click();
    const tableBtn = page
        .getByText('Table à lire')
        .locator('..')
        .getByRole('button', { name: table });
    await expect(tableBtn.first()).toBeVisible({ timeout: 45_000 });
    await tableBtn.first().click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await expect(page.getByText('Type de résultat')).toBeVisible();
}

/** Objectif « Valeur composée » → Opérandes step (Composer A • B). */
async function openComposer(page: Page) {
    await openWizard(page);
    await page.getByRole('button', { name: /Valeur composée/ }).click();
    await expect(page.getByText('Opérande A')).toBeVisible({
        timeout: 45_000,
    });
}

/** The Opérande A / B card (the two-select container beneath the header). */
function operandCard(page: Page, label: 'A' | 'B') {
    return page
        .getByText(`Opérande ${label}`, { exact: true })
        .locator('..')
        .locator('..');
}

/** Select table + numeric column inside an operand card. */
async function pickOperand(
    page: Page,
    label: 'A' | 'B',
    table: string,
    column: string,
) {
    const selects = operandCard(page, label).locator('select');
    await selects.nth(0).selectOption({ label: table });
    await selects.nth(1).selectOption({ label: column });
}

/** The "Formule générée" pre block rendered on the Résultat step. */
function formulaBox(page: Page) {
    return page.getByText('Formule générée').locator('..').locator('pre');
}

/** The live "Aperçu en direct" number on the save step (null when not a number). */
async function previewNumber(page: Page): Promise<number | null> {
    const card = page.getByText('Aperçu en direct').locator('..');
    const text = ((await card.locator('div.font-mono').textContent()) ?? '').trim();
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
}

/** The live "Résultat en direct" number on the Opérandes step. */
async function liveCompositionNumber(page: Page): Promise<number | null> {
    const card = page.getByText('Résultat en direct').locator('..');
    const text = ((await card.locator('div.font-mono').textContent()) ?? '').trim();
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
}

test('assistant SUM(nb_rejets) over kpi_br_compo = 49 (data.json)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    const expected = columnSum(await dsRows(page, 'kpi_br_compo'), 'nb_rejets');
    expect(expected).toBe(49); // 4+8+1+33+3

    await walkToResultStep(page, 'kpi_br_compo');
    await page.getByRole('button', { name: 'nb_rejets', exact: true }).click();
    await expect(formulaBox(page)).toContainText('SUM(kpi_br_compo[nb_rejets])');

    await page.getByRole('button', { name: 'Vérifier' }).click();
    const measureName = `Rejets BR compo ${Date.now()}`;
    await page.getByPlaceholder('p. ex. Style Codes').fill(measureName);
    await expect.poll(async () => previewNumber(page)).toBe(expected);

    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(page.getByText('Mesure créée').first()).toBeVisible({
        timeout: 20_000,
    });
    await cleanupMeasure(page, measureName);
});

test('assistant ratio DIVIDE(rejets, inspections) × 100 = 100 (data.json)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    const rows = await dsRows(page, 'kpi_br_compo');
    const sumRejets = columnSum(rows, 'nb_rejets');
    const sumInsp = columnSum(rows, 'nb_inspections');
    expect({ sumRejets, sumInsp }).toEqual({ sumRejets: 49, sumInsp: 49 });
    const expected = sumInsp === 0 ? 0 : (sumRejets / sumInsp) * 100;

    await openComposer(page);
    await pickOperand(page, 'A', 'kpi_br_compo', 'nb_rejets');
    await pickOperand(page, 'B', 'kpi_br_compo', 'nb_inspections');

    await expect(
        page.getByLabel('Résultat en pourcentage (multiplié par 100)'),
    ).toBeChecked();
    const dax = page
        .getByText('DAX', { exact: true })
        .locator('..')
        .locator('pre')
        .first();
    await expect(dax).toContainText(
        'DIVIDE(SUM(kpi_br_compo[nb_rejets]), SUM(kpi_br_compo[nb_inspections]), 0) * 100',
    );

    await expect.poll(async () => liveCompositionNumber(page)).toBe(expected);
});

test('assistant SUM(nb_rejets) over kpi_br_print = 24 (data.json)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    const expected = columnSum(await dsRows(page, 'kpi_br_print'), 'nb_rejets');
    expect(expected).toBe(24);

    await walkToResultStep(page, 'kpi_br_print');
    await page
        .getByRole('button', { name: 'nb_rejets', exact: true })
        .click();
    await expect(formulaBox(page)).toContainText(
        'SUM(kpi_br_print[nb_rejets])',
    );

    await page.getByRole('button', { name: 'Vérifier' }).click();
    const measureName = `Rejets BR print ${Date.now()}`;
    await page.getByPlaceholder('p. ex. Style Codes').fill(measureName);
    await expect.poll(async () => previewNumber(page)).toBe(expected);

    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(page.getByText('Mesure créée').first()).toBeVisible({
        timeout: 20_000,
    });
    await cleanupMeasure(page, measureName);
});

test('assistant SUM(OrderQty) over codestyle = 54478 (data.json)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    const expected = columnSum(await dsRows(page, 'codestyle'), 'OrderQty');
    expect(expected).toBe(54478);

    await walkToResultStep(page, 'codestyle');
    await page
        .getByRole('button', { name: 'OrderQty', exact: true })
        .click();
    await expect(formulaBox(page)).toContainText('SUM(codestyle[OrderQty])');

    await page.getByRole('button', { name: 'Vérifier' }).click();
    const measureName = `Qtés commandées ${Date.now()}`;
    await page.getByPlaceholder('p. ex. Style Codes').fill(measureName);
    await expect.poll(async () => previewNumber(page)).toBe(expected);

    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(page.getByText('Mesure créée').first()).toBeVisible({
        timeout: 20_000,
    });
    await cleanupMeasure(page, measureName);
});
