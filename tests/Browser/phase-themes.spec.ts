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

async function openThemesPane(page: Page) {
    await page.locator('button').filter({ hasText: 'View' }).click();
    await page.locator('button').filter({ hasText: 'Themes' }).click();
    await expect(page.getByRole('heading', { name: 'Themes' })).toBeVisible();
}

async function mainStyle(page: Page): Promise<string> {
    return (
        (await page.locator('main').first().getAttribute('style')) ?? ''
    );
}

test.describe('Phase 6 — Themes', () => {
    test.beforeEach(async ({ page }) => enterEditor(page));

    test('applies a built-in theme and updates the canvas CSS variables', async ({ page }) => {
        await openThemesPane(page);
        const styleBefore = await mainStyle(page);
        await page.locator('button').filter({ hasText: 'Ocean' }).click();
        await expect(page.locator('button').filter({ hasText: 'Active' })).toBeVisible();
        const styleAfter = await mainStyle(page);
        expect(styleAfter).not.toBe(styleBefore);
        expect(styleAfter).toContain('oklch(0.6 0.13 220)');
    });

    test('switches to the report font and persists the theme across reload', async ({ page }) => {
        await openThemesPane(page);
        await page.locator('button').filter({ hasText: 'Monochrome' }).click();
        await page.getByRole('button', { name: /Enregistrer/ }).click();
        await expect(page.getByText('Layout enregistré').first()).toBeVisible();
        await page.reload();
        await enterEditor(page);
        await openThemesPane(page);
        const monochrome = page
            .locator('button')
            .filter({ hasText: 'Monochrome' });
        await expect(monochrome).toBeVisible();
        await expect(monochrome).toContainText('Active');
    });

    test('saves a custom theme with a new name and keeps it editable', async ({ page }) => {
        await openThemesPane(page);
        await page.getByPlaceholder('Theme name').fill('My branded theme');
        await page.getByRole('button', { name: 'Save theme' }).click();
        const card = page.locator('button').filter({ hasText: 'My branded theme' });
        await expect(card).toBeVisible();
        await expect(
            card
                .locator('xpath=ancestor::div[contains(@class,"border-border")][1]')
                .first()
                .locator('button')
                .filter({ hasText: 'Delete' }),
        ).toBeVisible();
        await page.getByPlaceholder('Theme name').fill('');
    });
});

test.describe('Phase 6 — Visual formatting', () => {
    test.beforeEach(async ({ page }) => enterEditor(page));

    test('sets a number format on a visual', async ({ page }) => {
        await page.locator('button[title="Card (new)"]').click();
        await page.getByRole('button', { name: 'Format' }).click();
        const numberFormat = page
            .getByText('Number format', { exact: true })
            .locator('..')
            .locator('select');
        await expect(numberFormat).toBeVisible();
        await numberFormat.selectOption('currency');
        await expect(numberFormat).toHaveValue('currency');
        await numberFormat.selectOption('compact');
        await expect(numberFormat).toHaveValue('compact');
    });

    test('toggles conditional formatting modes on a table', async ({ page }) => {
        await page.locator('button[title="Table"]').click();
        await page.getByRole('button', { name: 'Format' }).click();
        const modeSelect = page
            .getByText('Conditional formatting', { exact: true })
            .locator('..')
            .locator('select');
        await expect(modeSelect).toBeVisible();
        await modeSelect.selectOption('colorScale');
        await expect(modeSelect).toHaveValue('colorScale');
        await expect(page.getByText('Min', { exact: true })).toBeVisible();
        await modeSelect.selectOption('none');
        await expect(page.getByText('Min', { exact: true })).not.toBeVisible();
    });
});
