import { test, expect } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Table / matrix per-row list rendering (W1-12, W1-13, W1-14, W1-15).
 *
 * M0: scaffolding only. The scenario below is implemented in Wave 1 when the
 * engine `buildTableCells` per-row context + the chips UI are wired: expected
 * behaviour (from `docs/measure-assistant-cases.md §2.3`):
 *   - an axis that groups by employee + the list measure as a value shows, per
 *     employee row, that employee's distinct values (not the global list);
 *   - an employee with no rows renders `—`, never 0;
 *   - `listAgg` (count / first / latest / nth / numeric) changes the cell
 *     treatment.
 */
test.skip('table shows per-row list chips (W1-12/14/15)', async ({ page }) => {
    await login(page);

    const axis = page.getByTestId('table-cell-value');
    await expect(axis.first()).toBeVisible({ timeout: 20_000 });

    // Will assert, per employee row, the exact distinct chips set and the
    // `—` empty state once Wave 1 lands.
    throw new Error('Wave 1: replace this scaffolding assertion with per-row checks');
});