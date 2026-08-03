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
    await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
}

async function addFilter(page: Page, field: string) {
    const select = page
        .locator('select')
        .filter({ hasText: 'Add a filter field' });
    const option = select.locator('option').filter({ hasText: field }).first();
    const value = await option.getAttribute('value');
    if (!value) throw new Error(`${field} filter option is unavailable.`);
    await select.selectOption(value);
}

test.describe('Phase 5 — Filter types', () => {
    test.beforeEach(async ({ page }) => enterEditor(page));

    test('switches a filter between list, dropdown, search, and back', async ({ page }) => {
        await addFilter(page, 'Observations');
        const typeSelect = page.getByLabel('Filter type for Observations');
        await expect(typeSelect).toHaveValue('list');
        await typeSelect.selectOption('dropdown');
        await expect(typeSelect).toHaveValue('dropdown');
        await expect(page.getByLabel('Dropdown value for Observations')).toBeVisible();
        await typeSelect.selectOption('search');
        await expect(page.getByPlaceholder('Search Observations…')).toBeVisible();
        await typeSelect.selectOption('list');
        await expect(page.getByRole('checkbox')).not.toHaveCount(0);
    });

    test('dropdown single-select narrows the filter', async ({ page }) => {
        await addFilter(page, 'Observations');
        await page.getByLabel('Filter type for Observations').selectOption('dropdown');
        const dropdown = page.getByLabel('Dropdown value for Observations');
        const first = dropdown.locator('option').nth(1);
        const value = await first.getAttribute('value');
        if (!value) throw new Error('No dropdown value available.');
        await dropdown.selectOption(value);
        await expect(page.getByText(/Observations is/)).toContainText(value);
        await dropdown.selectOption('__all__');
        await expect(page.getByText(/Observations is \(All\)/)).toBeVisible();
    });

    test('search filter matches a substring', async ({ page }) => {
        await addFilter(page, 'Observations');
        await page.getByLabel('Filter type for Observations').selectOption('search');
        await page.getByPlaceholder('Search Observations…').fill('colis');
        await expect(page.getByText(/is “colis”/)).toBeVisible();
    });

    test('top N filter shows an N input and a measure picker', async ({ page }) => {
        await addFilter(page, 'Observations');
        await page.getByLabel('Filter type for Observations').selectOption('topN');
        const nInput = page.getByRole('spinbutton').first();
        await expect(nInput).toBeVisible();
        await nInput.fill('5');
        await expect(page.getByLabel('Top N measure for Observations')).toBeVisible();
    });
});

test.describe('Phase 5 — Interaction settings', () => {
    test.beforeEach(async ({ page }) => enterEditor(page));

    test('toggles edit-interactions mode from the ribbon', async ({ page }) => {
        await page.locator('button').filter({ hasText: 'View' }).click();
        const toggle = page.locator('button').filter({ hasText: 'Edit interactions' });
        await expect(toggle).toBeVisible();
        await toggle.click();
        await expect(page.getByText(/Edit interactions is on/)).toBeVisible();
        await expect(toggle).toHaveClass(/bg-brand/);
        await toggle.click();
        await expect(page.getByText(/Edit interactions is on/)).not.toBeVisible();
    });

    test('sets a Highlight interaction without selecting the target visual', async ({ page }) => {
        // Create a source visual, then a target visual that we move aside so
        // the two do not overlap on the canvas.
        const column = page.locator('button[title="Clustered column"]');
        await column.click();
        const visuals = page.locator('[aria-label="Column"]');
        const source = visuals.nth((await visuals.count()) - 1);

        await column.click();
        const target = visuals.last();
        const targetBox = await target.boundingBox();
        if (targetBox) {
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 6);
            await page.mouse.down();
            await page.mouse.move(
                targetBox.x + targetBox.width / 2 + 180,
                targetBox.y + targetBox.height + 80,
                { steps: 8 },
            );
            await page.mouse.up();
        }

        // Turn on edit-interactions mode from the ribbon.
        await page.locator('button').filter({ hasText: 'View' }).click();
        await page.locator('button').filter({ hasText: 'Edit interactions' }).click();

        // Select the source visual.
        const sourceBox = await source.boundingBox();
        if (!sourceBox) throw new Error('Source visual has no bounding box.');
        await page.mouse.click(sourceBox.x + 10, sourceBox.y + 10);

        // The floating Filter/Highlight/None bar should appear on the target.
        const highlight = target.getByRole('button', { name: 'highlight', exact: true });
        await expect(highlight).toBeVisible();

        // Clicking Highlight must register the interaction AND keep the source
        // selected (the click must not fall through to select the figure).
        await highlight.click();
        await expect(highlight).toHaveClass(/bg-brand/);
        await expect(target).not.toHaveClass(/outline-brand/);
    });
});
