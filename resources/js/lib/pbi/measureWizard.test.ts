import { describe, expect, it } from 'vitest';
import {
    buildMeasureDax,
    chainRowCount,
    deriveMeasureSpec,
    firstFailingHop,
    isReliableHop,
    isReliablePath,
    joinCandidates,
    measureExpression,
    proposePath,
    proposePaths,
    type PathHop,
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

    it('ranks identifier keys above generic name-coincidence at equal confidence', () => {
        // Two candidate links with the same value-overlap confidence: one on a
        // real identifier column (MONo), one on a generic shared name (chaine).
        // Both are verified; the solver must surface the identifier first.
        const a: TableDef = {
            name: 'CA',
            fields: [
                { table: 'CA', name: 'MONo', type: 'text' },
                { table: 'CA', name: 'chaine', type: 'text' },
            ],
            rows: [
                { MONo: '1111111111', chaine: 'CH01' },
                { MONo: '2222222222', chaine: 'CH01' },
                { MONo: '3333333333', chaine: 'CH02' },
            ],
        };
        const b: TableDef = {
            name: 'CB',
            fields: [
                { table: 'CB', name: 'MONo', type: 'text' },
                { table: 'CB', name: 'chaine', type: 'text' },
            ],
            rows: [
                { MONo: '1111111111', chaine: 'CH01' },
                { MONo: '2222222222', chaine: 'CH02' },
                { MONo: '3333333333', chaine: 'CH02' },
            ],
        };
        const cands = joinCandidates(a, b);
        expect(cands[0]!.aCol).toBe('MONo');
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
        const paths = proposePaths(
            [taging, codestyle],
            'taging_reel',
            'codestyle',
        );
        expect(paths.length).toBeGreaterThanOrEqual(1);
        expect(paths.length).toBeLessThanOrEqual(5);
        expect(paths.every((p) => p.blocked === null)).toBe(true);
    });

    it('orders shortest routes first by default and reliable routes when asked', () => {
        const mkShared = (
            name: string,
            col: string,
            vals: string[],
        ): TableDef => ({
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
        const single = proposePaths(
            [taging, codestyle],
            'taging_reel',
            'codestyle',
        )[0]!;
        const best = proposePath(
            [taging, codestyle],
            'taging_reel',
            'codestyle',
        );
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
        const paths = proposePaths(
            [taging, codestyle, other],
            'taging_reel',
            'orphan',
        );
        expect(paths).toHaveLength(1);
        expect(paths[0]!.blocked?.reason).toBe('Chemin introuvable');
    });

    it('finds the verified 2-hop through a dense name-coincidence hub maze', () => {
        // Mirrors the real report: every KPI table carries a `chaine` column
        // sharing the same values, so the full graph forms a near-complete
        // hub cloud with astronomically many deep (7-8 hop) simple paths. A
        // naive LIFO search burns its 6000-expansion budget inside that cloud
        // and silently drops the shallow verified route wip→taging→codestyle.
        const mkHub = (name: string): TableDef => ({
            name,
            fields: [
                { table: name, name: 'chaine', type: 'text' },
                { table: name, name: 'N', type: 'number' },
            ],
            rows: ['CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06'].map(
                (chaine, i) => ({ chaine, N: i }),
            ),
        });
        const hubs = Array.from({ length: 14 }, (_, i) => mkHub(`kpi_${i}`));

        // wip_chaine connects to the hub cloud by name (Chaine) AND carries
        // the verified ProdGroup link into taging_reel.
        const wipChaine: TableDef = {
            name: 'wip_chaine',
            fields: [
                { table: 'wip_chaine', name: 'Chaine', type: 'text' },
                { table: 'wip_chaine', name: 'ProdGroup', type: 'text' },
                { table: 'wip_chaine', name: 'WIP', type: 'number' },
            ],
            rows: [
                { Chaine: 'CH01', ProdGroup: pad('CH10', 40), WIP: 10 },
                { Chaine: 'CH02', ProdGroup: pad('CH10', 40), WIP: 20 },
                { Chaine: 'CH03', ProdGroup: pad('CH16', 40), WIP: 30 },
            ],
        };

        const all = [wipChaine, taging, codestyle, ...hubs];
        const paths = proposePaths(all, 'wip_chaine', 'codestyle');
        expect(paths.length).toBeGreaterThan(0);
        expect(paths[0]!.blocked).toBeNull();
        // The best-first frontier must enumerate the verified 2-hop ahead of
        // the deep hub-mazes.
        const twoHop = paths.find(
            (p) =>
                p.hops.length === 2 &&
                p.hops[0]!.to === 'taging_reel' &&
                p.hops[1]!.to === 'codestyle',
        );
        expect(twoHop).toBeDefined();
        expect(twoHop!.hops.every((h) => h.verified)).toBe(true);
        expect(paths[0]!.hops.length).toBeLessThanOrEqual(2);
    });
});

describe('estimate: chaîne → IDOFabrication', () => {
    // Real-shaped fixtures from data.json: the sewing world (qte_depart /
    // codestyle) carries ORDER numbers (4524091437…) and STYLE codes
    // (311837…); the DIVATEX world (OFabrication) carries internal IDArticle
    // ids (5024…) and the IDOFabrication we want at the end. The only bridge
    // between them is an article master mapping code → IDArticle, mirroring
    // `sync_gpro_article_master`, which is absent from the snapshot.
    const qteDepart: TableDef = {
        name: 'qte_depart_chaine_article_of',
        fields: [
            {
                table: 'qte_depart_chaine_article_of',
                name: 'Chaine',
                type: 'text',
            },
            {
                table: 'qte_depart_chaine_article_of',
                name: 'Article',
                type: 'text',
            },
            {
                table: 'qte_depart_chaine_article_of',
                name: 'OF_No',
                type: 'text',
            },
        ],
        rows: [
            {
                Chaine: pad('DEP-J', 40),
                Article: '311837',
                OF_No: '4524830572',
            },
            {
                Chaine: pad('DEP-J', 40),
                Article: '311837',
                OF_No: '4524847793',
            },
            {
                Chaine: pad('Departage', 40),
                Article: '340497',
                OF_No: '4524154323',
            },
            {
                Chaine: pad('Departage', 40),
                Article: '302806',
                OF_No: '4524757991',
            },
        ],
    };

    const articleMaster: TableDef = {
        name: 'article_master',
        fields: [
            { table: 'article_master', name: 'code_article', type: 'text' },
            { table: 'article_master', name: 'IDArticle', type: 'text' },
        ],
        rows: [
            { code_article: '311837', IDArticle: '5024' },
            { code_article: '340497', IDArticle: '5018' },
            { code_article: '302806', IDArticle: '5011' },
            { code_article: '501414', IDArticle: '1092' },
        ],
    };

    const ofabrication: TableDef = {
        name: 'OFabrication',
        fields: [
            { table: 'OFabrication', name: 'IDArticle', type: 'text' },
            { table: 'OFabrication', name: 'IDOFabrication', type: 'text' },
            { table: 'OFabrication', name: 'IDChaineMontage', type: 'number' },
        ],
        rows: [
            { IDArticle: '5024', IDOFabrication: '18842', IDChaineMontage: 1 },
            { IDArticle: '5018', IDOFabrication: '18933', IDChaineMontage: 1 },
            { IDArticle: '5011', IDOFabrication: '19001', IDChaineMontage: 11 },
        ],
    };

    it('blocks the route when no article bridge is loaded', () => {
        const paths = proposePaths(
            [qteDepart, articleMaster, ofabrication].filter(
                (t) => t.name !== 'article_master',
            ),
            'qte_depart_chaine_article_of',
            'OFabrication',
        );
        expect(paths).toHaveLength(1);
        expect(paths[0]!.blocked?.reason).toBe('Chemin introuvable');
    });

    it('finds the two verified hops once the article master is present', () => {
        const paths = proposePaths(
            [qteDepart, articleMaster, ofabrication],
            'qte_depart_chaine_article_of',
            'OFabrication',
        );
        expect(paths[0]!.blocked).toBeNull();
        const best = proposePath(
            [qteDepart, articleMaster, ofabrication],
            'qte_depart_chaine_article_of',
            'OFabrication',
        );
        // qte_depart.Articles.stampa → master.code_article → master.IDArticle
        // → ofabrication.IDArticle → the OF number column.
        expect(best.hops).toHaveLength(2);
        expect(best.hops[0]!.from).toBe('qte_depart_chaine_article_of');
        expect(best.hops[0]!.to).toBe('article_master');
        expect(best.hops[0]!.fromCol).toBe('Article');
        expect(best.hops[0]!.toCol).toBe('code_article');
        expect(best.hops[1]!.to).toBe('OFabrication');
        expect(best.hops[1]!.fromCol).toBe('IDArticle');
        expect(best.hops[1]!.toCol).toBe('IDArticle');
        expect(best.hops.every((h) => h.verified)).toBe(true);
    });

    it('reports live rows and no failing hop for the full chain', () => {
        const hops: PathHop[] = [
            {
                from: 'qte_depart_chaine_article_of',
                to: 'article_master',
                fromCol: 'Article',
                toCol: 'code_article',
                kind: 'fk_pk' as const,
                overlap: 0.75,
                confidence: 0.8,
            },
            {
                from: 'article_master',
                to: 'OFabrication',
                fromCol: 'IDArticle',
                toCol: 'IDArticle',
                kind: 'shared' as const,
                overlap: 0.75,
                confidence: 0.8,
            },
        ];
        setTables([qteDepart, articleMaster, ofabrication]);
        const rowCount = chainRowCount(
            'qte_depart_chaine_article_of',
            'OFabrication',
            hops,
        );
        expect(rowCount.ok).toBe(true);
        expect(rowCount.count).toBeGreaterThan(0);
        expect(
            firstFailingHop(
                'qte_depart_chaine_article_of',
                'OFabrication',
                hops,
            ),
        ).toBe(-1);
    });

    it('extracts the exact IDOFabrication of a chain-filtered page', () => {
        // Page filtered to the DEP-J chain → the OF number of that chain.
        const depJ = {
            ...qteDepart,
            rows: qteDepart.rows.filter((r) => r.Chaine === pad('DEP-J', 40)),
        };
        setTables([depJ, articleMaster, ofabrication]);
        const spec: WizardSpec = {
            from: 'qte_depart_chaine_article_of',
            to: 'OFabrication',
            hops: [
                {
                    from: 'qte_depart_chaine_article_of',
                    to: 'article_master',
                    fromCol: 'Article',
                    toCol: 'code_article',
                    kind: 'fk_pk' as const,
                    overlap: 0.75,
                    confidence: 0.8,
                },
                {
                    from: 'article_master',
                    to: 'OFabrication',
                    fromCol: 'IDArticle',
                    toCol: 'IDArticle',
                    kind: 'shared' as const,
                    overlap: 0.75,
                    confidence: 0.8,
                },
            ],
            kind: 'list' as const,
            column: 'IDOFabrication',
            agg: 'sum' as const,
        };
        const compile = compileListMeasure(measureExpression('OF IDs', spec));
        expect(compile).not.toBeNull();
        expect(compile!([], {})).toEqual(['18842']);
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

describe('chainRowCount / firstFailingHop', () => {
    it('reports the live row count of a data-producing chain', () => {
        setTables([taging, codestyle]);
        const r = chainRowCount('taging_reel', 'codestyle', [
            {
                from: 'taging_reel',
                to: 'codestyle',
                fromCol: 'MONo',
                toCol: 'SONo',
                kind: 'fk_pk' as const,
                overlap: 0.36,
                confidence: 0.45,
            },
        ]);
        expect(r.ok).toBe(true);
        expect(r.count).toBeGreaterThan(0);
    });

    it('returns -1 when the full chain matches data', () => {
        setTables([taging, codestyle]);
        const fail = firstFailingHop('taging_reel', 'codestyle', [
            {
                from: 'taging_reel',
                to: 'codestyle',
                fromCol: 'MONo',
                toCol: 'SONo',
                kind: 'fk_pk' as const,
                overlap: 0.36,
                confidence: 0.45,
            },
        ]);
        expect(fail).toBe(-1);
    });

    it('points at the first hop whose chain produces no rows', () => {
        // hop 1 matches (shared MONo), hop 2 connects to an empty table → the
        // diagnostic must flag hop 2 (index 1).
        const mid: TableDef = {
            name: 'bridge',
            fields: [
                { table: 'bridge', name: 'MONo', type: 'text' },
                { table: 'bridge', name: 'key', type: 'text' },
            ],
            rows: [
                { MONo: pad('4524091437', 15), key: 'K1' },
                { MONo: pad('4524093564', 15), key: 'K2' },
            ],
        };
        const empty: TableDef = {
            name: 'dead_end',
            fields: [{ table: 'dead_end', name: 'key', type: 'text' }],
            rows: [{ key: 'K3' }],
        };
        setTables([taging, codestyle, mid, empty]);
        const fail = firstFailingHop('taging_reel', 'dead_end', [
            {
                from: 'taging_reel',
                to: 'bridge',
                fromCol: 'MONo',
                toCol: 'MONo',
                kind: 'shared' as const,
                overlap: 1,
                confidence: 1,
            },
            {
                from: 'bridge',
                to: 'dead_end',
                fromCol: 'key',
                toCol: 'key',
                kind: 'shared' as const,
                overlap: 1,
                confidence: 1,
            },
        ]);
        // bridge.key = K2 has no match in dead_end.key (only K1) — but the
        // correlated chain evaluates from the base table, so rows where
        // dead_end is reached via bridge are constrained by MONo: 4524093564 →
        // bridge row (K2) → dead_end needs K2, which does not exist. The first
        // failing hop is the dead_end join (index 1).
        expect(fail).toBe(1);
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
