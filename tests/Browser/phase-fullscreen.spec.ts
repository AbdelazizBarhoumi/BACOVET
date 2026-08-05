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

async function enterView(page: Page) {
    await enterEditor(page);
    const view = page.locator('button').filter({ hasText: 'Voir' });
    await expect(view).toBeVisible();
    await view.click({ force: true });
    await expect(page.locator('button').filter({ hasText: 'Modifier' })).toBeVisible();
}

test.describe('Phase — Fullscreen presentation mode', () => {
    test('opens fullscreen from edit mode, hides chrome, and exits', async ({ page }) => {
        await enterEditor(page);
        await page.getByLabel('Plein écran').first().click();
        const fullscreen = page.getByTestId('fullscreen-view');
        await expect(fullscreen).toBeVisible();
        // Editor chrome is hidden in fullscreen.
        await expect(page.getByRole('heading', { name: 'Visualizations' })).not.toBeVisible();
        await page.getByLabel('Quitter le plein écran').click();
        await expect(fullscreen).not.toBeVisible();
        await expect(page.getByRole('heading', { name: 'Visualizations' })).toBeVisible();
    });

    test('opens fullscreen from view mode and exits with Escape', async ({ page }) => {
        await enterView(page);
        await page.getByLabel('Plein écran').click();
        await expect(page.getByTestId('fullscreen-view')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('fullscreen-view')).not.toBeVisible();
        await expect(page.locator('button').filter({ hasText: 'Modifier' })).toBeVisible();
    });

    test('navigates pages with the on-screen chevrons', async ({ page }) => {
        await enterView(page);
        const firstPage = page.locator('footer').first().innerText();
        await page.getByLabel('Plein écran').click();
        const label = page.getByTestId('fullscreen-view').locator('text=/·/').first();
        await expect(label).toContainText('1/');
        await page.getByLabel('Page suivante').click();
        await expect(label).toContainText('2/');
        await page.getByLabel('Page précédente').click();
        await expect(label).toContainText('1/');
        void firstPage;
    });

    test('swipes left to go to the next page and right to go back', async ({ page }) => {
        await enterView(page);
        await page.getByLabel('Plein écran').click();
        const canvas = page.getByTestId('fullscreen-canvas');
        await expect(canvas).toBeVisible();
        const box = await canvas.boundingBox();
        if (!box) throw new Error('fullscreen canvas has no bounding box');
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;

        // Swipe left => next page.
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX - box.width * 0.5, startY, { steps: 8 });
        await page.mouse.up();
        const label = page.getByTestId('fullscreen-view').locator('text=/·/').first();
        await expect(label).toContainText('2/');

        // Swipe right => back to the first page.
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + box.width * 0.5, startY, { steps: 8 });
        await page.mouse.up();
        await expect(label).toContainText('1/');
    });

    test('a short click on the canvas does not change pages', async ({ page }) => {
        await enterView(page);
        await page.getByLabel('Plein écran').click();
        const canvas = page.getByTestId('fullscreen-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('fullscreen canvas has no bounding box');
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        const label = page.getByTestId('fullscreen-view').locator('text=/·/').first();
        await expect(label).toContainText('1/');
    });
});
