import { test, expect } from '@playwright/test';

test.describe('Phase 3 — Data pane', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/v5/p/test');
        if (/\/v5\/login/.test(page.url())) {
            const password = process.env.V5_TEST_PASSWORD;
            if (!password) {
                throw new Error(
                    'Set V5_TEST_PASSWORD to run browser phases against a local first-login account.',
                );
            }
            await page.getByRole('button', { name: /Super admin/ }).click();
            const createButton = page
                .locator('button')
                .filter({ hasText: 'Créer et se connecter' });
            const passwordInputs = page.locator('input[type="password"]');
            await expect(passwordInputs.first()).toBeVisible();
            if ((await createButton.count()) > 0 && (await createButton.isVisible())) {
                await passwordInputs.nth(0).fill(password);
                await passwordInputs.nth(1).fill(password);
                await createButton.click();
            } else {
                await passwordInputs.nth(0).fill(password);
                await page.getByRole('button', { name: 'Connexion' }).click();
            }
            await page.waitForURL(/\/v5$/);
            await expect
                .poll(async () =>
                    page
                        .request
                        .get('/api/v5-auth/me')
                        .then((response) => response.status()),
                )
                .toBe(200);
            await page.goto('/v5/p/test');
        }
        await expect(page).not.toHaveURL(/\/v5\/login/);
        const editButton = page
            .locator('button')
            .filter({ hasText: 'Modifier' });
        await expect(editButton).toBeVisible();
        await editButton.click({ force: true });
        await expect(
            page.getByRole('heading', { name: 'Data' }),
        ).toBeVisible();
    });

    test('exposes Data, Filters, and Visualizations panes', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Data' })).toBeVisible();
        await expect(
            page.getByRole('heading', { name: 'Filters' }),
        ).toBeVisible();
        await expect(
            page.getByRole('heading', { name: 'Visualizations' }),
        ).toBeVisible();
    });

    test('searches field and table names without exposing drag JSON', async ({
        page,
    }) => {
        const search = page.getByPlaceholder('Search');
        await search.fill('sales');
        await expect(page.locator('body')).not.toContainText('"table"');
        await search.fill('');
        await expect(search).toHaveValue('');
    });
});
