import { test, expect } from '@playwright/test';

async function enterEditor(page: import('@playwright/test').Page) {
    await page.goto('/v5/p/test');
    if (/\/v5\/login/.test(page.url())) {
        const password = process.env.V5_TEST_PASSWORD;
        if (!password) throw new Error('V5_TEST_PASSWORD is required.');
        await page.locator('button').filter({ hasText: 'Super admin' }).click();
        const inputs = page.locator('input[type="password"]');
        const create = page.locator('button').filter({ hasText: 'Créer et se connecter' });
        await expect(inputs.first()).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
}

test.describe('Phase 4 — Filters', () => {
    test.beforeEach(async ({ page }) => enterEditor(page));

    async function selectObservations(page: import('@playwright/test').Page) {
        const select = page
            .locator('select')
            .filter({ hasText: 'Add a filter field' });
        const option = select.locator('option').filter({ hasText: 'Observations' }).first();
        const value = await option.getAttribute('value');
        if (!value) throw new Error('Observations filter option is unavailable.');
        await select.selectOption(value);
        return select;
    }

    test('adds a filter from the Filters pane and prevents duplicates', async ({ page }) => {
        const select = await selectObservations(page);
        await expect(page.getByText(/Observations is/)).toBeVisible();
        const option = select.locator('option').filter({ hasText: 'Observations' }).first();
        await select.selectOption((await option.getAttribute('value'))!);
        await expect(page.getByText(/Observations is/)).toHaveCount(1);
    });

    test('adds a filter by dragging a field from the Data pane', async ({ page }) => {
        await page.getByPlaceholder('Search').fill('Observations');
        await page.locator('button').filter({ hasText: 'articlescolis' }).first().click();
        const field = page.locator('div[draggable="true"]').filter({ hasText: 'Observations' }).first();
        await expect(field).toBeVisible();
        const filtersPane = page.locator('aside').filter({
            has: page.getByRole('heading', { name: 'Filters' }),
        });
        await field.dragTo(filtersPane.locator('div.overflow-auto'));
        await expect(page.getByText(/Observations is/)).toBeVisible();
        const filter = page.getByText(/Observations is/).locator('..').locator('..');
        await filter.locator('button').last().click();
        await expect(page.getByText(/Observations is/)).toHaveCount(0);
    });

    test('selects a filter value, changes scope, removes it, and reloads cleanly', async ({ page }) => {
        await selectObservations(page);
        const filter = page.getByText(/Observations is/).locator('..').locator('..');
        const value = filter.getByRole('checkbox').first();
        await value.check();
        await expect(page.getByText(/Observations is null/)).toBeVisible();
        await filter.getByLabel('Filter scope for Observations').selectOption('page');
        await expect(filter.getByLabel('Filter scope for Observations')).toHaveValue('page');
        await filter.locator('button').last().click();
        await expect(page.getByText(/Observations is/)).toHaveCount(0);
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Filters' })).not.toBeVisible();
    });
});