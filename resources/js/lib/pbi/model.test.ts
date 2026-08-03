import { describe, expect, it } from 'vitest';
import {
    aggregate,
    applyFx,
    buildChartData,
    compileMeasure,
    evaluateMeasure,
    fieldLabel,
    formatCallout,
    formatNumberPattern,
    gaugeBoundValue,
    inferFieldType,
    isMeasure,
    measureColumnRefs,
    measureError,
    measureLabel,
    normalizeCalloutStyle,
    normalizeCategoryLabelStyle,
    normalizeGaugeStyle,
    normalizeTitleStyle,
    normalizeWellField,
    parseDaxRef,
    parseFieldReference,
    registerMeasure,
    setTables,
    singleValue,
    singleValueLabel,
    unregisterMeasure,
    validateMeasureExpression,
    visualTitleStyle,
    type FxOp,
    type FxRule,
    type TableDef,
} from './model';
import { slicerKey } from './store';

const table: TableDef = {
    name: 'wip_chaine',
    fields: [
        { table: 'wip_chaine', name: 'ProdGroup', type: 'text' },
        { table: 'wip_chaine', name: 'WIP_Chaine', type: 'number' },
    ],
    rows: [
        { ProdGroup: 'CH01', WIP_Chaine: 10 },
        { ProdGroup: 'CH01', WIP_Chaine: 5 },
        { ProdGroup: 'CH02', WIP_Chaine: 7 },
    ],
};

describe('PBI field references', () => {
    it('unwraps plain, object, and JSON drag references', () => {
        expect(parseFieldReference('WIP_Chaine', 'wip_chaine')).toEqual({
            name: 'WIP_Chaine',
            table: 'wip_chaine',
        });
        expect(
            parseFieldReference({ table: 'wip_chaine', name: 'WIP_Chaine' }),
        ).toEqual({
            name: 'WIP_Chaine',
            table: 'wip_chaine',
        });
        expect(
            parseFieldReference('{"table":"wip_chaine","name":"WIP_Chaine"}'),
        ).toEqual({
            name: 'WIP_Chaine',
            table: 'wip_chaine',
        });
    });

    it('rejects malformed JSON-shaped values and preserves aliases', () => {
        expect(parseFieldReference('{"table":"wip_chaine"}')).toBeNull();
        expect(parseFieldReference('{bad json')).toBeNull();
        expect(
            normalizeWellField({
                table: 'wip_chaine',
                name: '{"table":"wip_chaine","name":"WIP_Chaine"}',
                agg: 'sum',
                label: 'Total Sales',
            }),
        ).toEqual({
            table: 'wip_chaine',
            name: 'WIP_Chaine',
            agg: 'sum',
            label: 'Total Sales',
        });
    });
});

describe('PBI slicer keys', () => {
    it('keeps equal column names from different tables separate', () => {
        expect(slicerKey('first', 'ProdGroup', 'CH01')).not.toBe(
            slicerKey('second', 'ProdGroup', 'CH01'),
        );
        expect(slicerKey('first', 'ProdGroup', 'A::B')).toContain('A::B');
    });
});

describe('PBI chart aggregation', () => {
    it('groups and sums the physical JSON column name', () => {
        setTables([table]);
        const value = {
            table: 'wip_chaine',
            name: 'WIP_Chaine',
            agg: 'sum' as const,
        };
        const result = buildChartData(
            table.rows,
            [{ table: 'wip_chaine', name: 'ProdGroup', agg: 'count' }],
            [],
            [value],
        );

        expect(result.series).toEqual(['Sum of WIP_Chaine']);
        expect(result.data).toEqual([
            { category: 'CH01', 'Sum of WIP_Chaine': 15 },
            { category: 'CH02', 'Sum of WIP_Chaine': 7 },
        ]);
    });

    it('aggregates deterministic numeric edge cases without treating blanks as zero', () => {
        setTables([
            {
                name: 'sales',
                fields: [
                    { table: 'sales', name: 'Amount', type: 'number' },
                    { table: 'sales', name: 'DecimalAmount', type: 'number' },
                ],
                rows: [],
            },
        ]);
        const rows = [
            { Amount: 10, DecimalAmount: 1.5 },
            { Amount: 0, DecimalAmount: -0.5 },
            { Amount: -4, DecimalAmount: null },
            { Amount: null, DecimalAmount: 2.5 },
        ];
        const field = (
            name: string,
            agg: 'sum' | 'avg' | 'count' | 'distinct' | 'min' | 'max',
        ) => ({
            table: 'sales',
            name,
            agg,
        });

        expect(aggregate(rows, field('Amount', 'sum'))).toBe(6);
        expect(aggregate(rows, field('Amount', 'avg'))).toBe(2);
        expect(aggregate(rows, field('Amount', 'count'))).toBe(3);
        expect(aggregate(rows, field('Amount', 'distinct'))).toBe(4);
        expect(aggregate(rows, field('Amount', 'min'))).toBe(-4);
        expect(aggregate(rows, field('Amount', 'max'))).toBe(10);
        expect(measureLabel(field('Amount', 'sum'))).toBe('Sum of Amount');
        expect(measureLabel(field('Amount', 'avg'))).toBe('Average of Amount');
        expect(measureLabel(field('Amount', 'count'))).toBe('Count of Amount');
        expect(measureLabel(field('Amount', 'distinct'))).toBe(
            'Distinct count of Amount',
        );
        expect(measureLabel(field('Amount', 'min'))).toBe('Min of Amount');
        expect(measureLabel(field('Amount', 'max'))).toBe('Max of Amount');
    });

    it('infers all supported fixture field types and handles empty rows', () => {
        expect(inferFieldType([1, 0, -2, 1.5, null])).toBe('number');
        expect(inferFieldType(['2026-01-01', '2026-01-02', null])).toBe('date');
        expect(inferFieldType([true, false, null])).toBe('boolean');
        expect(inferFieldType(['A', 'B', ''])).toBe('text');
        expect(inferFieldType([])).toBe('text');
    });

    it('supports aggregation changes and friendly aliases', () => {
        setTables([table]);
        const rows = table.rows;
        expect(
            aggregate(rows, {
                table: 'wip_chaine',
                name: 'WIP_Chaine',
                agg: 'avg',
            }),
        ).toBeCloseTo(22 / 3);
        expect(
            aggregate(rows, {
                table: 'wip_chaine',
                name: 'WIP_Chaine',
                agg: 'count',
            }),
        ).toBe(3);
        expect(
            aggregate(rows, {
                table: 'wip_chaine',
                name: 'WIP_Chaine',
                agg: 'distinct',
            }),
        ).toBe(3);
        expect(
            aggregate(rows, {
                table: 'wip_chaine',
                name: 'WIP_Chaine',
                agg: 'min',
            }),
        ).toBe(5);
        expect(
            aggregate(rows, {
                table: 'wip_chaine',
                name: 'WIP_Chaine',
                agg: 'max',
            }),
        ).toBe(10);
        expect(
            measureLabel({
                table: 'wip_chaine',
                name: 'WIP_Chaine',
                agg: 'sum',
                label: 'Total Sales',
            }),
        ).toBe('Total Sales');
        expect(fieldLabel({ name: 'WIP_Chaine' })).toBe('WIP_Chaine');
    });

    it('creates legend series from the physical column', () => {
        setTables([table]);
        const result = buildChartData(
            table.rows,
            [{ table: 'wip_chaine', name: 'ProdGroup', agg: 'count' }],
            [{ table: 'wip_chaine', name: 'ProdGroup', agg: 'count' }],
            [{ table: 'wip_chaine', name: 'WIP_Chaine', agg: 'sum' }],
        );
        expect(
            result.data.every(
                (row) => !Object.keys(row).some((key) => key.startsWith('{')),
            ),
        ).toBe(true);
    });
});

describe('PBI custom measures (DAX)', () => {
    it('parses DAX column references with and without a table', () => {
        expect(parseDaxRef('Sales[Amount]')).toEqual({
            table: 'Sales',
            column: 'Amount',
        });
        expect(parseDaxRef("'Sales Data'[Amount]")).toEqual({
            table: 'Sales Data',
            column: 'Amount',
        });
        expect(parseDaxRef('Sales Data [Amount]')).toEqual({
            table: 'Sales Data',
            column: 'Amount',
        });
        expect(parseDaxRef('[Amount]')).toEqual({ column: 'Amount' });
        expect(parseDaxRef('Sales')).toEqual({ table: 'Sales' });
    });

    it('compiles common aggregations into row functions', () => {
        setTables([table]);
        const rows = table.rows;
        expect(
            compileMeasure('Total = SUM(wip_chaine[WIP_Chaine])')(rows),
        ).toBe(22);
        expect(
            compileMeasure('Total = AVERAGE(wip_chaine[WIP_Chaine])')(rows),
        ).toBeCloseTo(22 / 3);
        expect(
            compileMeasure('Total = COUNT(wip_chaine[WIP_Chaine])')(rows),
        ).toBe(3);
        expect(
            compileMeasure('Total = DISTINCTCOUNT(wip_chaine[WIP_Chaine])')(
                rows,
            ),
        ).toBe(3);
        expect(
            compileMeasure('Total = MIN(wip_chaine[WIP_Chaine])')(rows),
        ).toBe(5);
        expect(
            compileMeasure('Total = MAX(wip_chaine[WIP_Chaine])')(rows),
        ).toBe(10);
        expect(compileMeasure('Total = COUNTROWS(wip_chaine)')(rows)).toBe(3);
        expect(compileMeasure('Total = 42')(rows)).toBe(42);
        expect(compileMeasure('Total = SUM(nonexistent[col])')(rows)).toBe(0);
    });

    it('registers measures into the aggregation engine', () => {
        setTables([table]);
        registerMeasure('WIP Total', 'WIP Total = SUM(wip_chaine[WIP_Chaine])');
        expect(isMeasure('WIP Total')).toBe(true);
        expect(
            aggregate(table.rows, {
                table: 'Measures',
                name: 'WIP Total',
                agg: 'sum',
            }),
        ).toBe(22);
    });
});

describe('Phase 3 measure engine (simplified forms)', () => {
    const sales: TableDef = {
        name: 'Sales',
        fields: [
            { table: 'Sales', name: 'Customer', type: 'text' },
            { table: 'Sales', name: 'Amount', type: 'number' },
            { table: 'Sales', name: 'Cost', type: 'number' },
        ],
        rows: [
            { Customer: 'Alice', Amount: 100, Cost: 40 },
            { Customer: 'Bob', Amount: 50, Cost: 10 },
            { Customer: 'Bob', Amount: 25, Cost: 5 },
            { Customer: '', Amount: null, Cost: null },
        ],
    };
    const rows = sales.rows;

    it('accepts the documented examples', () => {
        expect(compileMeasure('SUM(Amount)')(rows)).toBe(175);
        expect(compileMeasure('AVG(Amount)')(rows)).toBeCloseTo(175 / 3);
        expect(compileMeasure('AVERAGE(Amount)')(rows)).toBeCloseTo(175 / 3);
        expect(compileMeasure('COUNT(Customer)')(rows)).toBe(3);
        expect(compileMeasure('SUM(Amount)-SUM(Cost)')(rows)).toBe(120);
    });

    it('evaluates arithmetic with precedence and parens', () => {
        expect(compileMeasure('SUM(Amount)+SUM(Cost)*2')(rows)).toBe(
            175 + 55 * 2,
        );
        expect(compileMeasure('(SUM(Amount)-SUM(Cost))/3')(rows)).toBeCloseTo(
            40,
        );
        expect(compileMeasure('SUM(Amount)/SUM(Cost)')(rows)).toBeCloseTo(
            175 / 55,
        );
        expect(compileMeasure('SUM(Amount)+1')(rows)).toBe(176);
    });

    it('returns 0 on division by zero (DAX BLANK semantics)', () => {
        expect(compileMeasure('10/0')([])).toBe(0);
        const zeroCost = [{ Customer: 'A', Amount: 5, Cost: 0 }];
        expect(compileMeasure('SUM(Amount)/SUM(Cost)')(zeroCost)).toBe(0);
    });

    it('returns 0 for an empty dataset', () => {
        expect(compileMeasure('SUM(Amount)')([])).toBe(0);
        expect(evaluateMeasure('SUM(Amount)', [])).toEqual({ value: 0 });
    });

    it('flags a deleted-column dependency instead of silently returning 0', () => {
        expect(compileMeasure('SUM(Gone)')(rows)).toBe(0);
        expect(evaluateMeasure('SUM(Gone)', rows).error).toContain('Gone');
        const result = evaluateMeasure('SUM(Amount)-SUM(Gone)', rows);
        expect(result.error).toContain('Gone');
    });

    it('rejects invalid formulas at validation time', () => {
        expect(validateMeasureExpression('Total = SUM(').ok).toBe(false);
        expect(validateMeasureExpression('Total = FOO(Amount)').ok).toBe(false);
        expect(validateMeasureExpression('Total = SUM(Amount))').ok).toBe(
            false,
        );
        expect(validateMeasureExpression('Total = SUM(Amount').ok).toBe(false);
        expect(validateMeasureExpression('Total = ').ok).toBe(false);
        expect(validateMeasureExpression('Total = SUM(Amount)').ok).toBe(true);
    });

    it('validates column dependencies when the dataset columns are known', () => {
        const columns = ['Customer', 'Amount', 'Cost'];
        expect(
            validateMeasureExpression('Total = SUM(Amount)', columns).ok,
        ).toBe(true);
        expect(validateMeasureExpression('Total = SUM(Gone)', columns).ok).toBe(
            false,
        );
        const result = validateMeasureExpression('Total = SUM(Gone)', columns);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('Gone');
    });

    it('resolves [Name] measure references', () => {
        const total = compileMeasure('SUM(Amount)');
        const margin = compileMeasure('SUM(Amount)-SUM(Cost)');
        const ref = evaluateMeasure('[Total Sales]', rows, {
            'Total Sales': total,
        });
        expect(ref).toEqual({ value: 175 });
        expect(
            evaluateMeasure('[Margin]-10', rows, { Margin: margin }),
        ).toEqual({ value: 110 });
    });
});

describe('table-aware measure resolution', () => {
    const other: TableDef = {
        name: 'diva',
        fields: [
            { table: 'diva', name: 'Qte', type: 'number' },
            { table: 'diva', name: 'DivaKey', type: 'text' },
        ],
        rows: [
            { Qte: 4, DivaKey: 'A' },
            { Qte: 6, DivaKey: 'B' },
            { Qte: 8, DivaKey: 'C' },
        ],
    };

    it('computes against its own table even when the visual rows lack the column (measure-only card)', () => {
        setTables([table, other]);
        // Card rows come from a table that does not expose `Qte`.
        const cardRows = [{ ProdGroup: 'CH01' }];
        const fn = compileMeasure('Total = SUM(diva[Qte])');
        expect(fn(cardRows)).toBe(18);
    });

    it('resolves bare column refs to the first table exposing the column', () => {
        setTables([table, other]);
        expect(compileMeasure('SUM(Qte)')([{ ProdGroup: 'CH01' }])).toBe(18);
    });

    it('keeps visual rows when they already contain the column', () => {
        setTables([table, other]);
        expect(compileMeasure('SUM(Qte)')([{ Qte: 1 }, { Qte: 2 }])).toBe(3);
    });

    it('aggregates a cross-table measure to the referenced table total when no join enriches the rows', () => {
        setTables([table, other]);
        // Grouped chart rows reference `diva` but are not enriched with `Qte`.
        const grouped = [{ ProdGroup: 'CH01' }, { ProdGroup: 'CH02' }];
        const fn = compileMeasure('Total = SUM(diva[Qte])');
        expect(fn(grouped)).toBe(18);
    });

    it('supports [Other Measure] refs at eval time with a recursion guard', () => {
        setTables([table]);
        registerMeasure(
            'Base Total',
            'Base Total = SUM(wip_chaine[WIP_Chaine])',
        );
        registerMeasure('Base Times 2', 'Base Times 2 = [Base Total] * 2');
        expect(compileMeasure('[Base Times 2]')(table.rows)).toBe(44);
        unregisterMeasure('Base Total');
        unregisterMeasure('Base Times 2');
    });

    it('lists the tables and columns a measure expression depends on', () => {
        setTables([table, other]);
        expect(measureColumnRefs('Total = SUM(diva[Qte]) + [Other]')).toEqual([
            { table: 'diva', column: 'Qte' },
            { column: 'Other' },
        ]);
        expect(measureColumnRefs('Total = SUM(Gone')).toEqual([]);
    });
});

describe('measure error registry + unregistration', () => {
    it('records a validation error for a broken measure and clears it once fixed', () => {
        setTables([table]);
        registerMeasure('Broken', 'Broken = SUM(Gone)');
        expect(measureError('Broken')).toContain('Gone');
        registerMeasure('Broken', 'Broken = SUM(wip_chaine[WIP_Chaine])');
        expect(measureError('Broken')).toBeUndefined();
    });

    it('keeps built-in measures healthy', () => {
        setTables([table]);
        registerMeasure('Row Count', 'Row Count = COUNTROWS ( <table> )');
        expect(measureError('Row Count')).toBeUndefined();
        unregisterMeasure('Row Count');
    });

    it('removes a measure and its error from the engine', () => {
        setTables([table]);
        registerMeasure('Temp', 'Temp = SUM(Gone)');
        expect(isMeasure('Temp')).toBe(true);
        expect(measureError('Temp')).toBeDefined();
        unregisterMeasure('Temp');
        expect(isMeasure('Temp')).toBe(false);
        expect(measureError('Temp')).toBeUndefined();
    });
});

describe('callout formatting', () => {
    it('scales by display unit', () => {
        const style = { displayUnits: 'thousands', decimals: 1 } as const;
        expect(formatCallout(12_345, style)).toBe('12.3K');
        expect(
            formatCallout(12_345, { displayUnits: 'millions', decimals: 1 }),
        ).toBe('0.0M');
        expect(
            formatCallout(1_200_000, { displayUnits: 'millions', decimals: 1 }),
        ).toBe('1.2M');
        expect(
            formatCallout(2_000_000_000, {
                displayUnits: 'billions',
                decimals: 1,
            }),
        ).toBe('2.0B');
        expect(
            formatCallout(4_200, { displayUnits: 'none', decimals: 2 }),
        ).toBe('4,200.00');
        expect(
            formatCallout(0.5, { displayUnits: 'percent', decimals: 1 }),
        ).toBe('50.0%');
        expect(
            formatCallout(2500, { displayUnits: 'currency', decimals: 0 }),
        ).toBe('$2,500');
    });

    it('honors a per-field format over the callout unit', () => {
        expect(
            formatCallout(
                2500,
                { displayUnits: 'thousands', decimals: 1 },
                { format: 'currency' },
            ),
        ).toBe('$2,500');
    });

    it('backfills missing numbers with an em dash', () => {
        expect(formatCallout(NaN, { displayUnits: 'auto', decimals: 1 })).toBe(
            '—',
        );
    });

    it('formats text/date/boolean callout values through formatValue', () => {
        const style = { displayUnits: 'thousands', decimals: 1 } as const;
        expect(formatCallout('Hello', style, undefined, 'text')).toBe('Hello');
        expect(formatCallout('2026-08-02', style, undefined, 'date')).toContain(
            'Aug',
        );
        expect(formatCallout('2026-08-02', style, undefined, 'date')).toContain(
            '2026',
        );
        expect(formatCallout(true, style, undefined, 'boolean')).toBe('Yes');
        expect(formatCallout(false, style, undefined, 'boolean')).toBe('No');
        expect(formatCallout(null, style, undefined, 'text')).toBe('—');
        expect(formatCallout(12_345, style, undefined, 'number')).toBe('12.3K');
    });
});

describe('singleValue — string/date support for single-value visuals', () => {
    const rows = [
        { Status: 'Open', LoggedAt: '2026-07-01', Amount: 1 },
        { Status: null, LoggedAt: '2026-07-02', Amount: 2 },
        { Status: 'Closed', LoggedAt: '2026-07-03', Amount: 3 },
    ];

    it('returns the first/latest/count for text fields', () => {
        setTables([
            {
                name: 'log',
                fields: [
                    { table: 'log', name: 'Status', type: 'text' },
                    { table: 'log', name: 'LoggedAt', type: 'date' },
                    { table: 'log', name: 'Amount', type: 'number' },
                ],
                rows: [],
            },
        ]);
        const text = { table: 'log', name: 'Status', agg: 'count' as const };
        expect(singleValue(rows, text, 'first')).toBe('Open');
        expect(singleValue(rows, text, 'latest')).toBe('Closed');
        expect(singleValue(rows, text, 'count')).toBe(2);
        expect(singleValueLabel(text, 'text', 'first')).toBe('Status');
        expect(singleValueLabel(text, 'text', 'count')).toBe('Count of Status');
        expect(
            singleValue(
                rows,
                { table: 'log', name: 'LoggedAt', agg: 'count' as const },
                'latest',
            ),
        ).toBe('2026-07-03');
        expect(
            singleValue(
                rows,
                { table: 'log', name: 'Amount', agg: 'sum' as const },
                'first',
            ),
        ).toBe(6);
        expect(singleValue([], text, 'first')).toBeNull();
    });

    it('honors the field-level valueAggregation', () => {
        const text = {
            table: 'log',
            name: 'Status',
            agg: 'count' as const,
            valueAggregation: 'latest' as const,
        };
        expect(singleValue(rows, text)).toBe('Closed');
        expect(singleValueLabel(text, 'text')).toBe('Status');
        expect(
            singleValue(rows, { ...text, valueAggregation: 'count' as const }),
        ).toBe(2);
        expect(
            singleValueLabel(
                { ...text, valueAggregation: 'count' as const },
                'text',
            ),
        ).toBe('Count of Status');
    });

    it('normalizes valueAggregation on well fields', () => {
        expect(
            normalizeWellField({
                table: 'log',
                name: 'Status',
                agg: 'count',
                valueAggregation: 'latest',
            })?.valueAggregation,
        ).toBe('latest');
        expect(
            normalizeWellField({
                table: 'log',
                name: 'Status',
                agg: 'count',
                valueAggregation: 'nope',
            })?.valueAggregation,
        ).toBeUndefined();
        expect(
            normalizeWellField({ table: 'log', name: 'Status' })
                ?.valueAggregation,
        ).toBeUndefined();
    });
});

describe('conditional formatting fx rules', () => {
    it('returns the first matching rule color', () => {
        const rules: FxRule[] = [
            { op: '>', value: 100, color: '#111111' },
            { op: '>', value: 50, color: '#222222' },
        ];
        expect(applyFx(rules, 200)).toBe('#111111');
        expect(applyFx(rules, 75)).toBe('#222222');
        expect(applyFx(rules, 10)).toBeUndefined();
    });

    it('supports all operators', () => {
        const color = '#ff0000';
        const one = (op: FxOp, value: number): FxRule => ({ op, value, color });
        expect(applyFx([one('>=', 5)], 5)).toBe(color);
        expect(applyFx([one('<', 5)], 4)).toBe(color);
        expect(applyFx([one('<=', 5)], 5)).toBe(color);
        expect(applyFx([one('=', 5)], 5)).toBe(color);
        expect(applyFx([one('!=', 5)], 4)).toBe(color);
    });
});

describe('single-value style normalizers', () => {
    it('applies defaults for missing config', () => {
        expect(normalizeCalloutStyle(undefined).displayUnits).toBe('auto');
        expect(normalizeCalloutStyle({}).decimals).toBe(1);
        expect(normalizeCalloutStyle({}).fx).toEqual({
            enabled: false,
            rules: [],
        });
        expect(normalizeCategoryLabelStyle(undefined).show).toBe(true);
        expect(normalizeTitleStyle(undefined).heading).toBe('none');
    });

    it('preserves explicit values and sanitizes bad ones', () => {
        const callout = normalizeCalloutStyle({
            displayUnits: 'millions',
            decimals: 2,
            bold: true,
            fx: {
                enabled: true,
                rules: [{ op: '>', value: 10, color: '#123456' }],
            },
        });
        expect(callout).toMatchObject({
            displayUnits: 'millions',
            decimals: 2,
            bold: true,
        });
        expect(callout.fx).toEqual({
            enabled: true,
            rules: [{ op: '>', value: 10, color: '#123456' }],
        });
        expect(
            normalizeCalloutStyle({ displayUnits: 'nope', decimals: 'x' }),
        ).toMatchObject({ displayUnits: 'auto', decimals: 1 });
        expect(
            normalizeCategoryLabelStyle({ show: false, fontSize: 14 }),
        ).toMatchObject({ show: false, fontSize: 14 });
        expect(
            normalizeTitleStyle({
                heading: 'h2',
                align: 'right',
                color: '#00ff00',
            }),
        ).toMatchObject({ heading: 'h2', align: 'right', color: '#00ff00' });
        expect(
            normalizeTitleStyle({ heading: 'none', fontSize: 16 }).fontSize,
        ).toBe(16);
    });

    it('visualTitleStyle resolves font size: explicit > heading preset > general', () => {
        const base = {
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            fontColor: '#111111',
        };
        expect(
            visualTitleStyle({ ...base, titleStyle: { heading: 'none' } })
                .fontSize,
        ).toBe(10);
        expect(
            visualTitleStyle({ ...base, titleStyle: { heading: 'h2' } })
                .fontSize,
        ).toBe(22);
        expect(
            visualTitleStyle({
                ...base,
                titleStyle: { heading: 'h2', fontSize: 17 },
            }).fontSize,
        ).toBe(17);
        expect(
            visualTitleStyle({
                ...base,
                titleStyle: { heading: 'none', fontSize: 14 },
            }).fontSize,
        ).toBe(14);
    });

    it('visualTitleStyle honors alignment and text wrap', () => {
        expect(
            visualTitleStyle({
                fontFamily: undefined,
                fontSize: 10,
                fontColor: '#111111',
                titleStyle: { heading: 'none', align: 'right', textWrap: true },
            }),
        ).toMatchObject({ textAlign: 'right', whiteSpace: 'normal' });
        expect(
            visualTitleStyle({
                fontFamily: undefined,
                fontSize: 10,
                fontColor: '#111111',
                titleStyle: { heading: 'none' },
            }).whiteSpace,
        ).toBe('nowrap');
    });
});

describe('gauge style normalizer', () => {
    it('applies defaults for missing config', () => {
        const style = normalizeGaugeStyle(undefined);
        expect(style.axis.min.auto).toBe(true);
        expect(style.axis.max.auto).toBe(true);
        expect(style.axis.target.auto).toBe(true);
        expect(style.dataLabels.values.show).toBe(true);
        expect(style.dataLabels.callout.show).toBe(true);
        expect(style.fillColor).toBeUndefined();
    });

    it('preserves explicit values and sanitizes bad ones', () => {
        const style = normalizeGaugeStyle({
            fillColor: '#ff0000',
            targetColor: '#00ff00',
            axis: {
                min: { auto: false, format: '0.0%' },
                max: { auto: false },
            },
            dataLabels: {
                show: false,
                targetLabel: { show: true, fontSize: 12 },
            },
        });
        expect(style.fillColor).toBe('#ff0000');
        expect(style.targetColor).toBe('#00ff00');
        expect(style.axis.min).toMatchObject({ auto: false, format: '0.0%' });
        expect(style.axis.max).toMatchObject({ auto: false });
        expect(style.dataLabels.show).toBe(false);
        expect(style.dataLabels.targetLabel.show).toBe(true);
        expect(style.dataLabels.targetLabel.fontSize).toBe(12);
        expect(style.axis.min).not.toHaveProperty('fx');
    });

    it('gaugeBoundValue prefers a dropped field over a typed constant', () => {
        setTables([table]);
        const wf = {
            table: 'wip_chaine',
            name: 'WIP_Chaine',
            agg: 'sum' as const,
        };
        expect(gaugeBoundValue(table.rows, wf, 5)).toBe(22);
        expect(gaugeBoundValue(table.rows, wf, undefined)).toBe(22);
        expect(gaugeBoundValue(table.rows, undefined, 7.5)).toBe(7.5);
        expect(
            gaugeBoundValue(table.rows, undefined, undefined),
        ).toBeUndefined();
        expect(
            gaugeBoundValue(table.rows, undefined, Number.NaN),
        ).toBeUndefined();
        expect(
            gaugeBoundValue(table.rows, undefined, Infinity),
        ).toBeUndefined();
    });
});

describe('Power BI-style format strings', () => {
    it('formats plain numbers and custom patterns', () => {
        expect(formatNumberPattern(1270, '$#,##0')).toBe('$1,270');
        expect(formatNumberPattern(0.125, '0.0%')).toBe('12.5%');
        expect(formatNumberPattern(1.27, '0.00')).toBe('1.27');
        expect(formatNumberPattern(7, '0000')).toBe('0007');
        expect(formatNumberPattern(1234567, '#,##0')).toBe('1,234,567');
    });
});
