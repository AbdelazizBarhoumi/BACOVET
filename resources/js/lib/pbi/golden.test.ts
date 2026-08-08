// Acceptance suite generated from the GOLDEN ORACLE — see docs/measure-assistant-cases.md.
//
// The oracle (scripts/golden/oracle.cjs) reads the real Novacity snapshot
// (data.json), slices deterministic tables exactly like the frontend, and
// computes expected values with plain JS *without* the measure engine. This
// suite then evaluates the real measure engine against those expected values.
//
// Run:
//   npm run goldens:refresh                          # regenerate golden.json after a sync
//   npx vitest run golden.test.ts                    # core scenarios (always green)
//
// Wave additions: when a wave lands, add its engine-level assertions below
// (they must pass). See the checklist in docs/measure-assistant-cases.md.
//
// Hardness contract (docs/measure-assistant-cases.md, chapter 0): exact
// numeric equality (1e-9), exact sorted lists, loud errors for garbage, zero
// silent results, deterministic repeated evaluation.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyTableRows, filterTableRows, type ReportFilter } from './filters';
import {
    compileListMeasure,
    evaluateMeasure,
    setTables,
    type Field,
    type Row,
    type TableDef,
} from './model';

const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9;

interface GoldenTable {
    name: string;
    fields: Field[];
    rows: Row[];
}
interface GoldenFile {
    source_signature: string;
    tables: GoldenTable[];
    scenarios: Record<string, string | number>;
}

const payload = JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'tests/golden/golden.json'), 'utf8'),
) as GoldenFile;
const scen = (k: string): number => Number(payload.scenarios[k] ?? 0);

const tables: TableDef[] = payload.tables.map((t) => ({
    name: t.name,
    fields: t.fields,
    rows: t.rows,
}));

describe('golden core (data.json oracle — must pass at every wave)', () => {
    beforeEach(() => setTables(tables.map((t) => ({ ...t }))));

    it('itemtrx row count equals the oracle', () => {
        const r = evaluateMeasure('M = COUNTROWS(itemtrx)', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(scen('itemtrx_row_count'));
    });

    it('itemtrx SUM(Quantity) equals the oracle', () => {
        const r = evaluateMeasure('M = SUM(itemtrx[Quantity])', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(scen('itemtrx_sum_quantity'));
    });

    it('itemtrx DISTINCTCOUNT(EmployeeName) equals the oracle', () => {
        const r = evaluateMeasure('M = DISTINCTCOUNT(itemtrx[EmployeeName])', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(scen('itemtrx_distinct_emp'));
    });

    it('itemtrx DISTINCTCOUNT(ProdGroup) equals the oracle', () => {
        const r = evaluateMeasure('M = DISTINCTCOUNT(itemtrx[ProdGroup])', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(scen('itemtrx_distinct_prodgroup'));
    });

    it('YTD ratio KPI (rejets/inspections × 100) equals the oracle', () => {
        const numerator = payload.scenarios['kpi_rejets_annee.BundleRejectYear'];
        const denominator =
            payload.scenarios['kpi_inspections_annee.BundleInspectedYear'];
        expect(scen('kpi_annee_ratio_numerator')).toBe(numerator);
        expect(scen('kpi_annee_ratio_denominator')).toBe(denominator);

        const r = evaluateMeasure(
            'M = DIVIDE(SUM(kpi_rejets_annee[BundleRejectYear]), SUM(kpi_inspections_annee[BundleInspectedYear]), 0) * 100',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(near(r.value, scen('kpi_annee_ratio_div'))).toBe(true);
    });

    it('DIVIDE default: zero denominator returns the fallback (not 0-ambiguous)', () => {
        const r = evaluateMeasure(
            'M = DIVIDE(SUM(kpi_rejets_annee[BundleRejectYear]), 0, 7)',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(7);
    });

    it('pareto: SUM(nb_defauts) equals the oracle; stored part_pct is 2-decimal-rounded', () => {
        const r = evaluateMeasure('M = SUM(kpi_pareto_defects[nb_defauts])', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(scen('pareto_total_defauts'));
        // The feeder ships part_pct rounded to 2 decimals; the oracle records
        // the max deviation from nb/total*100. Assert it is within that
        // rounding precision — the engine must source shares from nb_defauts,
        // never trust the rounded stored column for exact math.
        expect(scen('pareto_part_pct_max_delta')).toBeLessThanOrEqual(0.01);
    });

    it('hardness: unknown column and unknown function fail loudly (no silent 0)', () => {
        expect(evaluateMeasure('M = SUM(itemtrx[Gone])', []).error).toBeTruthy();
        expect(
            evaluateMeasure('M = NOT_A_FN(itemtrx[Quantity])', []).error,
        ).toBeTruthy();
    });

    it('hardness: repeated evaluation is deterministic (same input, same output)', () => {
        const a = evaluateMeasure('M = SUM(itemtrx[Quantity])', []);
        const b = evaluateMeasure('M = SUM(itemtrx[Quantity])', []);
        expect(a.value).toBe(b.value);
    });

    it('per-employee ctx: each employee subset sees exactly their own list (wave-1 engine contract)', () => {
        const expected = payload.scenarios['itemtrx_by_emp'] as unknown as Record<
            string,
            { count: number; sumQty: number; items: string[] }
        >;
        const listImpl = compileListMeasure('M = VALUES(itemtrx[ItemNo])');
        expect(listImpl).not.toBeNull();

        for (const [emp, exp] of Object.entries(expected)) {
            const filter: ReportFilter = {
                column: 'EmployeeName',
                table: 'itemtrx',
                values: [emp],
                scope: 'report',
                type: 'list',
            };
            const ctx = {
                tables: applyTableRows(tables, filterTableRows(tables, [filter])),
            };
            const got = (listImpl!([], ctx) as string[]).map((v) =>
                String(v).trim(),
            );
            expect(got).toEqual([...exp.items]);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// WAVE WORKSPACE (add each of these when its wave lands — then it must pass)
//
// Wave 1 — wizard-level authoring:
//   it('W1-05 wizard emits "Me = DIVIDE([A],[B]) * 100" for column÷column×100')
//   it('W1-06 operands accept an existing [Measure] reference')
//   it('W1-07 preview shows a live value for the composed measure')
//   it('W1-09 deriveMeasureSpec round-trips the composite back into the spec')
//   it('W1-12 table visual shows per-employee list chips (Playwright smoke)')
//   it('W1-17/18 "%" verbatim is never emitted as modulo; DIVIDE default used')
// Wave 2 — IN/NOT IN multi-value conditions, real time windows:
//   it('DATESYTD/TOTALYTD over a date column matches the oracle')
//   it('multi-value IN condition filters the oracle-per-group counts')
// Wave 3 — advanced:
//   it('CALCULATE(expr, ALL(foo)) restores the oracle total (share)')
//   it('RANK / running total / CONCATENATEX match oracle sequences')
// ─────────────────────────────────────────────────────────────────────────────