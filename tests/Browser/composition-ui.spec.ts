import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Composition step UI (W1-17, W1-18) walked through the real browser.
 *
 * - W1-17: the ratio path never renders a bare `/` division — the wizard
 *   translates the "÷" operator into a `DIVIDE(...)` expression. The
 *   composition step exposes a "Si le dénominateur est 0" control (0 /
 *   BLANK / NA) whose DAX preview and the final DAX block follow the choice.
 * - W1-18: typing a verbatim `%` in the DAX editor must surface the "modulo,
 *   not percent" guidance instead of silently reading it as a percentage.
 *
 * The step relies on the stable `e2e-dashboard` fixtures checked into the
 * app's live-synced data (see `table-lists.spec.ts`): a builder page with at
 * least one table so the wizard's operand defaults (column, agg=sum) resolve.
 */

const E2E_DASHBOARD_SLUG = 'e2e-dashboard';

async function openEditorWithMeasureMenu(page: Page) {
    await login(page);
    await page.goto(`/p/${E2E_DASHBOARD_SLUG}`);

    // View mode first — the editor (with the Ribbon) opens via "Modifier".
    await page
        .getByRole('button', { name: 'Modifier' })
        .waitFor({ state: 'visible', timeout: 45_000 });
    await page.getByRole('button', { name: 'Modifier' }).click();

    const measureButton = page.getByRole('button', {
        name: 'Créer une nouvelle mesure',
    });
    await measureButton.waitFor({ state: 'visible', timeout: 45_000 });
    await measureButton.click();
}

async function openWizard(page: Page) {
    await openEditorWithMeasureMenu(page);
    await page.getByRole('button', { name: 'Assistant' }).click();
    await expect(page.getByText('Assistant de mesure')).toBeVisible();
}

async function openCompositionStep(page: Page) {
    await openWizard(page);
    // toggleCompose(true) jumps the wizard directly onto the composition step
    // — no "Continuer" needed here.
    await page.getByRole('button', { name: 'Composition A • B' }).click();
    await expect(page.getByText('Opérande A')).toBeVisible({
        timeout: 45_000,
    });
}

test('ratio composition shows the zero-denominator control and DIVIDE DAX (W1-17)', async ({
    page,
}) => {
    test.setTimeout(90_000);
    await openCompositionStep(page);

    // The "÷" operator is preselected, so the denominator control exists.
    const daxBox = page
        .locator('div')
        .filter({ hasText: /^DAX$/ })
        .locator('..')
        .locator('pre');
    await expect(daxBox).toContainText('DIVIDE(');

    // Default fallback is "0": the emitted DAX carries the ", 0" arm and the
    // preview hint reads DIVIDE(A, B, 0). Never a literal division sign.
    await expect(page.getByText('Si le dénominateur est 0')).toBeVisible();
    await expect(page.getByText('DIVIDE(A, B, 0)')).toBeVisible();
    expect(await daxBox.textContent()).toContain('DIVIDE(');
    expect((await daxBox.textContent()) ?? '').not.toContain('/');

    // BLANK: DIVIDE(a, b) with no fallback arm — the ", 0" arm disappears.
    await page.getByRole('button', { name: 'Vide (BLANK)' }).click();
    await expect(page.getByText('DIVIDE(A, B)')).toBeVisible();
    await expect(daxBox).not.toContainText(', 0)');
    expect((await daxBox.textContent()) ?? '').not.toContain('/');

    // NA: DIVIDE(a, b, NA()) — the DAX preview and final DAX follow.
    await page.getByRole('button', { name: 'Non dispo (NA)' }).click();
    await expect(page.getByText('DIVIDE(A, B, NA())')).toBeVisible();
    await expect(daxBox).toContainText('NA()');
    expect((await daxBox.textContent()) ?? '').not.toContain('/');

    // And back to 0 keeps the fallback arm — the control is a three-way switch
    // exposed on the ÷ path only (never for the other operators).
    await page.getByRole('button', { name: '0', exact: true }).click();
    await expect(page.getByText('DIVIDE(A, B, 0)')).toBeVisible();
    await expect(daxBox).toContainText('DIVIDE(');
});

test('ratio DAX always uses DIVIDE, never a bare / (W1-17)', async ({
    page,
}) => {
    test.setTimeout(90_000);
    await openCompositionStep(page);

    // Switch the operator to +, × and −: the ratio fallback control is gone,
    // and the DAX preview renders the operand pair operators, still no `/`.
    for (const op of ['×', '−', '+'] as const) {
        await page.getByRole('button', { name: op, exact: true }).click();
        await expect(page.getByText('Si le dénominateur est 0')).toHaveCount(0);
        const dax = page
            .locator('div')
            .filter({ hasText: /^DAX$/ })
            .locator('..')
            .locator('pre');
        const text = (await dax.textContent()) ?? '';
        expect(text).not.toContain('/');
    }
});

test('the DAX editor flags a verbatim % as the modulo operator (W1-18)', async ({
    page,
}) => {
test.setTimeout(90_000);
    await openEditorWithMeasureMenu(page);
    await page.getByRole('button', { name: 'DAX' }).click();

    const editor = page.locator('textarea').first();
    await editor.waitFor({ state: 'visible', timeout: 45_000 });

    // A modulo expression is valid DAX: the reminder, not an error, appears.
    await editor.fill('Modulo = 17 % 5');
    await expect(
        page.getByText(/« % » en DAX est l’opérateur modulo/),
    ).toBeVisible();

    // Remove the '%' → the reminder disappears (no stale warning).
    await editor.fill('Modulo = 17 + 5');
    await expect(
        page.getByText(/« % » en DAX est l’opérateur modulo/),
    ).toHaveCount(0);

    // The DIVIDE-by-zero form — what the composition step emits — never
    // triggers the warning.
    await editor.fill('Taux = DIVIDE([Chiffre], [Total], 0) * 100');
    await expect(
        page.getByText(/« % » en DAX est l’opérateur modulo/),
    ).toHaveCount(0);
});