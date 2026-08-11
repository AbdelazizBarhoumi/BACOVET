import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { applyTableRows, filterTableRows, type ReportFilter } from './filters';
import type { RelationGraph } from './graph';
import {
    aggregate,
    applyFx,
    buildChartData,
    compileListMeasure,
    compileMeasure,
    evaluateMeasure,
    fieldLabel,
    formatCallout,
    formatDisplayUnitValue,
    formatNumberPattern,
    gaugeBoundValue,
    inferFieldType,
    isListMeasure,
    isMeasure,
    listAggIgnoredCount,
    listMeasureValue,
    listTreatment,
    listMeasureSource,
    measureColumnRefs,
    measureError,
    measureLabel,
    normalizeCalloutStyle,
    normalizeCategoryLabelStyle,
    normalizeGaugeStyle,
    normalizeTitleStyle,
    normalizeValueFormat,
    normalizeWellField,
    parseDaxRef,
    parseFieldReference,
    registerMeasure,
    scopedRows,
    setTables,
    singleValue,
    singleValueLabel,
    unregisterMeasure,
    validateMeasureExpression,
    visualTitleStyle,
    buildTableCells,
    type FxOp,
    type FxRule,
    type TableDef,
    type WellField,
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

    it('preserves the listAgg treatment (W1-15 round-trip)', () => {
        expect(
            normalizeWellField({
                table: 'Measures',
                name: 'Liste opérations',
                agg: 'sum',
                listAgg: 'count',
            }),
        ).toEqual({
            table: 'Measures',
            name: 'Liste opérations',
            agg: 'sum',
            listAgg: 'count',
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

        expect(result.series).toEqual(['Somme de WIP_Chaine']);
        expect(result.data).toEqual([
            { category: 'CH01', 'Somme de WIP_Chaine': 15 },
            { category: 'CH02', 'Somme de WIP_Chaine': 7 },
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
            agg:
                | 'sum'
                | 'avg'
                | 'count'
                | 'distinct'
                | 'min'
                | 'max'
                | 'first'
                | 'latest'
                | 'raw',
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
        expect(aggregate(rows, field('Amount', 'first'))).toBe(10);
        expect(aggregate(rows, field('Amount', 'latest'))).toBe(-4);
        expect(aggregate(rows, field('Amount', 'raw'))).toBe(10);
        expect(measureLabel(field('Amount', 'raw'))).toBe('Amount');
        expect(measureLabel(field('Amount', 'sum'))).toBe('Somme de Amount');
        expect(measureLabel(field('Amount', 'avg'))).toBe('Moyenne de Amount');
        expect(measureLabel(field('Amount', 'count'))).toBe('Nombre de Amount');
        expect(measureLabel(field('Amount', 'distinct'))).toBe(
            'Nombre distinct de Amount',
        );
        expect(measureLabel(field('Amount', 'min'))).toBe('Min de Amount');
        expect(measureLabel(field('Amount', 'max'))).toBe('Max de Amount');
        expect(measureLabel(field('Amount', 'first'))).toBe(
            'Premier de Amount',
        );
        expect(measureLabel(field('Amount', 'latest'))).toBe(
            'Dernier de Amount',
        );
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

    it('aggregates to 0 until a measure is registered, then to its real value', () => {
        setTables([table]);
        const name = 'Register Order Total';
        const wf = {
            table: 'Measures',
            name,
            agg: 'sum' as const,
        };
        expect(isMeasure(name)).toBe(false);
        expect(aggregate(table.rows, wf)).toBe(0);
        registerMeasure(name, `${name} = SUM(wip_chaine[WIP_Chaine])`);
        expect(isMeasure(name)).toBe(true);
        expect(aggregate(table.rows, wf)).toBe(22);
        unregisterMeasure(name);
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

    it('uses a custom callout suffix while keeping unit behavior', () => {
        expect(
            formatCallout(12_345, {
                displayUnits: 'thousands',
                decimals: 1,
                suffix: 'kg',
            }),
        ).toBe('12.3kg');
        expect(
            formatCallout(2500, {
                displayUnits: 'currency',
                decimals: 0,
                suffix: '€',
            }),
        ).toBe('2,500€');
        expect(
            formatCallout(0.5, {
                displayUnits: 'percent',
                decimals: 1,
                suffix: '',
            }),
        ).toBe('50.0%');
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
        expect(formatCallout(true, style, undefined, 'boolean')).toBe('Oui');
        expect(formatCallout(false, style, undefined, 'boolean')).toBe('Non');
        expect(formatCallout(null, style, undefined, 'text')).toBe('—');
        expect(formatCallout(12_345, style, undefined, 'number')).toBe('12.3K');
    });

    it('honors decimal places in auto display units', () => {
        expect(
            formatCallout(62.567, { displayUnits: 'auto', decimals: 2 }),
        ).toBe('62.57');
        expect(formatCallout(0.5, { displayUnits: 'auto', decimals: 1 })).toBe(
            '0.5',
        );
        expect(formatCallout(250, { displayUnits: 'auto', decimals: 2 })).toBe(
            '250',
        );
        expect(
            formatCallout(1_500_000, { displayUnits: 'auto', decimals: 1 }),
        ).toBe('1.5M');
    });

    it('formats auto display units without trailing zeros', () => {
        expect(formatCallout(2_500, { displayUnits: 'auto' })).toBe('2.5K');
        expect(formatCallout(250, { displayUnits: 'auto' })).toBe('250');
    });

    it('honors a custom valueFormat string over display units', () => {
        const style = {
            displayUnits: 'auto',
            decimals: 1,
            valueFormat: { auto: false, format: '$#,##0' },
        } as const;
        expect(formatCallout(1270, style)).toBe('$1,270');
        expect(formatCallout(-1270, style)).toBe('-$1,270');
    });

    it('falls back to display units when valueFormat is auto', () => {
        const style = {
            displayUnits: 'thousands',
            decimals: 1,
            valueFormat: { auto: true },
        } as const;
        expect(formatCallout(12_000, style)).toBe('12.0K');
    });

    it('normalizes valueFormat to auto by default', () => {
        expect(normalizeValueFormat(undefined)).toEqual({ auto: true });
        expect(normalizeValueFormat({ auto: false })).toEqual({
            auto: false,
            format: undefined,
        });
        expect(normalizeValueFormat({ auto: false, format: ' 0.0% ' })).toEqual(
            { auto: false, format: '0.0%' },
        );
    });

    it('carries valueFormat through gauge label normalization', () => {
        const style = normalizeGaugeStyle({
            dataLabels: {
                values: { valueFormat: { auto: false, format: '0.00' } },
            },
        } as unknown);
        expect(style.dataLabels.values.valueFormat).toEqual({
            auto: false,
            format: '0.00',
        });
        expect(style.dataLabels.targetLabel.valueFormat).toEqual({
            auto: true,
        });
    });
});

describe('formatDisplayUnitValue — axis ticks / data labels', () => {
    it('applies the decimal cap in auto mode', () => {
        expect(formatDisplayUnitValue(62.567, 'auto', 2)).toBe('62.57');
        expect(formatDisplayUnitValue(0.5, 'auto', 1)).toBe('0.5');
        expect(formatDisplayUnitValue(250, 'auto', 2)).toBe('250');
        expect(formatDisplayUnitValue(1_500_000, 'auto', 1)).toBe('1.5M');
    });

    it('keeps compact scaling when decimals are unset', () => {
        expect(formatDisplayUnitValue(2_500, 'auto')).toBe('2.5K');
        expect(formatDisplayUnitValue(250, 'auto')).toBe('250');
        expect(formatDisplayUnitValue(250, 'auto', 0)).toBe('250');
    });

    it('still scales and formats explicit units', () => {
        expect(formatDisplayUnitValue(12_345, 'thousands', 1)).toBe('12.3K');
        expect(formatDisplayUnitValue(0.5, 'percent', 1)).toBe('50.0%');
        expect(formatDisplayUnitValue(4_200, 'none', 2)).toBe('4,200.00');
        expect(formatDisplayUnitValue(2500, 'currency', 0)).toBe('$2,500');
    });

    it('uses a custom suffix to override the built-in token', () => {
        expect(formatDisplayUnitValue(12_345, 'thousands', 1, 'kW')).toBe(
            '12.3kW',
        );
        expect(formatDisplayUnitValue(1_200_000, 'millions', 1, ' €')).toBe(
            '1.2 €',
        );
        expect(formatDisplayUnitValue(2_500, 'auto', undefined, 'x')).toBe(
            '2.5x',
        );
        expect(formatDisplayUnitValue(250, 'auto', undefined, 'x')).toBe(
            '250x',
        );
    });

    it('replaces percent and currency tokens with a custom postfix', () => {
        expect(formatDisplayUnitValue(0.5, 'percent', 1, 'pts')).toBe(
            '50.0pts',
        );
        expect(formatDisplayUnitValue(2500, 'currency', 0, '€')).toBe('2,500€');
    });

    it('treats an empty/whitespace suffix as the built-in token', () => {
        expect(formatDisplayUnitValue(12_345, 'thousands', 1, '')).toBe(
            '12.3K',
        );
        expect(formatDisplayUnitValue(2500, 'currency', 0, '   ')).toBe(
            '$2,500',
        );
    });

    it('renders non-finite values as an em dash', () => {
        expect(formatDisplayUnitValue(Number.NaN, 'auto')).toBe('—');
        expect(formatDisplayUnitValue(Number.POSITIVE_INFINITY, 'auto')).toBe(
            '—',
        );
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
        expect(singleValueLabel(text, 'text', 'count')).toBe(
            'Nombre de Status',
        );
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
        ).toBe('Nombre de Status');
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

describe('singleValue — list-style aggregations (nth + window)', () => {
    const rows = [
        { Amount: 1, Status: 'Open', LoggedAt: '2026-07-01' },
        { Amount: 2, Status: null, LoggedAt: '2026-07-02' },
        { Amount: 3, Status: 'Closed', LoggedAt: '2026-07-03' },
        { Amount: 4, Status: 'Paused', LoggedAt: '2026-07-04' },
        { Amount: 5, Status: 'Open', LoggedAt: '2026-07-05' },
    ];

    beforeAll(() => {
        setTables([
            {
                name: 'log',
                fields: [
                    { table: 'log', name: 'Amount', type: 'number' },
                    { table: 'log', name: 'Status', type: 'text' },
                    { table: 'log', name: 'LoggedAt', type: 'date' },
                ],
                rows: [],
            },
        ]);
    });

    it('picks the nth numeric value (1-based)', () => {
        const wf = { table: 'log', name: 'Amount', agg: 'nth' as const };
        expect(aggregate(rows, { ...wf, index: 2 })).toBe(2);
        expect(aggregate(rows, { ...wf, index: 1 })).toBe(1);
        expect(aggregate(rows, { ...wf, index: 5 })).toBe(5);
        expect(aggregate(rows, { ...wf, index: 99 })).toBe(0);
        expect(singleValue(rows, { ...wf, index: 2 })).toBe(2);
    });

    it('picks the nth non-null cell for text fields', () => {
        const wf = {
            table: 'log',
            name: 'Status',
            agg: 'count' as const,
            valueAggregation: 'nth' as const,
            index: 2,
        };
        expect(singleValue(rows, wf)).toBe('Closed');
        expect(singleValueLabel(wf, 'text')).toBe('Valeur N°2 de Status');
    });

    it('scopes aggregations to the last N rows', () => {
        const sum = { table: 'log', name: 'Amount', agg: 'sum' as const };
        expect(aggregate(rows, { ...sum, window: 2 })).toBe(9);
        expect(aggregate(rows, { ...sum, window: 3 })).toBe(12);
        expect(aggregate(rows, { ...sum, window: 10 })).toBe(15);
    });

    it('scopes aggregations to the first N rows', () => {
        const sum = {
            table: 'log',
            name: 'Amount',
            agg: 'sum' as const,
            window: 2,
            windowDir: 'first' as const,
        };
        expect(aggregate(rows, sum)).toBe(3);
        expect(singleValue(rows, sum)).toBe(3);
    });

    it('combines windows with latest / nth / avg', () => {
        const base = { table: 'log', name: 'Amount', window: 3 };
        expect(aggregate(rows, { ...base, agg: 'latest' as const })).toBe(5);
        expect(
            aggregate(rows, { ...base, agg: 'nth' as const, index: 2 }),
        ).toBe(4);
        expect(
            aggregate(rows, { ...base, agg: 'avg' as const, window: 2 }),
        ).toBeCloseTo(4.5);
    });

    it('applies windows to non-numeric modes', () => {
        const base = { table: 'log', name: 'Status', agg: 'count' as const };
        expect(
            singleValue(rows, {
                ...base,
                valueAggregation: 'latest' as const,
                window: 3,
                windowDir: 'first' as const,
            }),
        ).toBe('Closed');
        expect(
            singleValue(rows, {
                ...base,
                valueAggregation: 'count' as const,
                window: 2,
            }),
        ).toBe(2);
        expect(
            singleValue(rows, {
                ...base,
                valueAggregation: 'nth' as const,
                index: 2,
                window: 3,
            }),
        ).toBe('Paused');
    });

    it('scopedRows respects window and direction', () => {
        const wf = { table: 'log', name: 'Amount', agg: 'sum' as const };
        expect(scopedRows(rows, { ...wf, window: 2 })).toHaveLength(2);
        expect(
            scopedRows(rows, { ...wf, window: 2, windowDir: 'first' as const }),
        ).toEqual([rows[0], rows[1]]);
        expect(scopedRows(rows, wf)).toHaveLength(5);
        expect(scopedRows(rows, { ...wf, window: 0 })).toHaveLength(5);
        expect(scopedRows(rows, { ...wf, window: -1 })).toHaveLength(5);
    });

    it('labels include window and nth info', () => {
        const base = { table: 'log', name: 'Amount' };
        expect(measureLabel({ ...base, agg: 'sum' as const, window: 2 })).toBe(
            'Somme de Amount (derniers 2 lignes)',
        );
        expect(
            measureLabel({
                ...base,
                agg: 'sum' as const,
                window: 2,
                windowDir: 'first' as const,
            }),
        ).toBe('Somme de Amount (premiers 2 lignes)');
        expect(measureLabel({ ...base, agg: 'nth' as const, index: 2 })).toBe(
            'Valeur N°2 de Amount',
        );
        expect(
            singleValueLabel(
                {
                    table: 'log',
                    name: 'LoggedAt',
                    agg: 'count' as const,
                    valueAggregation: 'nth' as const,
                    index: 3,
                },
                'date',
            ),
        ).toBe('Valeur N°3 de LoggedAt');
    });

    it('normalizes index, window and windowDir on well fields', () => {
        expect(
            normalizeWellField({
                table: 'log',
                name: 'Amount',
                agg: 'sum',
                index: 2,
                window: 10,
                windowDir: 'first',
            }),
        ).toMatchObject({ index: 2, window: 10, windowDir: 'first' });
        expect(
            normalizeWellField({
                table: 'log',
                name: 'Amount',
                agg: 'sum',
                index: 0,
            }),
        ).not.toHaveProperty('index');
        expect(
            normalizeWellField({
                table: 'log',
                name: 'Amount',
                agg: 'sum',
                window: -3,
            }),
        ).not.toHaveProperty('window');
        expect(
            normalizeWellField({
                table: 'log',
                name: 'Amount',
                agg: 'sum',
                index: 'abc',
            }),
        ).not.toHaveProperty('index');
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

describe('DAX comparison operators and string literals', () => {
    it('compares numbers', () => {
        expect(evaluateMeasure('Total = 5 = 5', [])).toEqual({ value: 1 });
        expect(evaluateMeasure('Total = 5 <> 5', [])).toEqual({ value: 0 });
        expect(evaluateMeasure('Total = 3 < 5', [])).toEqual({ value: 1 });
        expect(evaluateMeasure('Total = 5 > 6', [])).toEqual({ value: 0 });
        expect(evaluateMeasure('Total = 3 <= 3', [])).toEqual({ value: 1 });
        expect(evaluateMeasure('Total = 3 >= 4', [])).toEqual({ value: 0 });
    });

    it('compares string literals case-insensitively', () => {
        expect(evaluateMeasure('Total = "abc" = "abc"', [])).toEqual({
            value: 1,
        });
        expect(evaluateMeasure('Total = "ABC" = "abc"', [])).toEqual({
            value: 1,
        });
        expect(evaluateMeasure('Total = "abc" = "abd"', [])).toEqual({
            value: 0,
        });
        expect(evaluateMeasure('Total = "abc" <> "abd"', [])).toEqual({
            value: 1,
        });
    });
});

describe('DAX IF / AND / OR / TRIM', () => {
    it('evaluates IF branches', () => {
        expect(evaluateMeasure('Total = IF(1 = 1, 10, 20)', [])).toEqual({
            value: 10,
        });
        expect(evaluateMeasure('Total = IF(1 = 2, 10, 20)', [])).toEqual({
            value: 20,
        });
        expect(evaluateMeasure('Total = IF(1 = 1, 7)', [])).toEqual({
            value: 7,
        });
    });

    it('evaluates logical operators and functions', () => {
        expect(
            evaluateMeasure('Total = IF("a" = "a" && 1 < 2, 7, 8)', []),
        ).toEqual({ value: 7 });
        expect(evaluateMeasure('Total = IF(1 = 2 || 3 = 3, 9, 8)', [])).toEqual(
            { value: 9 },
        );
        expect(
            evaluateMeasure('Total = IF(AND(1 = 1, 2 = 2), 5, 6)', []),
        ).toEqual({ value: 5 });
        expect(
            evaluateMeasure('Total = IF(OR(1 = 2, 2 = 2), 5, 6)', []),
        ).toEqual({ value: 5 });
    });

    it('accepts the new functions at validation time', () => {
        const ok =
            validateMeasureExpression(
                'Total = IF(TRIM(" x ") = "x" && 1 > 0, SUM(Amount), 0)',
                ['Amount'],
            ).ok === true;
        expect(ok).toBe(true);
        expect(validateMeasureExpression('Total = SUMX(Sales, 1)').ok).toBe(
            true,
        );
        expect(
            validateMeasureExpression('Total = FILTER(Sales, 1 = 1)').ok,
        ).toBe(true);
    });
});

describe('DAX table iteration (FILTER / SUMX / COUNTX)', () => {
    const stock: TableDef = {
        name: 'stock',
        fields: [
            { table: 'stock', name: 'Code', type: 'text' },
            { table: 'stock', name: 'Qty', type: 'number' },
            { table: 'stock', name: 'Active', type: 'text' },
        ],
        rows: [
            { Code: 'A', Qty: 10, Active: 'Y' },
            { Code: 'B', Qty: 5, Active: 'N' },
            { Code: 'C', Qty: 2, Active: 'Y' },
        ],
    };

    it('filters rows and counts with COUNTROWS', () => {
        setTables([stock]);
        expect(
            evaluateMeasure(
                'Total = COUNTROWS(FILTER(stock, stock[Active] = "Y"))',
                [],
            ),
        ).toEqual({ value: 2 });
        expect(evaluateMeasure('Total = COUNTROWS(stock)', [])).toEqual({
            value: 3,
        });
    });

    it('aggregates an expression per row with SUMX / COUNTX', () => {
        setTables([stock]);
        expect(evaluateMeasure('Total = SUMX(stock, stock[Qty])', [])).toEqual({
            value: 17,
        });
        expect(
            evaluateMeasure(
                'Total = SUMX(FILTER(stock, stock[Active] = "Y"), stock[Qty])',
                [],
            ),
        ).toEqual({ value: 12 });
        expect(
            evaluateMeasure(
                'Total = COUNTX(stock, IF(stock[Active] = "Y", stock[Code], ""))',
                [],
            ),
        ).toEqual({ value: 2 });
        expect(evaluateMeasure('Total = MAXX(stock, stock[Qty])', [])).toEqual({
            value: 10,
        });
    });
});

describe('chain -> distinct styles (codestyle[StyleCode], filtered by chain)', () => {
    const pad = (s: string, n: number) => s.padEnd(n, ' ');
    const taging: TableDef = {
        name: 'taging_reel',
        fields: [
            { table: 'taging_reel', name: 'MONo', type: 'text' },
            { table: 'taging_reel', name: 'ProdGroup', type: 'text' },
        ],
        rows: [
            { MONo: pad('4524091437', 15), ProdGroup: pad('CH10', 40) },
            { MONo: pad('4524093564', 15), ProdGroup: pad('CH10', 40) },
            { MONo: pad('4524091437', 15), ProdGroup: pad('Departage', 40) },
            { MONo: pad('4524093564', 15), ProdGroup: pad('Departage', 40) },
            { MONo: pad('4524153967', 15), ProdGroup: pad('Departage', 40) },
            { MONo: pad('4524154323', 15), ProdGroup: pad('Departage', 40) },
            { MONo: pad('4524287160', 15), ProdGroup: pad('Departage', 40) },
            { MONo: pad('4524736457', 15), ProdGroup: pad('Departage', 40) },
            { MONo: pad('4524757987', 15), ProdGroup: pad('Departage', 40) },
            { MONo: pad('4524757991', 15), ProdGroup: pad('Departage', 40) },
            { MONo: pad('4524418026', 15), ProdGroup: pad('Departage', 40) },
            { MONo: pad('1140342334', 15), ProdGroup: pad('DEP-J', 40) },
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

    const formula = 'Nb Styles = DISTINCTCOUNT(codestyle[StyleCode])';

    it('counts distinct styles in the codestyle table (global = 4)', () => {
        setTables([taging, codestyle]);
        const result = evaluateMeasure(formula, []);
        expect(result).toEqual({ value: 4 });
        expect(result.error).toBeUndefined();
    });

    it('resolves CH10 to 1 distinct style (311837) once codestyle is chain-filtered', () => {
        // The store feeds the filtered tables into the engine: taging is
        // reduced to the CH10 rows, which propagates to codestyle via MONo.
        const ch10MOns = new Set(
            taging.rows
                .filter((r) => String(r.ProdGroup ?? '').trim() === 'CH10')
                .map((r) => String(r.MONo).trim()),
        );
        const ch10Codestyle: TableDef = {
            ...codestyle,
            rows: codestyle.rows.filter((r) =>
                ch10MOns.has(String(r.SONo).trim()),
            ),
        };
        setTables([ch10Codestyle]);
        const result = evaluateMeasure(formula, []);
        expect(result).toEqual({ value: 1 });
    });

    it('shows raw equality fails on the padded keys and TRIM fixes it', () => {
        setTables([taging, codestyle]);
        // MONo is padded to 15 chars; an unpadded literal never matches.
        expect(
            evaluateMeasure(
                'Total = COUNTROWS(FILTER(taging_reel, taging_reel[MONo] = "4524153967"))',
                [],
            ),
        ).toEqual({ value: 0 });
        expect(
            evaluateMeasure(
                'Total = COUNTROWS(FILTER(taging_reel, TRIM(taging_reel[MONo]) = "4524153967"))',
                [],
            ),
        ).toEqual({ value: 1 });
    });

    it('lists the tables the formula depends on (codestyle only)', () => {
        setTables([taging, codestyle]);
        const refs = measureColumnRefs(formula);
        expect(refs.some((r) => r.column === 'StyleCode')).toBe(true);
        // No taging / qte_depart leg in the expression; the chain scoping
        // comes from the filtered tables the store feeds the engine.
        expect(refs.some((r) => r.column === 'MONo')).toBe(false);
        expect(refs.some((r) => r.column === 'OF_No')).toBe(false);
    });
});

describe('VALUES list measures (style codes)', () => {
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

    const formula = 'Style Codes = VALUES(codestyle[StyleCode])';

    it('returns the distinct style codes as a list (global)', () => {
        setTables([codestyle]);
        const fn = compileListMeasure(formula);
        expect(fn).not.toBeNull();
        expect(fn!([], {})).toEqual(['302806', '311837', '340497', '348049']);
    });

    it('scopes the codes to the filtered (per-chain) table set', () => {
        // The store feeds the engine the chain-filtered tables: codestyle
        // reduced to the rows linked to CH10 (via MONo/SONo), i.e. 311837.
        const ch10: TableDef = {
            ...codestyle,
            rows: codestyle.rows.filter((r) =>
                ['4524091437', '4524093564'].includes(String(r.SONo)),
            ),
        };
        setTables([ch10]);
        const fn = compileListMeasure(formula)!;
        expect(fn([], {})).toEqual(['311837']);
    });

    it('registers and exposes list measures', () => {
        setTables([codestyle]);
        registerMeasure('Style Codes', formula);
        registerMeasure(
            'Nb Styles',
            'Nb Styles = DISTINCTCOUNT(codestyle[StyleCode])',
        );
        expect(isListMeasure('Style Codes')).toBe(true);
        expect(isListMeasure('Nb Styles')).toBe(false);
        expect(listMeasureValue([], 'Style Codes')).toEqual([
            '302806',
            '311837',
            '340497',
            '348049',
        ]);
        expect(listMeasureValue([], 'Nb Styles')).toEqual([]);
        unregisterMeasure('Style Codes');
        unregisterMeasure('Nb Styles');
    });

    it('validates a VALUES measure without a missing-function error', () => {
        setTables([codestyle]);
        const result = validateMeasureExpression(formula, ['StyleCode'], []);
        expect(result).toEqual({ ok: true });
    });

    it('rejects VALUES nested in a scalar context', () => {
        setTables([codestyle]);
        const result = evaluateMeasure(
            'Total = SUM(VALUES(codestyle[StyleCode]))',
            [],
        );
        expect(result.value).toBe(0);
        expect(result.error).toBeTruthy();
    });

    it('parses and evaluates VALUES(FILTER(...)[Column]) (global)', () => {
        const taging: TableDef = {
            name: 'taging_reel',
            fields: [
                { table: 'taging_reel', name: 'MONo', type: 'text' },
                { table: 'taging_reel', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                {
                    MONo: '4524091437'.padEnd(15, ' '),
                    ProdGroup: 'CH10'.padEnd(40, ' '),
                },
                {
                    MONo: '4524153967'.padEnd(15, ' '),
                    ProdGroup: 'Departage'.padEnd(40, ' '),
                },
                {
                    MONo: '4524736457'.padEnd(15, ' '),
                    ProdGroup: 'Departage'.padEnd(40, ' '),
                },
                {
                    MONo: '4524757987'.padEnd(15, ' '),
                    ProdGroup: 'Departage'.padEnd(40, ' '),
                },
                {
                    MONo: '1140342334'.padEnd(15, ' '),
                    ProdGroup: 'DEP-J'.padEnd(40, ' '),
                },
            ],
        };
        setTables([taging, codestyle]);
        const formula =
            'Style Codes = VALUES(FILTER(codestyle, COUNTROWS(FILTER(taging_reel, TRIM(taging_reel[MONo]) = TRIM(codestyle[SONo]))) > 0)[StyleCode])';
        const fn = compileListMeasure(formula);
        expect(fn).not.toBeNull();
        expect(fn!([], {})).toEqual(['302806', '311837', '340497', '348049']);
    });

    it('scopes VALUES(FILTER(...)[Column]) to the chain-filtered taging_reel', () => {
        const taging: TableDef = {
            name: 'taging_reel',
            fields: [
                { table: 'taging_reel', name: 'MONo', type: 'text' },
                { table: 'taging_reel', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                {
                    MONo: '4524091437'.padEnd(15, ' '),
                    ProdGroup: 'CH10'.padEnd(40, ' '),
                },
                {
                    MONo: '4524093564'.padEnd(15, ' '),
                    ProdGroup: 'CH10'.padEnd(40, ' '),
                },
            ],
        };
        // codestyle is left FULL: the chain scoping must come from the explicit
        // in-measure join on taging_reel, not from pre-filtered codestyle rows.
        setTables([taging, codestyle]);
        const formula =
            'Style Codes = VALUES(FILTER(codestyle, COUNTROWS(FILTER(taging_reel, TRIM(taging_reel[MONo]) = TRIM(codestyle[SONo]))) > 0)[StyleCode])';
        const fn = compileListMeasure(formula)!;
        expect(fn([], {})).toEqual(['311837']);
    });

    it('returns an empty list for a chain with no matching codestyle rows', () => {
        const taging: TableDef = {
            name: 'taging_reel',
            fields: [
                { table: 'taging_reel', name: 'MONo', type: 'text' },
                { table: 'taging_reel', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                {
                    MONo: '1140342334'.padEnd(15, ' '),
                    ProdGroup: 'DEP-J'.padEnd(40, ' '),
                },
            ],
        };
        setTables([taging, codestyle]);
        const formula =
            'Style Codes = VALUES(FILTER(codestyle, COUNTROWS(FILTER(taging_reel, TRIM(taging_reel[MONo]) = TRIM(codestyle[SONo]))) > 0)[StyleCode])';
        const fn = compileListMeasure(formula)!;
        expect(fn([], {})).toEqual([]);
    });

    it('validates the extracted column of a VALUES(FILTER(...)[Column]) measure', () => {
        setTables([codestyle]);
        const formula =
            'Style Codes = VALUES(FILTER(codestyle, COUNTROWS(FILTER(taging_reel, TRIM(taging_reel[MONo]) = TRIM(codestyle[SONo]))) > 0)[StyleCode])';
        // Bare FILTER bases are table names: they must resolve without being
        // columns. Register both tables so taging_reel/codestyle are known.
        const taging: TableDef = {
            name: 'taging_reel',
            fields: [
                { table: 'taging_reel', name: 'MONo', type: 'text' },
                { table: 'taging_reel', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                {
                    MONo: '4524091437'.padEnd(15, ' '),
                    ProdGroup: 'CH10'.padEnd(40, ' '),
                },
            ],
        };
        setTables([taging, codestyle]);
        expect(
            validateMeasureExpression(
                formula,
                ['StyleCode', 'SONo', 'MONo'],
                [],
            ),
        ).toEqual({ ok: true });
        expect(
            validateMeasureExpression(formula, ['SONo', 'MONo'], []),
        ).toEqual({ ok: false, error: 'Colonne « StyleCode » introuvable.' });
    });

    it('narrows to CH10 through the store pipeline in BOTH interaction orders', () => {
        // Faithful to the real layout: the `chain` custom filter maps
        // taging_reel → ProdGroup (codestyle is NOT a chain column, so it is
        // never reduced by the filter — matching the missing graph edge).
        const taging: TableDef = {
            name: 'taging_reel',
            fields: [
                { table: 'taging_reel', name: 'MONo', type: 'text' },
                { table: 'taging_reel', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                {
                    MONo: '4524091437'.padEnd(15, ' '),
                    ProdGroup: 'CH10'.padEnd(40, ' '),
                },
                {
                    MONo: '4524093564'.padEnd(15, ' '),
                    ProdGroup: 'CH10'.padEnd(40, ' '),
                },
                {
                    MONo: '4524153967'.padEnd(15, ' '),
                    ProdGroup: 'Departage'.padEnd(40, ' '),
                },
                {
                    MONo: '4524736457'.padEnd(15, ' '),
                    ProdGroup: 'Departage'.padEnd(40, ' '),
                },
                {
                    MONo: '4524757987'.padEnd(15, ' '),
                    ProdGroup: 'Departage'.padEnd(40, ' '),
                },
            ],
        };
        const chainInactive: ReportFilter = {
            kind: 'custom',
            type: 'list',
            column: 'chain',
            label: 'chain',
            scope: 'report',
            values: [],
            columns: [
                { table: 'taging_reel', column: 'ProdGroup', values: [] },
            ],
        };
        const chainActive: ReportFilter = {
            kind: 'custom',
            type: 'list',
            column: 'chain',
            label: 'chain',
            scope: 'report',
            values: [],
            columns: [
                { table: 'taging_reel', column: 'ProdGroup', values: ['CH10'] },
            ],
        };
        const tables = [taging, codestyle];
        const apply = (filters: ReportFilter[]) =>
            applyTableRows(tables, filterTableRows(tables, filters));
        const formula =
            'Style Codes = VALUES(FILTER(codestyle, COUNTROWS(FILTER(taging_reel, TRIM(taging_reel[MONo]) = TRIM(codestyle[SONo]))) > 0)[StyleCode])';

        // Order A: chain filter selected first, then the measure is added.
        setTables(apply([chainActive]));
        registerMeasure('Style Codes', formula);
        expect(listMeasureValue([], 'Style Codes')).toEqual(['311837']);

        // Order B: measure added first, then the chain filter is applied.
        unregisterMeasure('Style Codes');
        setTables(apply([chainInactive]));
        registerMeasure('Style Codes', formula);
        expect(listMeasureValue([], 'Style Codes')).toEqual([
            '302806',
            '311837',
            '340497',
            '348049',
        ]);
        setTables(apply([chainActive]));
        expect(listMeasureValue([], 'Style Codes')).toEqual(['311837']);
        unregisterMeasure('Style Codes');
    });

    it('legacy VALUES(codestyle[StyleCode]) does NOT narrow with the chain filter', () => {
        // With no taging_reel↔codestyle graph edge, codestyle stays full: the
        // old measure always shows every style, which is why the explicit
        // in-measure join is required for chain scoping.
        const taging: TableDef = {
            name: 'taging_reel',
            fields: [
                { table: 'taging_reel', name: 'MONo', type: 'text' },
                { table: 'taging_reel', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                {
                    MONo: '4524091437'.padEnd(15, ' '),
                    ProdGroup: 'CH10'.padEnd(40, ' '),
                },
            ],
        };
        const chainActive: ReportFilter = {
            kind: 'custom',
            type: 'list',
            column: 'chain',
            label: 'chain',
            scope: 'report',
            values: [],
            columns: [
                { table: 'taging_reel', column: 'ProdGroup', values: ['CH10'] },
            ],
        };
        const tables = [taging, codestyle];
        setTables(
            applyTableRows(tables, filterTableRows(tables, [chainActive])),
        );
        registerMeasure(
            'Legacy Codes',
            'Legacy Codes = VALUES(codestyle[StyleCode])',
        );
        expect(listMeasureValue([], 'Legacy Codes')).toEqual([
            '302806',
            '311837',
            '340497',
            '348049',
        ]);
        unregisterMeasure('Legacy Codes');
    });

    it('re-scopes a REGISTERED measure across OFF→ON→OFF→ON filter toggles (no re-drop)', () => {
        // Reproduces the reported symptom: the card evaluates once at drop
        // time then reads stale state. The fix feeds the card the freshly
        // filtered tables on every render, so a plain filter toggle must keep
        // re-scoping without the measure being re-dragged or re-registered.
        const taging: TableDef = {
            name: 'taging_reel',
            fields: [
                { table: 'taging_reel', name: 'MONo', type: 'text' },
                { table: 'taging_reel', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                {
                    MONo: '4524091437'.padEnd(15, ' '),
                    ProdGroup: 'CH10'.padEnd(40, ' '),
                },
                {
                    MONo: '4524093564'.padEnd(15, ' '),
                    ProdGroup: 'CH10'.padEnd(40, ' '),
                },
                {
                    MONo: '4524153967'.padEnd(15, ' '),
                    ProdGroup: 'Departage'.padEnd(40, ' '),
                },
                {
                    MONo: '4524736457'.padEnd(15, ' '),
                    ProdGroup: 'Departage'.padEnd(40, ' '),
                },
                {
                    MONo: '4524757987'.padEnd(15, ' '),
                    ProdGroup: 'Departage'.padEnd(40, ' '),
                },
            ],
        };
        const tables = [taging, codestyle];
        const formula =
            'Style Codes = VALUES(FILTER(codestyle, COUNTROWS(FILTER(taging_reel, TRIM(taging_reel[MONo]) = TRIM(codestyle[SONo]))) > 0)[StyleCode])';

        // Faithful to toggleCustomFilterPooledValue: flipping CH10 in/out of
        // the mapped column always yields a new filter object, so the store
        // recomputes the filtered tables on every click.
        const toggle = (on: boolean): ReportFilter => ({
            kind: 'custom',
            type: 'list',
            column: 'chain',
            label: 'chain',
            scope: 'report',
            values: [],
            columns: [
                {
                    table: 'taging_reel',
                    column: 'ProdGroup',
                    values: on ? ['CH10'] : [],
                },
            ],
        });
        const filtered = (on: boolean) =>
            applyTableRows(tables, filterTableRows(tables, [toggle(on)]));

        registerMeasure('Style Codes', formula);
        try {
            setTables(filtered(false));
            expect(listMeasureValue([], 'Style Codes')).toEqual([
                '302806',
                '311837',
                '340497',
                '348049',
            ]);
            setTables(filtered(true));
            expect(listMeasureValue([], 'Style Codes')).toEqual(['311837']);
            // Toggle OFF must work after it has been ON once (the "frozen
            // until re-drag" symptom).
            setTables(filtered(false));
            expect(listMeasureValue([], 'Style Codes')).toEqual([
                '302806',
                '311837',
                '340497',
                '348049',
            ]);
            // And back ON, still without re-registering.
            setTables(filtered(true));
            expect(listMeasureValue([], 'Style Codes')).toEqual(['311837']);
        } finally {
            unregisterMeasure('Style Codes');
        }
    });
});

describe('listTreatment (list-aggregation)', () => {
    const mixed = ['302806', '311837', '340497', '340497 AW25'];
    const allNumeric = ['302806', '311837', '340497'];

    it('returns the full list when no mode is given', () => {
        expect(listTreatment(mixed)).toBeNull();
    });

    it('counts every code for count/distinct regardless of type', () => {
        expect(listTreatment(mixed, 'count')).toBe('4');
        expect(listTreatment(mixed, 'distinct')).toBe('4');
    });

    it('selects a single code for first/latest/raw/nth', () => {
        expect(listTreatment(mixed, 'first')).toBe('302806');
        expect(listTreatment(mixed, 'latest')).toBe('340497 AW25');
        expect(listTreatment(mixed, 'raw')).toBe('302806');
        expect(listTreatment(mixed, 'nth', 2)).toBe('311837');
    });

    it('ignores non-numeric codes for numeric modes', () => {
        const total = 302806 + 311837 + 340497;
        expect(listTreatment(mixed, 'sum')).toBe(String(total));
        expect(listTreatment(mixed, 'avg')).toBe(String(total / 3));
        expect(listTreatment(mixed, 'min')).toBe('302806');
        expect(listTreatment(mixed, 'max')).toBe('340497');
    });

    it('reports how many codes a numeric mode will ignore', () => {
        expect(listAggIgnoredCount(mixed, 'sum')).toBe(1);
        expect(listAggIgnoredCount(allNumeric, 'avg')).toBe(0);
        expect(listAggIgnoredCount(mixed, 'count')).toBe(0);
        expect(listAggIgnoredCount(mixed, undefined)).toBe(0);
    });

    it('returns null when numeric mode meets no numeric code', () => {
        expect(listTreatment(['340497 AW25', 'STYLE X'], 'sum')).toBeNull();
        expect(listTreatment([], 'sum')).toBeNull();
    });
});

describe('buildTableCells — per-row list (W1-12/14)', () => {
    const employees: TableDef = {
        name: 'employees',
        fields: [
            { table: 'employees', name: 'Id', type: 'text' },
            { table: 'employees', name: 'Name', type: 'text' },
        ],
        rows: [
            { Id: 'E1', Name: 'Ada' },
            { Id: 'E2', Name: 'No data' },
        ],
    };
    const orders: TableDef = {
        name: 'employee_data',
        fields: [
            { table: 'employee_data', name: 'EmpId', type: 'text' },
            { table: 'employee_data', name: 'OrderId', type: 'text' },
        ],
        rows: [
            { EmpId: 'E1', OrderId: 'B2' },
            { EmpId: 'E1', OrderId: 'B1' },
            { EmpId: 'E1', OrderId: 'B1' },
        ],
    };
    const graph: RelationGraph = {
        edges: [
            {
                a: 'employees',
                b: 'employee_data',
                columns: [{ colA: 'Id', colB: 'EmpId' }],
                kind: 'fk_pk',
                confidence: 1,
            },
        ],
    };
    const axis: WellField = { table: 'employees', name: 'Id', agg: 'sum' };

    it('each employee row shows exactly that employee’s distinct orders', () => {
        setTables([structuredClone(employees), structuredClone(orders)]);
        registerMeasure(
            'My Orders',
            'My Orders = VALUES(employee_data[OrderId])',
        );
        const value: WellField = {
            table: 'employee_data',
            name: 'My Orders',
            agg: 'count',
        };
        const { data, series } = buildTableCells(
            employees.rows,
            [axis],
            [],
            [value],
            graph,
        );
        expect(series).toEqual(['My Orders']);
        const byEmp = Object.fromEntries(
            data.map((d) => [String(d['category']), d['My Orders']]),
        );
        expect(byEmp['E1']).toEqual(['B1', 'B2']);
        expect(byEmp['E2']).toEqual([]);
        unregisterMeasure('My Orders');
    });

    it('a numeric measure value keeps the per-group aggregation', () => {
        setTables([structuredClone(employees), structuredClone(orders)]);
        registerMeasure('Order Count', 'Order Count = COUNTROWS(employee_data)');
        const value: WellField = {
            table: 'employee_data',
            name: 'Order Count',
            agg: 'count',
        };
        const { data } = buildTableCells(employees.rows, [axis], [], [value], graph);
        const byEmp = Object.fromEntries(
            data.map((d) => [String(d['category']), d['Order Count']]),
        );
        expect(byEmp['E1']).toBe(3);
        expect(byEmp['E2']).toBe(0);
        unregisterMeasure('Order Count');
    });

    it('a list measure with no axis yields the global list (W1-13)', () => {
        setTables([structuredClone(employees), structuredClone(orders)]);
        registerMeasure('My Orders', 'My Orders = VALUES(employee_data[OrderId])');
        const value: WellField = {
            table: 'employee_data',
            name: 'My Orders',
            agg: 'count',
        };
        const { data, series } = buildTableCells(
            employees.rows,
            [],
            [],
            [value],
            graph,
        );
        expect(series).toEqual(['My Orders']);
        expect(data).toEqual([{ category: 'Total', 'My Orders': ['B1', 'B2'] }]);
        unregisterMeasure('My Orders');
    });

    it('a VALUES measure is only treated as a list once registered (guard)', () => {
        setTables([structuredClone(employees), structuredClone(orders)]);
        expect(isListMeasure('My Orders')).toBe(false);
        registerMeasure('My Orders', 'My Orders = VALUES(employee_data[OrderId])');
        expect(isListMeasure('My Orders')).toBe(true);
        unregisterMeasure('My Orders');
        expect(isListMeasure('My Orders')).toBe(false);
    });
});

describe('measure validation — full expression (dialog path)', () => {
    it('accepts comparison = inside a formula (previously mis-split)', () => {
        const stock: TableDef = {
            name: 'stock',
            fields: [
                { table: 'stock', name: 'Code', type: 'text' },
                { table: 'stock', name: 'Qty', type: 'number' },
            ],
            rows: [],
        };
        setTables([stock]);
        const cases = [
            'T = COUNTROWS(FILTER(stock, stock[Qty] = 5))',
            'T = SUMX(FILTER(stock, stock[Code] = "A"), stock[Qty])',
            'T = COUNTROWS(FILTER(stock, TRIM(stock[Code]) = "A"))',
            'T = VALUES(stock[Code])',
            'T = 1 = 1 && 2 > 1',
        ];
        for (const c of cases) {
            expect(validateMeasureExpression(c, ['Code', 'Qty']).ok).toBe(true);
        }
    });

    it('reports a missing column on the LEFT side of a =', () => {
        setTables([]);
        const r = validateMeasureExpression(
            'T = COUNTROWS(FILTER(stock, stock[Gone] = 5))',
            ['Qty'],
        );
        expect(r.ok).toBe(false);
    });
});

describe('scalar functions', () => {
    it('math functions evaluate', () => {
        expect(evaluateMeasure('X = ABS(-5)', [])).toEqual({ value: 5 });
        expect(evaluateMeasure('X = MOD(17, 5)', [])).toEqual({ value: 2 });
        expect(evaluateMeasure('X = POWER(2, 3)', [])).toEqual({ value: 8 });
        expect(evaluateMeasure('X = SQRT(16)', [])).toEqual({ value: 4 });
        expect(evaluateMeasure('X = ROUND(3.14159, 2)', [])).toEqual({
            value: 3.14,
        });
        expect(evaluateMeasure('X = INT(3.9)', [])).toEqual({ value: 3 });
        expect(evaluateMeasure('X = SIGN(-7)', [])).toEqual({ value: -1 });
        expect(evaluateMeasure('X = DIVIDE(10, 2)', [])).toEqual({ value: 5 });
        expect(evaluateMeasure('X = DIVIDE(10, 0, 99)', [])).toEqual({
            value: 99,
        });
    });

    it('supports the % (modulo) operator', () => {
        expect(evaluateMeasure('X = 17 % 5', [])).toEqual({ value: 2 });
    });

    it('string functions evaluate', () => {
        expect(evaluateMeasure('X = LEN("hello")', [])).toEqual({ value: 5 });
        expect(evaluateMeasure('X = UPPER("abc")', [])).toEqual({ value: 0 });
        expect(evaluateMeasure('X = CONCATENATE("a", "b")', [])).toEqual({
            value: 0,
        });
    });

    it('validates every newly supported function', () => {
        const bodies = [
            'NOT(1 = 2)',
            'IFERROR(1 / 0, 5)',
            'SWITCH(1, 1, "A", 2, "B", "C")',
            'LEN("x")',
            'UPPER("x")',
            'LEFT("abc", 1)',
            'RIGHT("abc", 1)',
            'MID("abc", 2, 1)',
            'SUBSTITUTE("a-b", "-", ":")',
            'SEARCH("b", "abc")',
            'VALUE("42")',
            'FORMAT(1.5)',
            'YEAR(DATE(2020, 5, 1))',
            'MONTH(DATE(2020, 5, 1))',
            'DAY(DATE(2020, 5, 15))',
            'EOMONTH(DATE(2020, 2, 1), 0)',
            'DATEDIFF(DATE(2020, 1, 1), DATE(2020, 1, 3), "DAY")',
        ];
        for (const body of bodies)
            expect(validateMeasureExpression(`X = ${body}`).ok).toBe(true);
    });

    it('evaluates MOD via the function form', () => {
        expect(evaluateMeasure('X = MOD(17, 5)', [])).toEqual({ value: 2 });
    });
});

describe('listMeasureSource', () => {
    it('extracts the column from a plain VALUES list', () => {
        expect(
            listMeasureSource('Values = VALUES(codestyle[StyleCode])'),
        ).toEqual({
            table: 'codestyle',
            column: 'StyleCode',
        });
    });

    it('resolves the base table of a FILTER-wrapped VALUES list', () => {
        expect(
            listMeasureSource(
                'X = VALUES(FILTER(codestyle, COUNTROWS(FILTER(taging_reel, TRIM(taging_reel[MONo]) = TRIM(codestyle[SONo]))) > 0)[StyleCode])',
            ),
        ).toEqual({ table: 'codestyle', column: 'StyleCode' });
    });

    it('returns null for a scalar measure', () => {
        expect(listMeasureSource('X = SUM(codestyle[Qty])')).toBeNull();
    });
});

describe('IN / NOT IN predicates (Wave 2)', () => {
    const orders: TableDef = {
        name: 'orders',
        fields: [
            { table: 'orders', name: 'Id', type: 'text' },
            { table: 'orders', name: 'Status', type: 'text' },
            { table: 'orders', name: 'Qty', type: 'number' },
        ],
        rows: [
            { Id: 'A', Status: 'open', Qty: 5 },
            { Id: 'B', Status: 'open', Qty: 7 },
            { Id: 'C', Status: 'closed', Qty: 2 },
            { Id: 'D', Status: 'pending', Qty: 9 },
        ],
    };

    beforeEach(() => setTables([orders]));

    it('IN {…} keeps the matching rows', () => {
        const r = evaluateMeasure(
            "M = COUNTROWS(FILTER(orders, TRIM(orders[Status]) IN {'open', 'closed'}))",
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(3);
    });

    it('NOT IN {…} excludes the matching rows', () => {
        const r = evaluateMeasure(
            "M = COUNTROWS(FILTER(orders, TRIM(orders[Status]) NOT IN {'open'}))",
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(2);
    });

    it('IN accepts numeric literals', () => {
        const r = evaluateMeasure(
            'M = COUNTROWS(FILTER(orders, TRIM(orders[Qty]) IN {5, 9}))',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(2);
    });

    it("unescapes doubled quotes in string literals (O''Brien)", () => {
        const crew: TableDef = {
            name: 'crew',
            fields: [{ table: 'crew', name: 'Name', type: 'text' }],
            rows: [{ Name: "O'Brien" }, { Name: 'smith' }],
        };
        setTables([orders, crew]);
        const r = evaluateMeasure(
            "M = COUNTROWS(FILTER(crew, TRIM(crew[Name]) = 'O''Brien'))",
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(1);
    });

    it('resolves a base-table column condition through the row context', () => {
        const employees: TableDef = {
            name: 'employees',
            fields: [
                { table: 'employees', name: 'Id', type: 'text' },
                { table: 'employees', name: 'Team', type: 'text' },
            ],
            rows: [
                { Id: 'E1', Team: 'A' },
                { Id: 'E2', Team: 'B' },
            ],
        };
        const ordersTable: TableDef = {
            name: 'orders',
            fields: [
                { table: 'orders', name: 'EmpId', type: 'text' },
                { table: 'orders', name: 'No', type: 'text' },
            ],
            rows: [
                { EmpId: 'E1', No: 'O1' },
                { EmpId: 'E1', No: 'O2' },
                { EmpId: 'E2', No: 'O3' },
            ],
        };
        setTables([employees, ordersTable]);
        const fn = compileListMeasure(
            "M = VALUES(FILTER(orders, TRIM(orders[EmpId]) = TRIM(employees[Id]) && TRIM(employees[Team]) = 'A')[No])",
        );
        expect(fn).not.toBeNull();
        expect(
            fn!([], { iter: [{ table: 'employees', row: { Id: 'E1', Team: 'A' } }] }),
        ).toEqual(['O1', 'O2']);
        expect(
            fn!([], { iter: [{ table: 'employees', row: { Id: 'E2', Team: 'B' } }] }),
        ).toEqual([]);
    });
});

describe('time windows (Wave 2 — W2-2)', () => {
    const sales: TableDef = {
        name: 'sales',
        fields: [
            { table: 'sales', name: 'Date', type: 'text' },
            { table: 'sales', name: 'Amount', type: 'number' },
        ],
        rows: [
            { Date: '2025-06-10', Amount: 100 },
            { Date: '2025-11-25', Amount: 200 },
            { Date: '2026-01-15', Amount: 10 },
            { Date: '2026-02-10', Amount: 20 },
            { Date: '2026-03-05', Amount: 30 },
            { Date: '2026-07-20', Amount: 40 },
            { Date: '2026-08-15', Amount: 50 },
        ],
    };

    beforeEach(() => setTables([sales]));

    it('DATESYTD slices the year-to-date window around the max loaded date', () => {
        const r = evaluateMeasure('M = COUNTROWS(DATESYTD(sales[Date]))', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(5);
    });

    it('TOTALYTD sums the wrapped expression over the YTD window', () => {
        const r = evaluateMeasure(
            'M = TOTALYTD(SUM(sales[Amount]), sales[Date])',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(150);
    });

    it('TOTALMTD sums only the current month', () => {
        const r = evaluateMeasure(
            'M = TOTALMTD(SUM(sales[Amount]), sales[Date])',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(50);
    });

    it('DATESQTD slices the quarter-to-date window around the anchor', () => {
        const r = evaluateMeasure('M = COUNTROWS(DATESQTD(sales[Date]))', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(2); // 2026-07-20, 2026-08-15 (Q3)
    });

    it('TOTALQTD sums the wrapped expression over the current quarter', () => {
        const r = evaluateMeasure(
            'M = TOTALQTD(SUM(sales[Amount]), sales[Date])',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(90); // 40 + 50
    });

    it('PREVIOUSMONTH returns the calendar month before the anchor', () => {
        const r = evaluateMeasure(
            'M = COUNTROWS(PREVIOUSMONTH(sales[Date]))',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(1);
    });

    it('SAMEPERIODLASTYEAR shifts the YTD window back one year', () => {
        const r = evaluateMeasure(
            'M = COUNTROWS(SAMEPERIODLASTYEAR(sales[Date]))',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(1);
    });

    it('DATEADD shifts the window by n×unit', () => {
        const r = evaluateMeasure(
            'M = SUMX(DATEADD(sales[Date], -1, "YEAR"), sales[Amount])',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(100);
    });

    it('iterator functions consume the window frames', () => {
        const r = evaluateMeasure(
            'M = SUMX(DATESYTD(sales[Date]), sales[Amount])',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(150);
    });

    it('accepts a bare date column (table inferred)', () => {
        const r = evaluateMeasure('M = COUNTROWS(DATESYTD(Date))', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(5);
    });

    it('a bare column table arg still returns the full table', () => {
        const r = evaluateMeasure('M = COUNTROWS(sales[Date])', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(7);
    });

    it('anchor respects the current row context (ctx.tables)', () => {
        const filter: ReportFilter = {
            column: 'Date',
            table: 'sales',
            values: ['2025-06-10', '2025-11-25'],
            scope: 'report',
            type: 'list',
        };
        const fn = compileMeasure('M = COUNTROWS(DATESYTD(sales[Date]))');
        const ctx = {
            tables: applyTableRows([sales], filterTableRows([sales], [filter])),
        };
        expect(fn([], ctx)).toBe(2);
    });

    it('missing or non-column date args fail loudly, not silently', () => {
        expect(
            evaluateMeasure('M = COUNTROWS(DATESYTD(sales[Gone]))', []).error,
        ).toBeTruthy();
        expect(evaluateMeasure('M = DATESYTD(123)', []).error).toBeTruthy();
    });
});

describe('time windows on month-granularity dates (YYYY-MM)', () => {
    const kpi: TableDef = {
        name: 'kpi_br_print',
        fields: [
            { table: 'kpi_br_print', name: 'mois', type: 'text' },
            { table: 'kpi_br_print', name: 'nb_rejets', type: 'number' },
        ],
        rows: [
            { mois: '2026-01', nb_rejets: 1 },
            { mois: '2026-02', nb_rejets: 3 },
            { mois: '2026-03', nb_rejets: 6 },
            { mois: '2026-04', nb_rejets: 2 },
            { mois: '2026-05', nb_rejets: 4 },
            { mois: '2026-06', nb_rejets: 5 },
            { mois: '2026-07', nb_rejets: 3 },
            { mois: '2026-08', nb_rejets: 0 },
        ],
    };

    beforeEach(() => setTables([kpi]));

    it('DATESYTD covers every month row (anchor = 2026-08-01)', () => {
        const r = evaluateMeasure('M = COUNTROWS(DATESYTD(kpi_br_print[mois]))', []);
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(8);
    });

    it('TOTALYTD sums nb_rejets across the whole YTD window', () => {
        const r = evaluateMeasure(
            'M = TOTALYTD(SUM(kpi_br_print[nb_rejets]), kpi_br_print[mois])',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(24);
    });

    it('TOTALMTD keeps only the anchor month row', () => {
        const r = evaluateMeasure(
            'M = TOTALMTD(SUM(kpi_br_print[nb_rejets]), kpi_br_print[mois])',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(0);
    });

    it('DATESQTD covers the anchor quarter rows (Q3: July + August 2026)', () => {
        const r = evaluateMeasure(
            'M = COUNTROWS(DATESQTD(kpi_br_print[mois]))',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(2);
    });

    it('TOTALQTD sums nb_rejets across the current quarter', () => {
        const r = evaluateMeasure(
            'M = TOTALQTD(SUM(kpi_br_print[nb_rejets]), kpi_br_print[mois])',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(3); // July (3) + August (0)
    });

    it('PREVIOUSMONTH selects the previous calendar month', () => {
        const r = evaluateMeasure(
            'M = COUNTROWS(PREVIOUSMONTH(kpi_br_print[mois]))',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(1);
    });

    it('SAMEPERIODLASTYEAR returns zero rows when no prior-year data exists', () => {
        const r = evaluateMeasure(
            'M = COUNTROWS(SAMEPERIODLASTYEAR(kpi_br_print[mois]))',
            [],
        );
        expect(r.error).toBeUndefined();
        expect(r.value).toBe(0);
    });
});

describe('wave 3 — CALCULATE(ALL), % of total, TOPN/RANK, Cumul, CONCATENATEX, IF (W3-1…W3-6)', () => {
    const sales: TableDef = {
        name: 'sales',
        fields: [
            { table: 'sales', name: 'Region', type: 'text' },
            { table: 'sales', name: 'Amount', type: 'number' },
            { table: 'sales', name: 'Idx', type: 'number' },
        ],
        rows: [
            { Region: 'North', Amount: 10, Idx: 1 },
            { Region: 'North', Amount: 5, Idx: 1 },
            { Region: 'South', Amount: 7, Idx: 2 },
            { Region: 'East', Amount: 3, Idx: 3 },
            { Region: 'South', Amount: 4, Idx: 4 },
        ],
    };
    const regionCtx = (region: string) => ({
        tables: applyTableRows(
            [sales],
            filterTableRows([sales], [
                {
                    column: 'Region',
                    table: 'sales',
                    values: [region],
                    scope: 'report',
                    type: 'list',
                } satisfies ReportFilter,
            ]),
        ),
    });

    beforeEach(() => setTables([sales]));

    it('W3-1 CALCULATE(SUM, ALL(col)) returns the grand total under a per-group ctx', () => {
        const share = compileMeasure(
            'M = CALCULATE(SUM(sales[Amount]), ALL(sales[Region]))',
        );
        const plain = compileMeasure('M = SUM(sales[Amount])');
        expect(share([], regionCtx('North'))).toBe(29);
        // The same scalar WITHOUT ALL stays inside the group filter.
        expect(plain([], regionCtx('North'))).toBe(15);
    });

    it('W3-1 COUNTROWS(ALL(table)) is not restricted by the group filter', () => {
        const impl = compileMeasure('M = COUNTROWS(ALL(sales))');
        expect(impl([], regionCtx('South'))).toBe(5);
    });

    it('W3-2 per-group % of total shares sum to ~100', () => {
        const pct = compileMeasure(
            'M = DIVIDE(SUM(sales[Amount]), CALCULATE(SUM(sales[Amount]), ALL(sales[Region])), 0) * 100',
        );
        expect(pct([], regionCtx('North'))).toBeCloseTo((15 / 29) * 100);
        expect(pct([], regionCtx('South'))).toBeCloseTo((11 / 29) * 100);
        expect(pct([], regionCtx('East'))).toBeCloseTo((3 / 29) * 100);
        const total =
            pct([], regionCtx('North')) +
            pct([], regionCtx('South')) +
            pct([], regionCtx('East'));
        expect(total).toBeCloseTo(100);
    });

    it('W3-3 SUMX(TOPN(n, …)) picks the top / bottom n rows by direction', () => {
        const desc = evaluateMeasure(
            'M = SUMX(TOPN(2, sales, sales[Amount], DESC), sales[Amount])',
            [],
        );
        expect(desc.error).toBeUndefined();
        expect(desc.value).toBe(17); // 10 + 7
        const asc = evaluateMeasure(
            'M = SUMX(TOPN(2, sales, sales[Amount], ASC), sales[Amount])',
            [],
        );
        expect(asc.error).toBeUndefined();
        expect(asc.value).toBe(7); // 3 + 4
        // Default direction is descending (DAX TOPN).
        const def = evaluateMeasure(
            'M = SUMX(TOPN(2, sales, sales[Amount]), sales[Amount])',
            [],
        );
        expect(def.error).toBeUndefined();
        expect(def.value).toBe(17);
    });

    it('W3-3 RANKX returns the 1-based rank of a value (desc default, ASC opt-in)', () => {
        const r1 = evaluateMeasure('M = RANKX(sales, sales[Amount], 10)', []);
        expect(r1.error).toBeUndefined();
        expect(r1.value).toBe(1);
        const rLast = evaluateMeasure(
            'M = RANKX(sales, sales[Amount], 3)',
            [],
        );
        expect(rLast.value).toBe(5);
        const asc = evaluateMeasure(
            'M = RANKX(sales, sales[Amount], 3, ASC)',
            [],
        );
        expect(asc.value).toBe(1);
    });

    it('W3-4 SUMX(FILTER(index <= n)) is a cumulative total up to the index', () => {
        const upTo2 = evaluateMeasure(
            'M = SUMX(FILTER(sales, sales[Idx] <= 2), sales[Amount])',
            [],
        );
        expect(upTo2.error).toBeUndefined();
        expect(upTo2.value).toBe(22); // 10 + 5 + 7
        const upTo4 = evaluateMeasure(
            'M = SUMX(FILTER(sales, sales[Idx] <= 4), sales[Amount])',
            [],
        );
        expect(upTo4.value).toBe(29);
    });

    it('W3-4 buildTableCells running column accumulates across the numeric axis', () => {
        const { data } = buildTableCells(
            sales.rows,
            [{ table: 'sales', name: 'Idx', agg: 'sum' }],
            [],
            [{ table: 'sales', name: 'Amount', agg: 'sum', running: true }],
        );
        const key = measureLabel({
            table: 'sales',
            name: 'Amount',
            agg: 'sum',
        });
        const nums = data.map((d) => d[key]);
        expect(nums).toEqual([15, 22, 25, 29]);
        // Axis order stays ascending by index.
        expect(data.map((d) => d['category'])).toEqual(['1', '2', '3', '4']);
    });

    it('W3-4 buildChartData running column accumulates (numeric axis ascending)', () => {
        const { data } = buildChartData(
            sales.rows,
            [{ table: 'sales', name: 'Idx', agg: 'sum' }],
            [],
            [{ table: 'sales', name: 'Amount', agg: 'sum', running: true }],
        );
        const key = measureLabel({
            table: 'sales',
            name: 'Amount',
            agg: 'sum',
        });
        expect(data.map((d) => d[key])).toEqual([15, 22, 25, 29]);
    });

    it('W3-3 buildTableCells rank column orders rows by descending value (1..N)', () => {
        const { data } = buildTableCells(
            sales.rows,
            [{ table: 'sales', name: 'Idx', agg: 'sum' }],
            [],
            [{ table: 'sales', name: 'Amount', agg: 'sum', rank: true }],
        );
        const key = measureLabel({
            table: 'sales',
            name: 'Amount',
            agg: 'sum',
        });
        expect(data.map((d) => d[key])).toEqual([1, 2, 3, 4]);
        expect(data.map((d) => d['category'])).toEqual([
            '1', // 15
            '2', // 7
            '4', // 4
            '3', // 3
        ]);
    });

    it('W3-5 CONCATENATEX compiles to a text-list and joins per-frame values', () => {
        const impl = compileListMeasure(
            'M = CONCATENATEX(sales, sales[Region], "; ")',
        );
        expect(impl).not.toBeNull();
        expect(impl!([], {})).toEqual([
            'North; North; South; East; South',
        ]);
        // Respects the group ctx like a VALUES list.
        expect(impl!([], regionCtx('North'))).toEqual(['North; North']);
    });

    it('W3-5 a CONCATENATEX measure registers as a list measure', () => {
        registerMeasure('ConcatRegions', 'ConcatRegions = CONCATENATEX(sales, sales[Region], "; ")');
        expect(isListMeasure('ConcatRegions')).toBe(true);
        expect(listMeasureValue([], 'ConcatRegions')).toEqual([
            'North; North; South; East; South',
        ]);
        unregisterMeasure('ConcatRegions');
    });

    it('W3-6 IF template branches compute per frame inside an iterator', () => {
        const thenOnly = evaluateMeasure(
            "M = SUMX(sales, IF(TRIM(sales[Region]) = 'North', sales[Amount], 0))",
            [],
        );
        expect(thenOnly.error).toBeUndefined();
        expect(thenOnly.value).toBe(15);
        const elseOnly = evaluateMeasure(
            "M = SUMX(sales, IF(TRIM(sales[Region]) <> 'North', sales[Amount], 0))",
            [],
        );
        expect(elseOnly.error).toBeUndefined();
        expect(elseOnly.value).toBe(14); // 29 − 15
    });

    it('W3-5/6 RANKX and CONCATENATEX validate without "non supportée"', () => {
        expect(
            validateMeasureExpression(
                'M = CONCATENATEX(sales, sales[Region], "; ")',
                ['Region'],
            ).ok,
        ).toBe(true);
        expect(
            validateMeasureExpression(
                'M = RANKX(sales, sales[Amount], 1)',
                ['Amount'],
            ).ok,
        ).toBe(true);
    });
});
