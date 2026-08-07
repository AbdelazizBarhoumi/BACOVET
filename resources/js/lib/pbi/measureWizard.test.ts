import { describe, expect, it } from 'vitest';
import {
    buildMeasureDax,
    deriveMeasureSpec,
    isReliableHop,
    isReliablePath,
    joinCandidates,
    measureExpression,
    proposePath,
    proposePaths,
    type WizardSpec,
} from './measureWizard';
import {
    compileListMeasure,
    compileMeasure,
    setTables,
    type TableDef,
} from './model';

const pad = (s: string, n: number) => s.padEnd(n, ' ');

const taging: TableDef = {
    name: 'taging_reel',
    fields: [
        { table: 'taging_reel', name: 'MONo', type: 'text' },
        { table: 'taging_reel', name: 'ProdGroup', type: 'text' },
        { table: 'taging_reel', name: 'Qty', type: 'number' },
    ],
    rows: [
        { MONo: pad('4524091437', 15), ProdGroup: pad('CH10', 40), Qty: 4 },
        { MONo: pad('4524093564', 15), ProdGroup: pad('CH10', 40), Qty: 2 },
        { MONo: pad('1140342334', 15), ProdGroup: pad('DEP-J', 40), Qty: 0 },
        {
            MONo: pad('5520093123', 15),
            ProdGroup: pad('Departage', 40),
            Qty: 1,
        },
    ],
};

const codestyle: TableDef = {
    name: 'codestyle',
    fields: [
        { table: 'codestyle', name: 'SONo', type: 'text' },
        { table: 'codestyle', name: 'StyleCode', type: 'text' },
    ],
    rows: [
        { SONo: '4524091437', StyleCode: '311837' },
        { SONo: '4524093564', StyleCode: '311837' },
        { SONo: '4524153967', StyleCode: '340497' },
        { SONo: '4524154323', StyleCode: '340497' },
        { SONo: '4524287160', StyleCode: '340497' },
        { SONo: '4524736457', StyleCode: '348049' },
        { SONo: '4524757987', StyleCode: '302806' },
        { SONo: '4524757991', StyleCode: '302806' },
    ],
};

function styleLinkSpec(overlapShift = 0) {
    return {
        from: 'taging_reel',
        to: 'codestyle',
        hops: [
            {
                from: 'taging_reel',
                to: 'codestyle',
                fromCol: 'MONo',
                toCol: 'SONo',
                kind: 'fk_pk' as const,
                overlap: 0.36 + overlapShift,
                confidence: 0.45,
            },
        ],
    };
}

describe('joinCandidates', () => {
    it('surfaces the missed MONo↔SONo link despite sub-threshold overlap', () => {
        const cand = joinCandidates(taging, codestyle);
        const mono = cand.find((c) => c.aCol === 'MONo' && c.bCol === 'SONo');
        expect(mono).toBeDefined();
        expect(mono!.overlap).toBeLessThan(0.85); // graph would have ignored it
        expect(mono!.overlap).toBeGreaterThanOrEqual(0.2);
    });

    it('keeps differently-named columns when the overlap is strong', () => {
        const cand = joinCandidates(taging, codestyle);
        expect(cand.some((c) => c.kind === 'fk_pk')).toBe(true);
    });

    it('never proposes numeric/quantity columns as join keys', () => {
        const qtyTable: TableDef = {
            name: 'qty_source',
            fields: [
                { table: 'qty_source', name: 'OrderQty', type: 'number' },
                { table: 'qty_source', name: 'Qty', type: 'text' },
                { table: 'qty_source', name: 'Ctn', type: 'number' },
                { table: 'qty_source', name: 'MONo', type: 'text' },
            ],
            rows: [
                { OrderQty: 100, Qty: '100', Ctn: 3, MONo: '4524091437' },
                { OrderQty: 200, Qty: '200', Ctn: 4, MONo: '4524093564' },
                { OrderQty: 300, Qty: '300', Ctn: 5, MONo: '4524153967' },
                { OrderQty: 400, Qty: '400', Ctn: 6, MONo: '4524287160' },
            ],
        };
        const cand = joinCandidates(taging, qtyTable);
        expect(
            cand.every((c) => c.aCol !== 'Qty' && c.aCol !== 'OrderQty'),
        ).toBe(true);
        expect(cand.some((c) => c.aCol === 'MONo')).toBe(true);
    });

    it('demotes a shared NAME without shared values below a real link', () => {
        const emp = {
            ...taging,
            name: 'EmpDefectEff',
            rows: [
                { MONo: '4519082833', ProdGroup: 'CH01', Qty: 1 },
                { MONo: '4519082844', ProdGroup: 'CH02', Qty: 1 },
                { MONo: '4519082845', ProdGroup: 'CH03', Qty: 1 },
            ],
        };
        const codWithMon: TableDef = {
            name: 'codestyle',
            fields: [
                { table: 'codestyle', name: 'SONo', type: 'text' },
                { table: 'codestyle', name: 'MONo', type: 'text' },
                { table: 'codestyle', name: 'StyleCode', type: 'text' },
            ],
            rows: codestyle.rows.map((r) => ({
                SONo: r.SONo,
                StyleCode: r.StyleCode,
                MONo: r.SONo, // codestyle keeps SONo and MONo identical
            })),
        };

        // EmpDefectEff carries a column literally called MONo but stores a
        // different numbering (451908…) — a name trap with 0 shared values.
        const empCand = joinCandidates(emp, codWithMon);
        const fake = empCand.find(
            (c) => c.aCol === 'MONo' && c.bCol === 'MONo',
        );
        expect(fake).toBeDefined();
        expect(fake!.verified).toBe(false);
        expect(fake!.confidence).toBeLessThan(0.1);

        // The genuine bridge uses OrderNo (OF_No) values that really occur in
        // codestyle.SONo — it must outrank the demoted name-only candidate.
        const etat: TableDef = {
            name: 'etat_avancement',
            fields: [
                { table: 'etat_avancement', name: 'OF_No', type: 'text' },
                { table: 'etat_avancement', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                { OF_No: '4524091437', ProdGroup: 'CH99' },
                { OF_No: '4524093564', ProdGroup: 'CH99' },
                { OF_No: '9999999999', ProdGroup: 'CH99' },
            ],
        };
        const realCand = joinCandidates(etat, codWithMon);
        const real = realCand.find(
            (c) => c.aCol === 'OF_No' && c.bCol === 'SONo',
        );
        expect(real).toBeDefined();
        expect(real!.confidence).toBeGreaterThan(fake!.confidence);
    });
});

describe('proposePath', () => {
    it('finds the hop taging_reel → codestyle through MONo/SONo', () => {
        const path = proposePath(
            [taging, codestyle],
            'taging_reel',
            'codestyle',
        );
        expect(path.blocked).toBeNull();
        expect(path.hops).toHaveLength(1);
        expect(path.hops[0]!.from).toBe('taging_reel');
        expect(path.hops[0]!.to).toBe('codestyle');
        expect(path.hops[0]!.fromCol).toBe('MONo');
        expect(path.hops[0]!.toCol).toBe('SONo');
    });

    it('reports an impossible target with a French reason', () => {
        const other: TableDef = {
            name: 'orphan',
            fields: [{ table: 'orphan', name: 'X', type: 'text' }],
            rows: [{ X: 'unique-only' }],
        };
        const path = proposePath(
            [taging, codestyle, other],
            'taging_reel',
            'orphan',
        );
        expect(path.hops).toHaveLength(0);
        expect(path.blocked?.reason).toBe('Chemin introuvable');
    });

    it('returns empty hops when from === to', () => {
        const path = proposePath(
            [taging, codestyle],
            'taging_reel',
            'taging_reel',
        );
        expect(path.blocked).toBeNull();
        expect(path.hops).toHaveLength(0);
    });

    it('prefers a verified 2-hop route over a single weak fk_pk hop', () => {
        const a: TableDef = {
            name: 'A',
            fields: [
                { table: 'A', name: 'grp', type: 'text' },
                { table: 'A', name: 'SONo', type: 'text' },
            ],
            rows: [
                { grp: 'P1', SONo: 'S10' },
                { grp: 'P2', SONo: 'S11' },
                { grp: 'P3', SONo: 'S12' },
                { grp: 'P4', SONo: 'S12' },
            ],
        };
        const b: TableDef = {
            name: 'B',
            fields: [
                { table: 'B', name: 'grp', type: 'text' },
                { table: 'B', name: 'midNo', type: 'text' },
            ],
            rows: [
                { grp: 'P1', midNo: 'M1' },
                { grp: 'P2', midNo: 'M1' },
                { grp: 'P3', midNo: 'M2' },
                { grp: 'P4', midNo: 'M3' },
            ],
        };
        const c: TableDef = {
            name: 'C',
            fields: [
                { table: 'C', name: 'midNo', type: 'text' },
                { table: 'C', name: 'MONo', type: 'text' },
            ],
            rows: [
                { midNo: 'M1', MONo: 'MON-1' },
                { midNo: 'M2', MONo: 'MON-2' },
                { midNo: 'M3', MONo: 'MON-2' },
                { midNo: 'M4', MONo: 'MON-3' },
            ],
        };
        // direct A → C only shares SONo/MONo by 1/3 (~0.33), name-only:
        // the solver must choose the two cheap verified shared hops instead.
        const path = proposePath([a, b, c], 'A', 'C');
        expect(path.blocked).toBeNull();
        expect(path.hops).toHaveLength(2);
        expect(path.hops[0]!.from).toBe('A');
        expect(path.hops[0]!.to).toBe('B');
        expect(path.hops[1]!.to).toBe('C');
    });

    it('flags a name-only dead-end route as unreliable (not silently trusted)', () => {
        // EmpDefectEff.MONo name-collides with codestyle but shares no value
        // (451908… vs 45240…) — even if the only route exists on that column,
        // proposePath must surface it as unreliable.
        const emp: TableDef = {
            name: 'EmpDefectEff',
            fields: [{ table: 'EmpDefectEff', name: 'MONo', type: 'text' }],
            rows: [
                { MONo: '4519082833' },
                { MONo: '4519082844' },
                { MONo: '4519082845' },
            ],
        };
        const codWithMon: TableDef = {
            name: 'codestyle',
            fields: [
                { table: 'codestyle', name: 'SONo', type: 'text' },
                { table: 'codestyle', name: 'MONo', type: 'text' },
            ],
            rows: codestyle.rows.map((r) => ({
                SONo: r.SONo,
                MONo: r.SONo,
            })),
        };
        const path = proposePath(
            [emp, codWithMon],
            'EmpDefectEff',
            'codestyle',
        );
        expect(path.blocked).toBeNull();
        expect(path.hops.length).toBeGreaterThan(0);
        expect(path.hops.every((h) => h.verified === false)).toBe(true);
        expect(isReliablePath(path.hops)).toBe(false);
    });
});

describe('proposePaths', () => {
    it('returns up to the requested number of distinct alternatives', () => {
        const paths = proposePaths([taging, codestyle], 'taging_reel', 'codestyle');
        expect(paths.length).toBeGreaterThanOrEqual(1);
        expect(paths.length).toBeLessThanOrEqual(5);
        expect(paths.every((p) => p.blocked === null)).toBe(true);
    });

    it('orders shortest routes first by default and reliable routes when asked', () => {
        const mkShared = (name: string, col: string, vals: string[]): TableDef => ({
            name,
            fields: [{ table: name, name: col, type: 'text' }],
            rows: vals.map((v) => ({ [col]: v })),
        });
        // A → X → D: two verified shared-name hops.
        const a = mkShared('A', 'grp', ['P1', 'P2', 'P3', 'P4']);
        const x = mkShared('X', 'grp', ['P1', 'P2', 'P3', 'P4', 'P5']);
        const d = mkShared('D', 'grp', ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);

        const shortest = proposePaths([a, x, d], 'A', 'D', [], 5, 'shortest');
        expect(shortest[0]!.hops.length).toBe(1);

        const reliable = proposePaths([a, x, d], 'A', 'D', [], 5, 'reliable');
        // Both hops are verified, so 'reliable' prefers the 2-hop route
        // (more confirmed links) over the direct single hop.
        expect(reliable[0]!.blocked).toBeNull();
        expect(reliable[0]!.hops.length).toBe(2);
        expect(reliable[0]!.hops[0]!.to).toBe('X');
        expect(reliable[0]!.hops[1]!.to).toBe('D');
    });

    it('top-ranked alternative equals proposePath’s chosen hops', () => {
        const single = proposePaths([taging, codestyle], 'taging_reel', 'codestyle')[0]!;
        const best = proposePath([taging, codestyle], 'taging_reel', 'codestyle');
        expect(single.hops).toEqual(best.hops);
        expect(single.hops[0]!.from).toBe('taging_reel');
        expect(single.hops[0]!.to).toBe('codestyle');
    });

    it('surfaces all distinct routes when the graph has several', () => {
        const mk = (name: string): TableDef => ({
            name,
            fields: [{ table: name, name: 'id', type: 'text' }],
            rows: [{ id: '1' }, { id: '2' }, { id: '3' }],
        });
        const a = mk('A');
        const x = mk('X');
        const y = mk('Y');
        const d = mk('D');
        // A → D directly, and A → X → D, and A → Y → D: three distinct routes.
        const paths = proposePaths([a, x, y, d], 'A', 'D', [], 5);
        expect(paths.length).toBeGreaterThanOrEqual(3);
        expect(
            new Set(
                paths.map((p) =>
                    p.hops.map((h) => `${h.from}→${h.to}`).join('|'),
                ),
            ).size,
        ).toBe(paths.length);
    });

    it('blocks with the same message when no route exists', () => {
        const other: TableDef = {
            name: 'orphan',
            fields: [{ table: 'orphan', name: 'X', type: 'text' }],
            rows: [{ X: 'unique-only' }],
        };
        const paths = proposePaths([taging, codestyle, other], 'taging_reel', 'orphan');
        expect(paths).toHaveLength(1);
        expect(paths[0]!.blocked?.reason).toBe('Chemin introuvable');
    });
});

describe('isReliableHop / isReliablePath', () => {
    it('distinguishes a value-shared hop from a name-only hop', () => {
        // genuine order numbers → verified
        const ok: TableDef = {
            name: 'SrcNo',
            fields: [{ table: 'SrcNo', name: 'ONo', type: 'text' }],
            rows: [
                { ONo: '4524091437' },
                { ONo: '4524093564' },
                { ONo: '9999999999' },
            ],
        };
        const real = joinCandidates(ok, codestyle).find(
            (c) => c.aCol === 'ONo' && c.bCol === 'SONo',
        );
        expect(real).toBeDefined();
        expect(
            isReliableHop({
                from: real!.a,
                to: real!.b,
                fromCol: real!.aCol,
                toCol: real!.bCol,
                kind: real!.kind,
                overlap: real!.overlap,
                confidence: real!.confidence,
                verified: real!.verified,
            }),
        ).toBe(true);

        // name-only column that shares 0 values → unreliable
        const codWithMon: TableDef = {
            name: 'codestyle',
            fields: [
                { table: 'codestyle', name: 'SONo', type: 'text' },
                { table: 'codestyle', name: 'MONo', type: 'text' },
                { table: 'codestyle', name: 'StyleCode', type: 'text' },
            ],
            rows: codestyle.rows.map((r) => ({
                SONo: r.SONo,
                StyleCode: r.StyleCode,
                MONo: r.SONo,
            })),
        };
        const fakeSrc: TableDef = {
            name: 'Fake',
            fields: [{ table: 'Fake', name: 'MONo', type: 'text' }],
            rows: [
                { MONo: '4519082833' },
                { MONo: '4519082844' },
                { MONo: '4519082845' },
            ],
        };
        const fakeCand = joinCandidates(fakeSrc, codWithMon).find(
            (c) => c.aCol === 'MONo' && c.bCol === 'MONo',
        );
        expect(fakeCand).toBeDefined();
        expect(
            isReliableHop({
                from: fakeCand!.a,
                to: fakeCand!.b,
                fromCol: fakeCand!.aCol,
                toCol: fakeCand!.bCol,
                kind: fakeCand!.kind,
                overlap: fakeCand!.overlap,
                confidence: fakeCand!.confidence,
                verified: fakeCand!.verified,
            }),
        ).toBe(false);
        expect(isReliablePath([])).toBe(true);
    });
});

describe('buildMeasureDax', () => {
    it('generates the self-contained list formula for the missed join', () => {
        const spec = {
            ...styleLinkSpec(),
            kind: 'list' as const,
            column: 'StyleCode',
            agg: 'sum' as const,
        };
        const dax = buildMeasureDax(spec);
        expect(dax).toContain('VALUES');
        expect(dax).toContain('FILTER(codestyle,');
        expect(dax).toContain('COUNTROWS(FILTER(taging_reel');
        expect(dax).toContain(
            'TRIM(taging_reel[MONo]) = TRIM(codestyle[SONo])',
        );
    });

    it('evaluates the generated list to the CH10 style via the engine', () => {
        setTables([taging]);
        // CH10: codestyle reduced to the two MONo rows → StyleCode 311837
        const spec = {
            ...styleLinkSpec(),
            kind: 'list' as const,
            column: 'StyleCode',
            agg: 'sum' as const,
        };
        const compile = compileListMeasure(
            measureExpression('Style Codes', spec),
        );
        expect(compile).not.toBeNull();
        const ch10Codestyle: TableDef = {
            ...codestyle,
            rows: codestyle.rows.filter((r) =>
                ['4524091437', '4524093564'].includes(String(r.SONo).trim()),
            ),
        };
        setTables([taging, ch10Codestyle]);
        const values = compile!([], {});
        expect(values).toEqual(['311837']);
    });

    it('ensures generated DAX compiles clean with the numeric engine', () => {
        const spec = {
            ...styleLinkSpec(),
            kind: 'number' as const,
            column: 'StyleCode',
            agg: 'sum' as const,
        };
        const dax = measureExpression('Total', spec);
        expect(() => compileMeasure(dax)).not.toThrow();
    });
});

describe('deriveMeasureSpec', () => {
    it('reverses a plain VALUES list', () => {
        const spec = deriveMeasureSpec('VALUES(codestyle[StyleCode])');
        expect(spec).not.toBeNull();
        expect(spec!.kind).toBe('list');
        expect(spec!.to).toBe('codestyle');
        expect(spec!.column).toBe('StyleCode');
        expect(spec!.hops).toHaveLength(0);
    });

    it('reverses a single-hop correlated list and recovers the chain', () => {
        const generated = buildMeasureDax({
            ...styleLinkSpec(),
            kind: 'list',
            column: 'StyleCode',
            agg: 'count',
        });
        const spec = deriveMeasureSpec(generated);
        expect(spec).not.toBeNull();
        expect(spec!.kind).toBe('list');
        expect(spec!.to).toBe('codestyle');
        expect(spec!.column).toBe('StyleCode');
        expect(spec!.hops).toHaveLength(1);
        expect(spec!.hops[0]!.from).toBe('taging_reel');
        expect(spec!.hops[0]!.to).toBe('codestyle');
        expect(spec!.hops[0]!.fromCol).toBe('MONo');
        expect(spec!.hops[0]!.toCol).toBe('SONo');
    });

    it('recovers a scalar condition from the generated DAX', () => {
        const specIn: WizardSpec = {
            ...styleLinkSpec(),
            kind: 'list',
            column: 'StyleCode',
            agg: 'count',
            condition: { column: 'Qty', op: 'gt', value: '0' },
        };
        const generated = buildMeasureDax(specIn);
        const spec = deriveMeasureSpec(generated);
        expect(spec).not.toBeNull();
        expect(spec!.condition).toEqual({
            column: 'Qty',
            op: 'gt',
            value: '0',
        });
    });

    it('returns null for an unrecognized scalar expression', () => {
        expect(deriveMeasureSpec('SUM(codestyle[Qty]) / 2')).toBeNull();
    });
});
