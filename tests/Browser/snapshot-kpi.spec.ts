import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Wave 2 — W2-9: the exact daily KPI is authorable in the Composer A • B step
 * and reproduces the real snapshot served from data.json:
 *
 *   rejets_suite_inspection_paquet_annee_en_cours.BundleRejectYear    = 0
 *   inspections_paquet_annee_en_cours.BundleInspectedYear             = 4
 *   →  DIVIDE(SUM(rejets), SUM(inspections), 0) * 100  =  0
 *
 * The expected value is recomputed from the live `/api/endpoint-datasets`
 * payload at runtime, so it stays exact even if the synced rows drift.
 */

const DATASETS_URL = '/api/endpoint-datasets';
const E2E_DASHBOARD_SLUG = 'e2e-dashboard';

const REJETS_SUFFIX = '/rejets_suite_inspection_paquet_annee_en_cours';
const INSP_SUFFIX = '/inspections_paquet_annee_en_cours';

/** Mirror of the app's model table name (lib/pbi/datasets.ts buildTables). */
function tableNameOf(d: Dataset): string {
    return (
        d.label ??
        d.object ??
        (d.slug ?? '').split('/').pop() ??
        d.slug ??
        ''
    );
}

type Dataset = {
    name?: string;
    slug?: string;
    sample_data?: Record<string, unknown>[];
};

async function snapshotPairs(page: Page): Promise<{
    rejetsName: string;
    inspName: string;
    rejets: Record<string, unknown>[];
    insp: Record<string, unknown>[];
}> {
    await login(page); // the datasets route requires an authenticated session
    const res = await page.request.get(DATASETS_URL);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { datasets?: Dataset[] };    const datasets = body.datasets ?? [];
    const find = (suffix: string) =>
        datasets.find(
            (d) =>
                d.name === suffix.slice(1) ||
                (d.slug ?? '').endsWith(suffix),
        );
    const rejets = find(REJETS_SUFFIX);
    const insp = find(INSP_SUFFIX);
    expect(
        rejets,
        `rejets_suite_inspection_paquet_annee_en_cours (${REJETS_SUFFIX}) must be synced from data.json`,
    ).toBeTruthy();
    expect(
        insp,
        `inspections_paquet_annee_en_cours (${INSP_SUFFIX}) must be synced from data.json`,
    ).toBeTruthy();
    return {
        rejetsName: tableNameOf(rejets!),
        inspName: tableNameOf(insp!),
        rejets: rejets!.sample_data ?? [],
        insp: insp!.sample_data ?? [],
    };
}

async function openComposer(page: Page) {
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

test('year snapshot KPI: DIVIDE(rejets/inspections) × 100 = 0 (W2-9)', async ({
    page,
}) => {
    test.setTimeout(120_000);
    const { rejetsName, inspName, rejets, insp } = await snapshotPairs(page);

    const numerator = rejets.reduce(
        (acc, r) => acc + (Number(r.BundleRejectYear) || 0),
        0,
    );
    const denominator = insp.reduce(
        (acc, r) => acc + (Number(r.BundleInspectedYear) || 0),
        0,
    );
    // data.json: 0 rejets against 4 inspected → 0% (DIVIDE fallback only
    // matters on a zero denominator, which would also yield 0 here).
    expect({ numerator, denominator }).toEqual({ numerator: 0, denominator: 4 });
    const expected = denominator === 0 ? 0 : (numerator / denominator) * 100;
    expect(expected).toBe(0);

    await openComposer(page);

    await operandCard(page, 'A')
        .locator('select')
        .first()
        .selectOption({ label: rejetsName });
    await operandCard(page, 'B')
        .locator('select')
        .first()
        .selectOption({ label: inspName });

    // Ratio × 100 is the wizard default for "/" — the exact KPI shape.
    await expect(
        page.getByLabel('Résultat en pourcentage (multiplié par 100)'),
    ).toBeChecked();

    const dax = page
        .getByText('DAX', { exact: true })
        .locator('..')
        .locator('pre')
        .first();
    await expect(dax).toContainText(
        `DIVIDE(SUM(${rejetsName}[BundleRejectYear]), SUM(${inspName}[BundleInspectedYear]), 0) * 100`,
    );

    // Live preview recomputed by the engine from the real rows.
    const live = page
        .getByText('Résultat en direct')
        .locator('..')
        .locator('div.font-mono');
    await expect
        .poll(async () => {
            const text = ((await live.textContent()) ?? '').trim();
            const n = Number(text);
            return Number.isFinite(n) ? n : null;
        })
        .toBe(expected);
});