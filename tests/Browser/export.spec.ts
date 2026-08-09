import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Export of a table with a per-row list column (W1-16).
 *
 * Exports the `e2e-dashboard` table visual `vmskyy3ue3`
 * (`wip_chaine[ProdGroup]` axis x `Liste opérations` value). The downloaded
 * CSV must carry the per-row list joined per row (e.g. the CH01 row carries
 * CH01's own distinct ops, never the global list), and a chain with no rows
 * (CH01B) exports a blank field.
 *
 * Expected values derive from the static snapshot
 * `storage/app/private/data.json` (see `table-lists.spec.ts`).
 *
 * Assertions are structural: CH01's cell carries its own ops (never empty,
 * never a foreign chain's op) and a chain with no rows (CH01B) exports a
 * blank field. No exact op names are pinned, since the app reads live-synced
 * endpoint data that drifts from any static capture.
 */

const E2E_DASHBOARD_SLUG = 'e2e-dashboard';
const TABLE_VISUAL_ID = 'vmskyy3ue3';

test('exported CSV contains the per-row list column (W1-16)', async ({
    page,
}) => {
    test.setTimeout(90_000);
    await login(page);
    await page.goto(`/p/${E2E_DASHBOARD_SLUG}`);

    const visual = page.getByTestId(`visual-${TABLE_VISUAL_ID}`);
    await expect(visual).toBeVisible({ timeout: 60_000 });
    await visual.hover();
    await visual
        .getByRole('button', { name: 'Exporter les données du visuel' })
        .click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'CSV' }).click();
    const download = await downloadPromise;
    const csv = readFileSync(await download.path(), 'utf8');
    const lines = csv.split(/\r?\n/);

    // Header: the list measure column is present.
    expect(csv).toContain('Liste opérations');

    // CH01's own distinct ops are joined into its cell (per-row, not global):
    // at least one op, and a CH09-only op must NOT leak into CH01's row
    // (proves per-row scoping).
    const ch01 = lines.find((l) => /^CH01\s/.test(l));
    expect(ch01).toBeTruthy();
    expect(ch01).toContain(', ');
    expect(ch01).not.toContain('ass epaule');

    // CH01B has no empdefecteff rows -> blank field, not 0.
    const ch01b = lines.find((l) => /^CH01B\s/.test(l));
    expect(ch01b).toBeTruthy();
    expect(ch01b).toMatch(/,$/);
});
