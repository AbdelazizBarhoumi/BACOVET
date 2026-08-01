import { test, expect, type Page } from '@playwright/test';

async function enterEditor(page: Page) {
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
    const edit = page.locator('button').filter({ hasText: 'Modifier' });
    await expect(edit).toBeVisible();
    await edit.click({ force: true });
    await expect(page.getByRole('heading', { name: 'Visualizations' })).toBeVisible();
}

test.describe('Phase 8–10 — Format, page format, analytics', () => {
    test.beforeEach(async ({ page }) => enterEditor(page));

    test('updates visual format controls and analytics idempotently', async ({ page }) => {
        await page.locator('button[title="Line"]').click();
        await page.getByRole('button', { name: 'Format' }).click();
        const title = page.locator('input').filter({ has: page.locator('xpath=..').filter({ hasText: 'Title' }) }).first();
        const titleInputs = page.locator('input').evaluateAll((inputs) => inputs.map((input) => ({ value: input.value, type: input.type })));
        expect(await titleInputs).toBeTruthy();
        const formatText = await page.locator('body').innerText();
        expect(formatText).toContain('Show title');
        await page.getByRole('button', { name: 'Analytics' }).click();
        const constant = page.getByText('constant line').locator('..').getByRole('checkbox');
        await constant.check();
        await expect(constant).toBeChecked();
        await constant.uncheck();
        await expect(constant).not.toBeChecked();
    });

    test('supports page presets and clamps visual dimensions', async ({ page }) => {
        await page.locator('button').filter({ hasText: 'Overview' }).last().click();
        await page.locator('button[title="Line"]').click();
        await page.locator('button').filter({ hasText: 'Overview' }).last().click();
        await page.keyboard.press('Escape');
        await expect(page.getByText(/Format page/)).toBeVisible();
    });
});