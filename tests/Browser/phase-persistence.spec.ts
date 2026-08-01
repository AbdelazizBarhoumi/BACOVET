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

test('persists a visual title across save and reload', async ({ page }) => {
    await enterEditor(page);
    await page.locator('button[title="Card (new)"]').click();
    await page.getByRole('button', { name: 'Format' }).click();
    const titleInput = page
        .getByText('Title', { exact: true })
        .locator('..')
        .locator('input');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Phase persistence card');
    await page.getByRole('button', { name: /Enregistrer/ }).click();
    await expect(page.getByText('Layout enregistré').first()).toBeVisible();
    await page.reload();
    await enterEditor(page);
    await expect(page.locator('body')).toContainText('Phase persistence card');
    await expect(page.locator('body')).not.toContainText('"table"');
});