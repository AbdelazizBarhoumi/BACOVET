import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Wave 2 features reached through the measure ASSISTANT, verified against the
 * REAL dataset the app serves from data.json (`storage/app/private/data.json`).
 *
 * Dataset `data/q/kpi_br_print` (8 rows, anchor = 2026-08):
 *   mois      : 2026-01 02 03 04 05 06 07 08
 *   nb_rejets : 1      3  6  2  4  5  3  0   -> TOTALYTD = 24, TOTALMTD = 0
 *   nb_inspections:     1  3  6  2  4  5  3  2 -> TOTALYTD = 26
 *   PREVIOUSMONTH (2026-07) nb_rejets = 3
 *   SAMEPERIODLASTYEAR = 0 (no 2025 data)
 *
 * The tests recompute these expectations from the live `/api/endpoint-datasets`
 * payload at runtime, so they stay exact even if the synced rows drift from the
 * snapshot above — and the figures above are what you should see in the UI.
 *
 * Manual repro (what the tests drive): open e2e-dashboard → Modifier → Créer
 * une nouvelle mesure → Assistant → Départ: table kpi_br_print (source + cible)
 * → Continuer ×2 → Résultat: « Appliquer une période » + colonne
 * kpi_br_print[mois]. « Aperçu en direct » / « Formule générée » follow.
 */

const DATASETS_URL = '/api/endpoint-datasets';

type KpiRow = { mois?: string; nb_rejets?: number; [k: string]: unknown };

/** The live kpi_br_print rows, or fail loudly when the dataset isn't synced. */
async function kpiBrRows(page: Page): Promise<KpiRow[]> {
    const res = await page.request.get(DATASETS_URL);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
        datasets: { name?: string; slug?: string; sample_data?: KpiRow[] }[];
    };
    const ds = body.datasets.find(
        (d) =>
            d.name === 'kpi_br_print' ||
            (d.slug ?? '').endsWith('/kpi_br_print'),
    );
    expect(
        ds,
        'kpi_br_print (data/q/kpi_br_print) must be synced from data.json',
    ).toBeTruthy();
    return ds!.sample_data ?? [];
}

const monthKey = (mois: string) => mois.slice(0, 7);

/**
 * Mirror of the time engine's window (anchor = latest loaded month, YYYY-MM):
 * YTD = every month of the anchor year up to the anchor, MTD = anchor month
 * only, M-1 = the calendar month before the anchor.
 */
function windowSum(
    rows: KpiRow[],
    window: 'ytd' | 'mtd' | 'prevMonth',
): number {
    const months = rows
        .map((r) => monthKey(String(r.mois ?? '')))
        .filter(Boolean)
        .sort();
    if (!months.length) return 0;
    const anchor = months[months.length - 1]!;
    const [ay, am] = anchor.split('-').map(Number);
    const prev = `${ay}-${String((am ?? 1) - 1).padStart(2, '0')}`;
    return rows
        .filter((r) => {
            const m = monthKey(String(r.mois ?? ''));
            if (window === 'ytd') return m.startsWith(`${ay}-`) && m <= anchor;
            if (window === 'mtd') return m === anchor;
            return m === prev;
        })
        .reduce((acc, r) => acc + (Number(r.nb_rejets) || 0), 0);
}

/** Login, open e2e-dashboard, open the measure wizard via the Ribbon menu. */
async function openWizard(page: Page) {
    await login(page);
    await page.goto('/p/e2e-dashboard');
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

/** Walk Départ (source = target = kpi_br_print) → Chemin → Résultat. */
async function walkToResultStep(page: Page) {
    await openWizard(page);
    const tableBtn = page.getByRole('button', {
        name: 'kpi_br_print',
    });
    await expect(tableBtn.first()).toBeVisible({ timeout: 45_000 });
    await tableBtn.first().click();
    await tableBtn.nth(1).click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await expect(page.getByText('Type de résultat')).toBeVisible();
}

/** The "Formule générée" pre block rendered on the Résultat step. */
function formulaBox(page: Page) {
    return page.getByText('Formule générée').locator('..').locator('pre');
}

/** Enable "Appliquer une période" (idempotent) and pick a window + date column. */
async function pickPeriod(
    page: Page,
    windowLabel: string,
    dateRef: string,
) {
    const toggle = page.getByText('Appliquer une période');
    if (!(await toggle.locator('input[type="checkbox"]').isChecked())) {
        await toggle.click();
    }
    const periodCard = page
        .locator('div')
        .filter({ hasText: 'Appliquer une période' })
        .last();
    await periodCard
        .getByRole('combobox')
        .nth(0)
        .selectOption({ label: windowLabel });
    await periodCard
        .getByRole('combobox')
        .nth(1)
        .selectOption({ label: dateRef });
}

/** The live "Aperçu en direct" number on the save step (null when not a number). */
async function previewNumber(page: Page): Promise<number | null> {
    const card = page.getByText('Aperçu en direct').locator('..');
    const text = ((await card.locator('div.font-mono').textContent()) ?? '').trim();
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
}

test('assistant YTD matches data.json: TOTALYTD(SUM(nb_rejets)) = 24', async ({
    page,
}) => {
    test.setTimeout(120_000);
    const expected = windowSum(await kpiBrRows(page), 'ytd');
    expect(expected).toBe(24); // data.json 1+3+6+2+4+5+3+0

    await walkToResultStep(page);
    await page.getByRole('button', { name: 'nb_rejets', exact: true }).click();
    await pickPeriod(
        page,
        'Année en cours (cumul YTD)',
        'kpi_br_print[mois]',
    );

    await expect(formulaBox(page)).toContainText(
        'TOTALYTD(SUM(kpi_br_print[nb_rejets]), kpi_br_print[mois])',
    );

    await page.getByRole('button', { name: 'Vérifier' }).click();
    await page
        .getByPlaceholder('p. ex. Style Codes')
        .fill('Rejets cumul annuels (YTD)');
    const daxBlock = page
        .locator('div')
        .filter({ hasText: /^DAX$/ })
        .locator('..')
        .locator('pre');
    await expect(daxBlock).toContainText(
        'TOTALYTD(SUM(kpi_br_print[nb_rejets]), kpi_br_print[mois])',
    );
    await expect.poll(async () => previewNumber(page)).toBe(expected);

    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Mesure créée')).toBeVisible({
        timeout: 20_000,
    });
});

test('assistant windows: MTD = 0, M-1 = 3, same period last year = 0 (data.json)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    const rows = await kpiBrRows(page);
    const mtd = windowSum(rows, 'mtd');
    const prev = windowSum(rows, 'prevMonth');
    expect(mtd).toBe(0); // anchor 2026-08 nb_rejets = 0
    expect(prev).toBe(3); // 2026-07 nb_rejets = 3

    await walkToResultStep(page);
    await page.getByRole('button', { name: 'nb_rejets', exact: true }).click();

    await pickPeriod(
        page,
        'Mois en cours (cumul MTD)',
        'kpi_br_print[mois]',
    );
    await expect(formulaBox(page)).toContainText(
        'TOTALMTD(SUM(kpi_br_print[nb_rejets]), kpi_br_print[mois])',
    );
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect.poll(async () => previewNumber(page)).toBe(mtd);

    // Back to Résultat to switch window.
    await page.getByRole('button', { name: 'Retour' }).click();
    await pickPeriod(
        page,
        'Mois précédent (M-1)',
        'kpi_br_print[mois]',
    );
    await expect(formulaBox(page)).toContainText(
        'CALCULATE(SUM(kpi_br_print[nb_rejets]), PREVIOUSMONTH(kpi_br_print[mois]))',
    );
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect.poll(async () => previewNumber(page)).toBe(prev);

    // Same period last year: no 2025 data → 0.
    await page.getByRole('button', { name: 'Retour' }).click();
    await pickPeriod(
        page,
        'Même année l’an dernier (SPLY)',
        'kpi_br_print[mois]',
    );
    await expect(formulaBox(page)).toContainText(
        'CALCULATE(SUM(kpi_br_print[nb_rejets]), SAMEPERIODLASTYEAR(kpi_br_print[mois]))',
    );
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect.poll(async () => previewNumber(page)).toBe(0);
});

test('assistant NOT IN excludes the picked live value (data.json)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    const rows = await kpiBrRows(page);

    await walkToResultStep(page);
    await page.getByRole('button', { name: 'nb_rejets', exact: true }).click();
    await page.getByText('Appliquer une condition').click();

    const condCard = page
        .locator('div')
        .filter({ hasText: 'Appliquer une condition' })
        .last();
    const combos = condCard.getByRole('combobox');
    await combos.nth(0).selectOption({ label: 'nb_rejets' });
    await combos.nth(1).selectOption({ label: 'Ne fait pas partie de' });

    // Pick the first live value (3 on data.json) from the popover.
    await condCard.getByRole('button', { name: /Choisir/ }).click();
    const popover = condCard.getByPlaceholder('Filtrer…').locator('..');
    const firstValue = popover
        .locator('label:has(input[type=checkbox])')
        .first();
    await expect(firstValue).toBeVisible({ timeout: 45_000 });
    await firstValue.locator('input[type="checkbox"]').check();
    const value = (await firstValue.textContent())?.trim() ?? '';

    // Expected: sum of nb_rejets whose value differs (TRIM … NOT IN {value}).
    const expected = rows
        .filter((r) => Number(r.nb_rejets) !== Number(value))
        .reduce((acc, r) => acc + (Number(r.nb_rejets) || 0), 0);

    const dax = (await formulaBox(page).textContent()) ?? '';
    expect(dax).toContain('NOT IN {');
    expect(dax).toContain(`NOT IN {${value}}`);

    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect.poll(async () => previewNumber(page)).toBe(expected);
});