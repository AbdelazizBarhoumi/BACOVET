import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * The DAX editor ("Saisir directement la formule DAX") driven against the REAL
 * dataset the app serves from data.json (`storage/app/private/data.json`).
 *
 * Dataset `data/q/kpi_br_compo` (5 rows — snapshot in data.json):
 *   mois     : 2026-01 2026-02 2026-03 2026-06 2026-07
 *   nb_rejets: 4       8       1       33      3        -> SUM = 49
 *   nb_inspections:    4       8       1       33      3 -> SUM = 49
 *   -> DIVIDE(SUM(rejets), SUM(inspections), 0) * 100   = 100
 *
 * The editor validates the formula against the real table/column names of the
 * loaded datasets, so a typo'd column is rejected (Colonne « … » introuvable)
 * and a correct formula validates clean and persists to `/api/measures`.
 *
 * Manual repro (what the tests drive): open e2e-dashboard → Modifier → Créer
 * une nouvelle mesure → DAX → type `Rejets BR = DIVIDE(SUM(kpi_br_compo[
 * nb_rejets]), SUM(kpi_br_compo[nb_inspections]), 0) * 100` → Valider.
 */

const E2E_DASHBOARD_SLUG = 'e2e-dashboard';

type MeasureRecord = { id: number; name: string; expression: string };

/** Login, open e2e-dashboard, open the DAX dialog and return its textarea. */
async function openDaxEditor(page: Page) {
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
    await page.getByRole('button', { name: 'DAX' }).click();

    const editor = page.locator('textarea').first();
    await editor.waitFor({ state: 'visible', timeout: 45_000 });
    return editor;
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

async function fetchMeasures(page: Page): Promise<MeasureRecord[]> {
    const res = await page.request.get('/api/measures');
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { measures: MeasureRecord[] };
    return body.measures ?? [];
}

async function deleteMeasure(page: Page, id: number) {
    const res = await page.request.delete(`/api/measures/${id}`, {
        headers: await apiHeaders(page),
    });
    expect(res.ok()).toBeTruthy();
}

test('autocomplete proposes the real columns of kpi_br_compo (data.json)', async ({
    page,
}) => {
    test.setTimeout(90_000);
    const editor = await openDaxEditor(page);

    // Inside a known table's brackets the dropdown lists exactly that table's
    // columns — every one of them comes from data.json.
    await editor.fill('Rejets = SUM(kpi_br_compo[');
    const popover = page
        .locator('div.absolute')
        .filter({ hasText: 'Colonnes et mesures' });
    await expect(popover).toBeVisible();
    for (const col of ['nb_inspections', 'nb_rejets', 'br_pct']) {
        await expect(popover.getByText(col, { exact: true })).toBeVisible();
    }

    // Picking the real `nb_rejets` column inserts `nb_rejets]`.
    await popover.getByText('nb_rejets', { exact: true }).click();
    expect(await editor.inputValue()).toBe(
        'Rejets = SUM(kpi_br_compo[nb_rejets]',
    );
});

test('a correct formula over the real columns validates, saves and persists', async ({
    page,
}) => {
    test.setTimeout(90_000);
    const editor = await openDaxEditor(page);

    const name = `Rejets BR ${Date.now()}`;
    const formula =
        'DIVIDE(SUM(kpi_br_compo[nb_rejets]), SUM(kpi_br_compo[nb_inspections]), 0) * 100';
    await editor.fill(`${name} = ${formula}`);

    // No French validation error for a formula over real columns.
    await expect(
        page.getByText(/introuvable|non supportée|signe =/),
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page.getByText('Mesure créée').first()).toBeVisible({
        timeout: 20_000,
    });

    // Persisted verbatim (expression = "Name = formula").
    const measures = await fetchMeasures(page);
    const saved = measures.find((m) => m.name === name);
    expect(saved).toBeTruthy();
    expect(saved!.expression).toBe(`${name} = ${formula}`);
    await deleteMeasure(page, saved!.id);
});

test('a typo in the column name is rejected before save (data.json columns)', async ({
    page,
}) => {
    test.setTimeout(90_000);
    const editor = await openDaxEditor(page);

    const name = `Rejets invalide ${Date.now()}`;
    await editor.fill(`${name} = SUM(kpi_br_compo[nb_rejet_inexistant])`);

    // The real columns are known, so the bogus one is called out.
    await expect(page.getByText(/Colonne « .* » introuvable/)).toBeVisible();

    await page.getByRole('button', { name: 'Valider' }).click();
    const measures = await fetchMeasures(page);
    expect(measures.some((m) => m.name === name)).toBe(false);
});

test('the % modulo warning fires for a real formula and clears for DIVIDE×100', async ({
    page,
}) => {
    test.setTimeout(90_000);
    const editor = await openDaxEditor(page);

    await editor.fill('Rejets BR = 17 % 5');
    await expect(
        page.getByText(/« % » en DAX est l’opérateur modulo/),
    ).toBeVisible();

    // The DIVIDE × 100 ratio shape never trips the warning.
    await editor.fill(
        'Rejets BR = DIVIDE(SUM(kpi_br_compo[nb_rejets]), SUM(kpi_br_compo[nb_inspections]), 0) * 100',
    );
    await expect(
        page.getByText(/« % » en DAX est l’opérateur modulo/),
    ).toHaveCount(0);
});
