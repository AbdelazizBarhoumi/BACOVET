import { test, expect } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Wizard smoke. Current scope (M0): the app shell behind the measure wizard is
 * reachable after login — builder home lists pages, a builder page opens, and
 * the Ribbon → "Nouvelle mesure" → "Assistant" entry opens the wizard dialog.
 *
 * Wave 1 (W1-05…W1-10) fills this in with the Composition step (operands,
 * operator ×100 toggle, live preview, composite round-trip).
 */
test('builder home lists report pages after login', async ({ page }) => {
    await login(page);
    await expect(
        page.getByRole('heading', { name: 'Constructeur de pages' }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
        page.getByRole('button', { name: 'Nouvelle page' }).first(),
    ).toBeVisible();
});

test('measure wizard opens from a builder page', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);
    await page.goto('/p/e2e-dashboard');

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
    await page.getByRole('button', { name: 'Assistant' }).click();

    await expect(page.getByText('Assistant de mesure')).toBeVisible();
    await expect(page.getByText('Que voulez-vous créer ?')).toBeVisible();
    await expect(
        page.getByRole('button', { name: /Valeur d’une table/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: "Fermer l'assistant" }).click();
    await expect(page.getByText('Assistant de mesure')).toHaveCount(0);
});