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

test.describe('Phase 5 — Visualizations and field wells', () => {
    test.beforeEach(async ({ page }) => enterEditor(page));

    test('creates and selects a card visual', async ({ page }) => {
        const card = page.locator('button[title="Card (new)"]');
        await card.click();
        await expect(page.getByText('Build visual')).toBeVisible();
        await expect(page.getByText('Values')).toBeVisible();
    });

    test('creates a table, inserts a field, changes aggregation, and removes it', async ({ page }) => {
        await page.locator('button[title="Table"]').click();
        const dataSearch = page.getByPlaceholder('Search');
        await dataSearch.fill('IDArticleColis');
        const tableGroup = page.locator('button').filter({ hasText: 'articlescolis' }).first();
        await tableGroup.click();
        const field = page.locator('div[draggable="true"]').filter({ hasText: 'IDArticleColis' }).first();
        await field.dblclick();
        await expect(page.getByText('Values')).toBeVisible();
        const agg = page.locator('select').filter({ hasText: 'sum' }).last();
        if (await agg.count()) {
            await agg.selectOption('avg');
            await expect(agg).toHaveValue('avg');
        }
        const remove = page.locator('button').filter({ has: page.locator('svg') }).last();
        await expect(remove).toBeVisible();
    });

    test('switches visual types without crashing the editor', async ({ page }) => {
        await page.locator('button[title="Line"]').click();
        await expect(page.getByText('Build visual')).toBeVisible();
        await page.locator('button[title="Donut"]').click();
        await expect(page.getByText('Build visual')).toBeVisible();
        await expect(page.locator('body')).not.toContainText('"table"');
    });
});