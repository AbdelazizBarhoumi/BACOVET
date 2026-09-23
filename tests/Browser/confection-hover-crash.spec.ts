import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Confection white-screen guard (React error #185).
 *
 * The heavy `/p/confection` report (notably « Efficience par opérateur » and
 * the Pareto visuals with hover tooltip popups) intermittently collapses to a
 * blank page with `Minified React error #185` (Maximum update depth exceeded).
 * The stack points at the Canvas chunk (`pageTabs-*.js` → recharts
 * `notify/nofityNestedSubs`): every mounted `CustomTooltip`
 * (`VisualView/shared.tsx`) writes `setTooltipHover` while subscribed to it,
 * and `TooltipPagePopup` (`Canvas/tooltip.tsx`) re-renders nested visuals on
 * each mousemove — so fast hovers across charts can ping-pong the store until
 * React unmounts the tree.
 *
 * Coverage (logged-in view, mirrors `composition-ui` / `intersections`):
 *  - live `/p/confection`: load stability, single-hover popup correctness,
 *    rapid sweep, cross-visual ping-pong, 65s soak (covers the 50s dataset
 *    polling + focus refetch in `[slug].tsx`).
 *  - API-cloned probe (`e2e-confection-probe-*`, full-layout clone so
 *    tooltipPageId / measures stay intact): same sweep + perf budgets, then
 *    deleted. Falls back to `e2e-dashboard` when `confection` is absent.
 *
 * Every test fails loudly on React #185 or a white screen instead of timing
 * out ambiguously.
 */

const CONFECTION_SLUG = 'confection';
const FALLBACK_SLUG = 'e2e-dashboard';
const PROBE_PREFIX = 'e2e-confection-probe-';
const REACT185 = /Minified React error #185|Maximum update depth/;

type Box = { x: number; y: number; width: number; height: number };

async function csrf(page: Page): Promise<string> {
    return page.evaluate(() => {
        const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    });
}

async function apiHeaders(page: Page): Promise<Record<string, string>> {
    return {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': await csrf(page),
    };
}

/** Collects pageerrors + React #185 console errors for the current test. */
function watchCrashes(page: Page): { errors: string[] } {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
        errors.push(String((err as Error)?.message ?? err));
    });
    page.on('console', (msg) => {
        if (msg.type() === 'error' && REACT185.test(msg.text())) {
            errors.push(msg.text());
        }
    });
    return { errors };
}

function expectNoReact185(errors: string[]) {
    expect(
        errors.filter((e) => REACT185.test(e)),
        `React #185 crashed the page: ${errors.filter((e) => REACT185.test(e)).join(' | ').slice(0, 500)}`,
    ).toEqual([]);
}

/** The app shell must hold rendered visuals — a white page fails here. */
async function expectAppAlive(page: Page) {
    await expect(page.locator('#app')).toBeVisible({ timeout: 30_000 });
    await expect
        .poll(() => page.locator('[data-testid^="visual-"]').count(), {
            timeout: 60_000,
        })
        .toBeGreaterThan(0);
    const html = (await page.locator('#app').innerHTML()) ?? '';
    expect(html.trim().length).toBeGreaterThan(100);
}

async function openReport(
    page: Page,
    slug: string,
): Promise<{ loadMs: number }> {
    const started = Date.now();
    await page.goto(`/p/${slug}`, { waitUntil: 'domcontentloaded' });
    await page
        .locator('[data-testid^="visual-"]')
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 });
    await expectAppAlive(page);
    return { loadMs: Date.now() - started };
}

/** Bounding boxes of visuals that actually render a recharts surface. */
async function chartBoxes(page: Page): Promise<{ id: string; box: Box }[]> {
    const visuals = page.locator('[data-testid^="visual-"]');
    const count = await visuals.count();
    const out: { id: string; box: Box }[] = [];
    for (let i = 0; i < count; i++) {
        const vis = visuals.nth(i);
        if ((await vis.locator('svg.recharts-surface').count()) === 0) continue;
        const box = await vis
            .locator('svg.recharts-surface')
            .first()
            .boundingBox();
        if (!box || box.width < 50 || box.height < 50) continue;
        const testId =
            (await vis.getAttribute('data-testid')) ?? `visual-index-${i}`;
        out.push({ id: testId, box });
    }
    return out;
}

/**
 * Prefers the two reported heavy visuals (« Efficience par opérateur »,
 * Pareto) then falls back to the first chart visuals so the suite survives
 * title renames.
 */
async function resolveTargets(page: Page): Promise<{ id: string; box: Box }[]> {
    const named: { id: string; box: Box }[] = [];
    for (const name of ['Efficience par opérateur', 'Pareto']) {
        const vis = page
            .locator('[data-testid^="visual-"]', { hasText: name })
            .first();
        if ((await vis.count()) === 0) continue;
        if ((await vis.locator('svg.recharts-surface').count()) === 0) continue;
        const box = await vis
            .locator('svg.recharts-surface')
            .first()
            .boundingBox();
        if (!box || box.width < 50 || box.height < 50) continue;
        named.push({
            id: (await vis.getAttribute('data-testid')) ?? name,
            box,
        });
        if (named.length === 2) return named;
    }
    if (named.length > 0) {
        const rest = (await chartBoxes(page)).filter(
            (c) => !named.some((n) => n.id === c.id),
        );
        return [...named, ...rest].slice(0, 2);
    }
    return (await chartBoxes(page)).slice(0, 2);
}

async function hoverPoint(page: Page, box: Box, fx: number, fy: number) {
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, {
        steps: 4,
    });
}

/** Fast back-and-forth sweep inside one chart — the "move so fast" repro. */
async function sweepVisual(page: Page, box: Box, passes = 40) {
    const boxNow =
        (await page
            .locator('svg.recharts-surface')
            .first()
            .boundingBox()) ?? box;
    void boxNow;
    for (let i = 0; i < passes; i++) {
        const fx = 0.15 + (0.7 * (i % 10)) / 9;
        const fy = 0.3 + (0.4 * ((i >> 1) % 2));
        await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, {
            steps: 2,
        });
    }
}

/** Alternate between two charts as fast as possible (hover ping-pong). */
async function pingPong(
    page: Page,
    a: Box,
    b: Box,
    rounds = 24,
) {
    for (let i = 0; i < rounds; i++) {
        const target = i % 2 === 0 ? a : b;
        await page.mouse.move(
            target.x + target.width * (0.3 + 0.1 * (i % 4)),
            target.y + target.height * 0.45,
            { steps: 1 },
        );
    }
}

type LayoutDoc = { layout?: unknown; page?: { layout?: unknown } };

async function fetchLayout(page: Page, slug: string): Promise<unknown | null> {
    const res = await page.request.get(`/api/builder-pages/${slug}`, {
        headers: await apiHeaders(page),
    });
    if (!res.ok()) return null;
    const json = (await res.json()) as LayoutDoc;
    return json.layout ?? json.page?.layout ?? null;
}

/**
 * Full-layout clone of confection (tooltip pages + measures stay intact).
 * Falls back to `e2e-dashboard` so CI stays green when confection is absent.
 */
async function ensureProbe(
    page: Page,
): Promise<{ id: number; slug: string; source: string }> {
    const list = await page.request.get('/api/builder-pages', {
        headers: await apiHeaders(page),
    });
    if (list.ok()) {
        const json = (await list.json()) as {
            pages?: { id: number; slug?: string }[];
            data?: { id: number; slug?: string }[];
        };
        const arr = Array.isArray(json)
            ? (json as unknown as { id: number; slug?: string }[])
            : (json.pages ?? json.data ?? []);
        for (const p of arr.filter((x) => x?.slug?.startsWith(PROBE_PREFIX))) {
            await page.request
                .delete(`/api/builder-pages/${p.id}`, {
                    headers: await apiHeaders(page),
                })
                .catch(() => {});
        }
    }

    let source = CONFECTION_SLUG;
    let layout = await fetchLayout(page, CONFECTION_SLUG);
    if (!layout) {
        source = FALLBACK_SLUG;
        layout = await fetchLayout(page, FALLBACK_SLUG);
    }
    expect(
        layout,
        `neither /api/builder-pages/${CONFECTION_SLUG} nor ${FALLBACK_SLUG} is reachable`,
    ).toBeTruthy();

    const slug = `${PROBE_PREFIX}${Date.now().toString(36)}`;
    const created = await page.request.post('/api/builder-pages', {
        data: { name: 'E2E confection probe', slug },
        headers: await apiHeaders(page),
    });
    expect(created.ok()).toBeTruthy();
    const probePage = ((await created.json()) as {
        page: { id: number; slug: string };
    }).page;
    const saved = await page.request.put(
        `/api/builder-pages/${probePage.id}`,
        { data: { layout }, headers: await apiHeaders(page) },
    );
    expect(saved.ok()).toBeTruthy();
    return { id: probePage.id, slug: probePage.slug, source };
}

async function deleteProbe(page: Page, id: number) {
    await page.request
        .delete(`/api/builder-pages/${id}`, {
            headers: await apiHeaders(page),
        })
        .catch(() => {});
}

test.describe('confection hover crash guard (React #185)', () => {
    test.describe.configure({ mode: 'serial', timeout: 180_000 });

    test('live confection loads without React #185 or white screen', async ({
        page,
    }) => {
        test.setTimeout(120_000);
        const { errors } = watchCrashes(page);
        await login(page);
        const { loadMs } = await openReport(page, CONFECTION_SLUG);
        expect(loadMs).toBeLessThan(60_000);
        await expectAppAlive(page);
        expectNoReact185(errors);
    });

    test('live single hover shows a tooltip and clears without crashing', async ({
        page,
    }) => {
        test.setTimeout(120_000);
        const { errors } = watchCrashes(page);
        await login(page);
        await openReport(page, CONFECTION_SLUG);

        const targets = await resolveTargets(page);
        expect(targets.length).toBeGreaterThan(0);
        const first = targets[0]!;

        await hoverPoint(page, first.box, 0.5, 0.45);
        const tooltip = page.locator('.recharts-tooltip-wrapper').first();
        await expect
            .poll(() => tooltip.count(), { timeout: 15_000 })
            .toBeGreaterThan(0);

        // Leaving the chart must clear the hover popup, never crash the tree.
        await page.mouse.move(5, 5, { steps: 3 });
        await page.waitForTimeout(500);
        await expectAppAlive(page);
        expectNoReact185(errors);
    });

    test('live rapid sweep across heavy charts does not white-screen', async ({
        page,
    }) => {
        test.setTimeout(150_000);
        const { errors } = watchCrashes(page);
        await login(page);
        await openReport(page, CONFECTION_SLUG);

        const targets = await resolveTargets(page);
        expect(targets.length).toBeGreaterThan(0);
        for (const t of targets) {
            await sweepVisual(page, t.box, 40);
            await expectAppAlive(page);
        }
        // Settle: pending tooltip effects flush without unmounting the app.
        await page.waitForTimeout(1_000);
        await expectAppAlive(page);
        expectNoReact185(errors);
    });

    test('live cross-visual ping-pong does not trip Maximum update depth', async ({
        page,
    }) => {
        test.setTimeout(150_000);
        const { errors } = watchCrashes(page);
        await login(page);
        await openReport(page, CONFECTION_SLUG);

        const targets = await resolveTargets(page);
        if (targets.length < 2) {
            // Single-chart report: heavier sweep on the one chart instead.
            await sweepVisual(page, targets[0]!.box, 80);
        } else {
            await pingPong(page, targets[0]!.box, targets[1]!.box, 24);
        }
        await page.waitForTimeout(1_000);
        await expectAppAlive(page);
        expectNoReact185(errors);
    });

    test('live report survives the 50s dataset poll + focus refetch', async ({
        page,
    }) => {
        test.setTimeout(150_000);
        const { errors } = watchCrashes(page);
        await login(page);
        await openReport(page, CONFECTION_SLUG);

        // `[slug].tsx` refetches on a 50s interval and on window focus.
        await page.waitForTimeout(65_000);
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await page.waitForTimeout(3_000);
        await expectAppAlive(page);
        expectNoReact185(errors);
    });

    test('probe clone sweep meets perf budgets without crashing', async ({
        page,
    }) => {
        test.setTimeout(150_000);
        const { errors } = watchCrashes(page);
        await login(page);
        const probe = await ensureProbe(page);
        try {
            const { loadMs } = await openReport(page, probe.slug);
            expect(loadMs).toBeLessThan(60_000);

            const targets = await resolveTargets(page);
            expect(targets.length).toBeGreaterThan(0);

            // Hover → tooltip latency budget on the isolated clone.
            const hoverStart = Date.now();
            await hoverPoint(page, targets[0]!.box, 0.5, 0.45);
            await expect
                .poll(() => page.locator('.recharts-tooltip-wrapper').count(), {
                    timeout: 15_000,
                })
                .toBeGreaterThan(0);
            expect(Date.now() - hoverStart).toBeLessThan(5_000);

            if (targets.length < 2) {
                await sweepVisual(page, targets[0]!.box, 60);
            } else {
                await pingPong(page, targets[0]!.box, targets[1]!.box, 24);
            }
            await page.waitForTimeout(1_000);
            await expectAppAlive(page);
            expectNoReact185(errors);
        } finally {
            await deleteProbe(page, probe.id);
        }
    });
});
