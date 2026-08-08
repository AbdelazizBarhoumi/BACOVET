import { test } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Export of a visual / table with a per-row list column (W1-16).
 *
 * M0: scaffolding only. Wave 1 implements `exportData.ts` list-column
 * serialisation; the browser scenario then asserts a downloaded CSV shows the
 * list column as joined per-row text (e.g. `B1, B2`) and an empty list cell as
 * an empty field.
 */
test.skip('exported CSV contains the per-row list column (W1-16)', async ({
    page,
}) => {
    await login(page);
    // Wave 1: build/set the table with the list column, click the visual
    // export entry (`aria-label="Exporter les données du visuel"`) and assert
    // the downloaded rows.
    throw new Error('Wave 1: replace this scaffolding with the CSV assertion');
});