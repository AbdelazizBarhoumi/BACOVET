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

test.describe('Phase 7 — Shapes', () => {
    test.beforeEach(async ({ page }) => enterEditor(page));

    test('shows a single Shapes button in the Insert ribbon', async ({ page }) => {
        await page.locator('button').filter({ hasText: 'Insert' }).click();
        const shapes = page.locator('button[aria-label="Insert shapes"]');
        await expect(shapes).toBeVisible();
        await expect(shapes).toContainText('Shapes');
    });

    test('opens a grid of shape glyphs without labels', async ({ page }) => {
        await page.locator('button').filter({ hasText: 'Insert' }).click();
        await page.locator('button[aria-label="Insert shapes"]').click();
        const grid = page.locator('button[title="Rectangle"]');
        await expect(grid).toBeVisible();
        await expect(page.locator('button[title="Right arrow"]')).toBeVisible();
        await expect(page.locator('button[title="Hexagon"]')).toBeVisible();
    });

    test('adds a rectangle shape to the canvas', async ({ page }) => {
        await page.locator('button').filter({ hasText: 'Insert' }).click();
        await page.locator('button[aria-label="Insert shapes"]').click();
        await page.locator('button[title="Rectangle"]').click();
        await expect(page.locator('svg[aria-hidden]').first()).toBeVisible();
        const format = page.getByRole('button', { name: 'Format' });
        await expect(format).toBeVisible();
        await format.click();
        await expect(page.getByText('Shape', { exact: true })).toBeVisible();
        await expect(page.getByText('Rotation (deg)')).toBeVisible();
        await expect(page.getByText('Corner radius')).toBeVisible();
    });

    test('customizes outline color and rotation', async ({ page }) => {
        await page.locator('button').filter({ hasText: 'Insert' }).click();
        await page.locator('button[aria-label="Insert shapes"]').click();
        await page.locator('button[title="Rounded rectangle"]').click();
        const format = page.getByRole('button', { name: 'Format' });
        await format.click();
        const outline = page
            .getByText('Outline color', { exact: true })
            .locator('..')
            .locator('input[type="color"]');
        await outline.fill('#ff0000');
        await expect(outline).toHaveValue('#ff0000');
        const rotation = page
            .getByText('Rotation (deg)')
            .locator('..')
            .locator('input[type="number"]');
        await rotation.fill('45');
        await expect(rotation).toHaveValue('45');
    });

    test('switches the shape kind via the Format pane', async ({ page }) => {
        await page.locator('button').filter({ hasText: 'Insert' }).click();
        await page.locator('button[aria-label="Insert shapes"]').click();
        await page.locator('button[title="Diamond"]').click();
        const format = page.getByRole('button', { name: 'Format' });
        await format.click();
        const shapeSelect = page
            .getByText('Shape', { exact: true })
            .locator('..')
            .locator('select');
        await shapeSelect.selectOption('hexagon');
        await expect(shapeSelect).toHaveValue('hexagon');
    });

    test('hides font and number-format controls for shapes', async ({ page }) => {
        await page.locator('button').filter({ hasText: 'Insert' }).click();
        await page.locator('button[aria-label="Insert shapes"]').click();
        await page.locator('button[title="Oval"]').click();
        const format = page.getByRole('button', { name: 'Format' });
        await format.click();
        await expect(page.getByText('Shape', { exact: true })).toBeVisible();
        await expect(page.getByText('Number format')).not.toBeVisible();
    });
});
