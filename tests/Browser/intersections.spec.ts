import { test, expect, type Page } from '@playwright/test';
import { login } from '../../playwright.config';

/**
 * Intersection markers (W-x-analytics) land exactly on the rendered curves.
 *
 * Target: a throwaway probe cloned from `e2e-dashboard` (the builder API
 * pattern), where visual `vmskyy3ue3` is rewritten so all three series share
 * the `y0` value axis, draw as `line`, and carry an `intersections` analytic.
 * Because the crossings are detected along the same monotone spline recharts
 * renders for `type="monotone"`, each amber dot must sit within ~1 px of BOTH
 * of the crossing curves and share its abscissa with the dashed guide.
 *
 * The probe page is created via the API, never the user's e2e-dashboard, and
 * deleted afterwards (see the `listAgg` spec for the same pattern).
 */

const E2E_DASHBOARD_SLUG = 'e2e-dashboard';
const VISUAL_ID = 'vmskyy3ue3';
const PAGE4_ID = 'pmskyvxr01';
const PROBE_SLUG = 'e2e-intersections-probe';

async function csrf(page: Page): Promise<string> {
    return page.evaluate(() => {
        const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    });
}

async function apiHeaders(page: Page) {
    return {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': await csrf(page),
    };
}

function probeLayout(dashboard: { layout: unknown }) {
    const layout = structuredClone(dashboard.layout) as {
        pbi: { pages: unknown[] };
    };
    const pages = layout.pbi.pages as Array<{ id: string; visuals: unknown[] }>;
    const page4 = pages.find((p) => p.id === PAGE4_ID);
    const vis = (
        page4!.visuals as Array<{
            id: string;
            values: Array<Record<string, unknown>>;
            axes: unknown;
            analytics: unknown[];
        }>
    ).find((v) => v.id === VISUAL_ID);
    vis.values = vis.values.map((w) => ({
        ...w,
        axisId: 'y0',
        seriesType: 'line',
    }));
    vis.axes = undefined;
    vis.analytics = [{ kind: 'intersections', enabled: true }];
    return { layout, visId: VISUAL_ID };
}

/** Multi-axis probe: keeps every series on its OWN value axis with its own
 * scale (the layout that missed before the domain fix). `totalquantite` runs
 * ~0–14k on `y0` while `TempsPresence`/`minuteproduite` sit on their own
 * small domains, so a domain mismatch there shifts cross-axis crossings. */
function probeLayoutMultiAxis(dashboard: { layout: unknown }) {
    const layout = structuredClone(dashboard.layout) as {
        pbi: { pages: unknown[] };
    };
    const pages = layout.pbi.pages as Array<{ id: string; visuals: unknown[] }>;
    const page4 = pages.find((p) => p.id === PAGE4_ID);
    const vis = (
        page4!.visuals as Array<{
            id: string;
            values: Array<Record<string, unknown>>;
            axes: unknown;
            analytics: unknown[];
        }>
    ).find((v) => v.id === VISUAL_ID);
    if (!vis.axes) {
        throw new Error(
            `e2e-dashboard visual ${VISUAL_ID} no longer has value axes`,
        );
    }
    vis.values = vis.values.map((w) => ({ ...w, seriesType: 'line' }));
    vis.analytics = [{ kind: 'intersections', enabled: true }];
    return { layout, visId: VISUAL_ID };
}

async function ensureProbe(
    page: Page,
    layoutFor: (d: { layout: unknown }) => {
        layout: unknown;
        visId: string;
    } = probeLayout,
) {
    const list = await page.request.get('/api/builder-pages', {
        headers: await apiHeaders(page),
    });
    const listJson = await list.json();
    const arr = Array.isArray(listJson)
        ? listJson
        : (listJson.pages ?? listJson.data ?? []);
    for (const p of arr.filter(
        (x: { slug?: string }) => x?.slug === PROBE_SLUG,
    )) {
        await page.request
            .delete(`/api/builder-pages/${p.id}`, {
                headers: await apiHeaders(page),
            })
            .catch(() => {});
    }

    const dashboard = await page.request.get(
        `/api/builder-pages/${E2E_DASHBOARD_SLUG}`,
        { headers: await apiHeaders(page) },
    );
    expect(dashboard.ok()).toBeTruthy();
    const { layout } = layoutFor(await dashboard.json());

    const created = await page.request.post('/api/builder-pages', {
        data: { name: 'E2E intersections probe', slug: PROBE_SLUG },
        headers: await apiHeaders(page),
    });
    expect(created.ok()).toBeTruthy();
    const probePage = (await created.json()).page;
    const saved = await page.request.put(`/api/builder-pages/${probePage.id}`, {
        data: { layout },
        headers: await apiHeaders(page),
    });
    expect(saved.ok()).toBeTruthy();
    return probePage;
}

test.describe('intersection markers on the monotone spline', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test('dots and guides render for same-axis crossing series', async ({
        page,
    }) => {
        await login(page);
        const probePage = await ensureProbe(page);
        try {
            await page.goto(`/p/${probePage.slug}`);
            const vis = page.getByTestId(`visual-${VISUAL_ID}`);
            await vis.waitFor({ state: 'visible', timeout: 60_000 });
            await vis
                .locator('svg.recharts-surface')
                .first()
                .waitFor({ state: 'visible', timeout: 60_000 });
            await expect
                .poll(() => vis.locator('path.recharts-line-curve').count(), {
                    timeout: 15_000,
                })
                .toBeGreaterThanOrEqual(2);

            const dots = vis.locator('g.recharts-reference-dot');
            const guides = vis.locator('g.recharts-reference-line');
            await expect
                .poll(() => dots.count(), { timeout: 15_000 })
                .toBeGreaterThan(0);
            expect(await guides.count()).toBeGreaterThan(0);
            expect(await dots.count()).toBe(await guides.count());
        } finally {
            await page.request
                .delete(`/api/builder-pages/${probePage.id}`, {
                    headers: await apiHeaders(page),
                })
                .catch(() => {});
        }
    });

    test('every dot sits on both crossing curves and aligns with its guide', async ({
        page,
    }) => {
        await login(page);
        const probePage = await ensureProbe(page);
        try {
            await page.goto(`/p/${probePage.slug}`);
            const vis = page.getByTestId(`visual-${VISUAL_ID}`);
            await vis.waitFor({ state: 'visible', timeout: 60_000 });
            await vis
                .locator('svg.recharts-surface')
                .first()
                .waitFor({ state: 'visible', timeout: 60_000 });
            await expect
                .poll(() => vis.locator('g.recharts-reference-dot').count(), {
                    timeout: 15_000,
                })
                .toBeGreaterThan(0);

            const geometry = await vis.evaluate((el) => {
                const q = (sel: string) => [...el.querySelectorAll(sel)];
                const dots = q('g.recharts-reference-dot').map((g) => ({
                    cx: parseFloat(
                        g.querySelector('circle')!.getAttribute('cx')!,
                    ),
                    cy: parseFloat(
                        g.querySelector('circle')!.getAttribute('cy')!,
                    ),
                }));
                const curves = q('path.recharts-line-curve')
                    .map((p) => p.getAttribute('d')!)
                    .filter(Boolean);
                return { dots, curves };
            });

            expect(geometry.dots.length).toBeGreaterThan(0);
            expect(geometry.curves.length).toBeGreaterThanOrEqual(2);

            for (const dot of geometry.dots) {
                // Dot sits on the crossing of the two nearest curves, and the
                // dashed guide passes through its abscissa. The curves and
                // guides animate in on mount while the dots snap to their
                // final position, so poll until the SVG has settled.
                await expect
                    .poll(
                        () =>
                            vis.evaluate(
                                (el, [cx, cy]) => {
                                    /** Min px distance from (cx,cy) to a
                                     * sampled recharts monotone cubic path. */
                                    const distanceToCurve = (
                                        d: string,
                                        x: number,
                                        y: number,
                                    ): number => {
                                        const toks: (string | number)[] = (
                                            d.match(
                                                /[MLCSZ]|[-+]?\d*\.?\d+/g,
                                            ) ?? []
                                        ).map((t) =>
                                            /[MLCSZ]/.test(t)
                                                ? t
                                                : parseFloat(t),
                                        );
                                        let best = Infinity;
                                        let px = 0;
                                        let py = 0;
                                        let i = 0;
                                        while (i < toks.length) {
                                            const t = toks[i++];
                                            if (t === 'M') {
                                                px = toks[i++] as number;
                                                py = toks[i++] as number;
                                                best = Math.min(
                                                    best,
                                                    Math.hypot(px - x, py - y),
                                                );
                                            } else if (t === 'C') {
                                                const x1 = toks[i++] as number;
                                                const y1 = toks[i++] as number;
                                                const x2 = toks[i++] as number;
                                                const y2 = toks[i++] as number;
                                                const x3 = toks[i++] as number;
                                                const y3 = toks[i++] as number;
                                                for (let s = 0; s <= 200; s++) {
                                                    const u = s / 200;
                                                    const uu = 1 - u;
                                                    const nx =
                                                        uu * uu * uu * px +
                                                        3 * uu * uu * u * x1 +
                                                        3 * uu * u * u * x2 +
                                                        u * u * u * x3;
                                                    const ny =
                                                        uu * uu * uu * py +
                                                        3 * uu * uu * u * y1 +
                                                        3 * uu * u * u * y2 +
                                                        u * u * u * y3;
                                                    best = Math.min(
                                                        best,
                                                        Math.hypot(
                                                            nx - x,
                                                            ny - y,
                                                        ),
                                                    );
                                                }
                                                px = x3;
                                                py = y3;
                                            } else if (t === 'L') {
                                                px = toks[i++] as number;
                                                py = toks[i++] as number;
                                                best = Math.min(
                                                    best,
                                                    Math.hypot(px - x, py - y),
                                                );
                                            }
                                        }
                                        return best;
                                    };

                                    const q = (sel: string) => [
                                        ...el.querySelectorAll(sel),
                                    ];
                                    const curves = q('path.recharts-line-curve')
                                        .map((p) => p.getAttribute('d') ?? '')
                                        .filter(Boolean);
                                    const dists = curves
                                        .map((d) => distanceToCurve(d, cx, cy))
                                        .sort((a, b) => a - b);
                                    const onCurves =
                                        dists[0]! < 2 && dists[1]! < 2;
                                    const guideAligned = q(
                                        'g.recharts-reference-line',
                                    ).some((g) => {
                                        const line = g.querySelector('line');
                                        if (!line) return false;
                                        const x1 = parseFloat(
                                            line.getAttribute('x1')!,
                                        );
                                        return Math.abs(x1 - cx) < 0.5;
                                    });
                                    return onCurves && guideAligned;
                                },
                                [dot.cx, dot.cy] as const,
                            ),
                        { timeout: 15_000 },
                    )
                    .toBe(true);
            }
        } finally {
            await page.request
                .delete(`/api/builder-pages/${probePage.id}`, {
                    headers: await apiHeaders(page),
                })
                .catch(() => {});
        }
    });

    test('cross-axis guides land on the rendered crossings (multi-axis scales)', async ({
        page,
    }) => {
        await login(page);
        const probePage = await ensureProbe(page, probeLayoutMultiAxis);
        try {
            await page.goto(`/p/${probePage.slug}`);
            const vis = page.getByTestId(`visual-${VISUAL_ID}`);
            await vis.waitFor({ state: 'visible', timeout: 60_000 });
            await vis
                .locator('svg.recharts-surface')
                .first()
                .waitFor({ state: 'visible', timeout: 60_000 });
            await expect
                .poll(() => vis.locator('g.recharts-reference-line').count(), {
                    timeout: 15_000,
                })
                .toBeGreaterThan(0);

            // Compute every pixel-space crossing of the sampled rendered
            // curves, then confirm each dashed guide's abscissa matches one.
            // Curves animate in on mount while guides snap, so poll until the
            // SVG settles (mirrors the single-axis placement test).
            await expect
                .poll(
                    async () => {
                        const alignment = await vis.evaluate((el) => {
                            const q = (sel: string) => [
                                ...el.querySelectorAll(sel),
                            ];
                            const toPoints = (
                                d: string,
                            ): [number, number][] => {
                                const toks: (string | number)[] = (
                                    d.match(/[MLCSZ]|[-+]?\d*\.?\d+/g) ?? []
                                ).map((t) =>
                                    /[MLCSZ]/.test(t) ? t : parseFloat(t),
                                );
                                const pts: [number, number][] = [];
                                let px = 0;
                                let py = 0;
                                let i = 0;
                                while (i < toks.length) {
                                    const t = toks[i++];
                                    if (t === 'M') {
                                        px = toks[i++] as number;
                                        py = toks[i++] as number;
                                        pts.push([px, py]);
                                    } else if (t === 'C') {
                                        const x1 = toks[i++] as number;
                                        const y1 = toks[i++] as number;
                                        const x2 = toks[i++] as number;
                                        const y2 = toks[i++] as number;
                                        const x3 = toks[i++] as number;
                                        const y3 = toks[i++] as number;
                                        for (let s = 1; s <= 200; s++) {
                                            const u = s / 200;
                                            const uu = 1 - u;
                                            pts.push([
                                                uu * uu * uu * px +
                                                    3 * uu * uu * u * x1 +
                                                    3 * uu * u * u * x2 +
                                                    u * u * u * x3,
                                                uu * uu * uu * py +
                                                    3 * uu * uu * u * y1 +
                                                    3 * uu * u * u * y2 +
                                                    u * u * u * y3,
                                            ]);
                                        }
                                        px = x3;
                                        py = y3;
                                    } else if (t === 'L') {
                                        px = toks[i++] as number;
                                        py = toks[i++] as number;
                                        pts.push([px, py]);
                                    }
                                }
                                return pts;
                            };
                            const segCrossX = (
                                a: [number, number],
                                b: [number, number],
                                c: [number, number],
                                d: [number, number],
                            ): number | null => {
                                const r1x = b[0] - a[0];
                                const r1y = b[1] - a[1];
                                const r2x = d[0] - c[0];
                                const r2y = d[1] - c[1];
                                const denom = r1x * r2y - r1y * r2x;
                                if (Math.abs(denom) < 1e-9) return null;
                                const t =
                                    ((c[0] - a[0]) * r2y -
                                        (c[1] - a[1]) * r2x) /
                                    denom;
                                const u =
                                    ((c[0] - a[0]) * r1y -
                                        (c[1] - a[1]) * r1x) /
                                    denom;
                                if (
                                    t < -1e-6 ||
                                    t > 1 + 1e-6 ||
                                    u < -1e-6 ||
                                    u > 1 + 1e-6
                                )
                                    return null;
                                return a[0] + t * r1x;
                            };

                            const polylines = q('path.recharts-line-curve')
                                .map((p) => p.getAttribute('d')!)
                                .filter(Boolean)
                                .map(toPoints);
                            const crossings: number[] = [];
                            for (let i = 0; i < polylines.length; i++)
                                for (let j = i + 1; j < polylines.length; j++) {
                                    const A = polylines[i]!;
                                    const B = polylines[j]!;
                                    for (
                                        let s = 0;
                                        s + 1 < A.length && s + 1 < B.length;
                                        s++
                                    ) {
                                        const x = segCrossX(
                                            A[s]!,
                                            A[s + 1]!,
                                            B[s]!,
                                            B[s + 1]!,
                                        );
                                        if (x !== null) crossings.push(x);
                                    }
                                }
                            crossings.sort((a, b) => a - b);

                            const guideXs: number[] = [];
                            for (const g of q('g.recharts-reference-line')) {
                                const line = g.querySelector('line');
                                if (!line) continue;
                                const x1 = parseFloat(line.getAttribute('x1')!);
                                const x2 = parseFloat(line.getAttribute('x2')!);
                                if (Math.abs(x1 - x2) < 0.5) guideXs.push(x1);
                            }
                            guideXs.sort((a, b) => a - b);
                            const nearestOf = (gx: number) =>
                                crossings.reduce((best, cx) =>
                                    Math.abs(cx - gx) < Math.abs(best - gx)
                                        ? cx
                                        : best,
                                );
                            return {
                                n: crossings.length,
                                g: guideXs.length,
                                maxOff: guideXs.reduce(
                                    (m, gx) =>
                                        Math.max(
                                            m,
                                            Math.abs(nearestOf(gx) - gx),
                                        ),
                                    0,
                                ),
                            };
                        });
                        return (
                            alignment.n > 0 &&
                            alignment.g === alignment.n &&
                            alignment.maxOff < 2
                        );
                    },
                    { timeout: 15_000 },
                )
                .toBe(true);
        } finally {
            await page.request
                .delete(`/api/builder-pages/${probePage.id}`, {
                    headers: await apiHeaders(page),
                })
                .catch(() => {});
        }
    });
});
