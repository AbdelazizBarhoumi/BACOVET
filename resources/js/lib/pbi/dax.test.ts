import { describe, expect, it } from 'vitest';
import {
    applySuggestion,
    bracketMatch,
    completeDax,
    DAX_FUNCTIONS,
    daxCharClasses,
    daxSignature,
} from './dax';
import { setTables, type TableDef } from './model';

const tables: TableDef[] = [
    {
        name: 'Sales',
        fields: [
            { table: 'Sales', name: 'Amount', type: 'number' },
            { table: 'Sales', name: 'Quantity', type: 'number' },
            { table: 'Sales', name: 'Region', type: 'text' },
        ],
        rows: [],
    },
    {
        name: 'Products',
        fields: [
            { table: 'Products', name: 'SKU', type: 'text' },
            { table: 'Products', name: 'Price', type: 'number' },
        ],
        rows: [],
    },
];

const measures = [
    { table: 'Measures', name: 'Total Sales', type: 'number' as const, measure: true, expression: 'Total Sales = SUM(Sales[Amount])' },
];

describe('DAX IntelliSense', () => {
    it('suggests nothing before the = sign or after a closed call', () => {
        expect(
            completeDax('New Measure = ', 'New Measure = '.length, tables, []).suggestions,
        ).not.toHaveLength(0);
        expect(
            completeDax('Total = SUM()', 'Total = SUM()'.length, tables, []).suggestions,
        ).toHaveLength(0);
        expect(completeDax('SUM', 3, tables, []).suggestions).toHaveLength(0);
    });

    it('autocompletes an aggregation first', () => {
        const c = completeDax('New Measure = SU', 'New Measure = SU'.length, tables, []);
        const fn = c.suggestions.find((s) => s.kind === 'function');
        expect(fn?.label).toBe('SUM');
        expect(fn?.insert).toBe('SUM()');
        expect(fn?.cursorAdjust).toBe(-1);
    });

    it('opens [ ] after picking a table', () => {
        const c = completeDax('New Measure = SUM(Sa', 'New Measure = SUM(Sa'.length, tables, []);
        const table = c.suggestions.find((s) => s.kind === 'table');
        expect(table?.label).toBe('Sales');
        expect(table?.insert).toBe('Sales[]');
        expect(table?.cursorAdjust).toBe(-1);
    });

    it('picking a table lands the caret inside the empty brackets', () => {
        const { text, cursor } = applySuggestion(
            'New Measure = SUM(Sa',
            'New Measure = SUM(Sa'.length,
            18,
            'Sales[]',
            -1,
        );
        expect(text).toBe('New Measure = SUM(Sales[]');
        expect(text[cursor - 1]).toBe('[');
        expect(text[cursor]).toBe(']');
        const c = completeDax(text, cursor, tables, []);
        const cols = c.suggestions.filter((s) => s.kind === 'column');
        expect(cols.map((s) => s.label).sort()).toEqual([
            'Amount',
            'Quantity',
            'Region',
        ]);
    });

    it('picking a column inside empty brackets consumes the closing ]', () => {
        const { text, cursor } = applySuggestion(
            'New Measure = SUM(Sales[]',
            'New Measure = SUM(Sales[]'.length - 1,
            'New Measure = SUM(Sales[]'.length - 1,
            'Quantity]',
        );
        expect(text).toBe('New Measure = SUM(Sales[Quantity]');
        expect(cursor).toBe(text.length);
    });

    it('shows functions AND datasets together inside a call', () => {
        const c = completeDax(
            'New Measure = SUM(',
            'New Measure = SUM('.length,
            tables,
            [],
        );
        const kinds = c.suggestions.map((s) => s.kind);
        expect(kinds).toContain('function');
        expect(kinds).toContain('table');
        const labels = c.suggestions.filter((s) => s.kind === 'table').map((s) => s.label);
        expect(labels).toEqual(expect.arrayContaining(['Sales', 'Products']));
        // functions stay ranked before tables so the aggregation flow still works
        const firstNonFunction = c.suggestions.findIndex((s) => s.kind !== 'function');
        expect(
            firstNonFunction === -1 ||
                c.suggestions.findIndex((s) => s.kind === 'function') < firstNonFunction,
        ).toBe(true);
    });

    it('shows only that table columns once inside brackets', () => {
        setTables(tables);
        const c = completeDax(
            'New Measure = SUM(Sales[',
            'New Measure = SUM(Sales['.length,
            tables,
            [],
        );
        const cols = c.suggestions.filter((s) => s.kind === 'column');
        expect(cols.map((s) => s.label).sort()).toEqual([
            'Amount',
            'Quantity',
            'Region',
        ]);
        expect(cols.every((s) => s.insert.endsWith(']'))).toBe(true);
    });

    it('filters columns as you type and matches fuzzy names', () => {
        setTables(tables);
        const c = completeDax(
            'New Measure = SUM(Sales[quan',
            'New Measure = SUM(Sales[quan'.length,
            tables,
            [],
        );
        expect(c.suggestions).toHaveLength(1);
        expect(c.suggestions[0]?.label).toBe('Quantity');
        expect(c.suggestions[0]?.insert).toBe('Quantity]');
    });

    it('suggests measures as [Measure] refs in expression context', () => {
        const c = completeDax(
            'New Measure = SUM(Sales[Amount]) + Tot',
            'New Measure = SUM(Sales[Amount]) + Tot'.length,
            tables,
            measures,
        );
        const m = c.suggestions.find((s) => s.kind === 'measure');
        expect(m?.insert).toBe('[Total Sales]');
    });

    it('provides a curated function palette', () => {
        expect(DAX_FUNCTIONS.some((f) => f.name === 'SUM')).toBe(true);
        expect(DAX_FUNCTIONS.some((f) => f.name === 'CALCULATE')).toBe(true);
        expect(DAX_FUNCTIONS.some((f) => f.name === 'TOTALYTD')).toBe(true);
    });
});

describe('DAX function-arguments tooltip', () => {
    it('returns null outside a call', () => {
        expect(daxSignature('New Measure = ', 'New Measure = '.length)).toBeNull();
        expect(daxSignature('New Measure = SUM', 'New Measure = SUM'.length)).toBeNull();
    });

    it('highlights the argument under the caret for IF', () => {
        const a = daxSignature('New Measure = IF(', 'New Measure = IF('.length);
        expect(a?.name).toBe('IF');
        expect(a?.args).toEqual(['logical', 'then', 'else']);
        expect(a?.activeArg).toBe(0);

        const b = daxSignature(
            'New Measure = IF(1 > 2, "Yes", ',
            'New Measure = IF(1 > 2, "Yes", '.length,
        );
        expect(b?.activeArg).toBe(2);

        const c = daxSignature(
            'New Measure = IF(1 > 2,',
            'New Measure = IF(1 > 2,'.length,
        );
        expect(c?.activeArg).toBe(1);
    });

    it('counts commas only at the current call depth', () => {
        const sig = daxSignature(
            'New Measure = IF(SUM(Sales[Amount]) > 10,',
            'New Measure = IF(SUM(Sales[Amount]) > 10,'.length,
        );
        expect(sig?.name).toBe('IF');
        expect(sig?.activeArg).toBe(1);

        const inner = daxSignature(
            'New Measure = IF(SUM(Sales[Amount]',
            'New Measure = IF(SUM(Sales[Amount]'.length,
        );
        expect(inner?.name).toBe('SUM');
        expect(inner?.activeArg).toBe(0);
    });
});

describe('DAX formula highlighting', () => {
    it('colors function names blue, tables cyan, numbers green, strings orange', () => {
        const expr = 'Total = IF(SUM(Sales[Amount]) > 10, "Yes", 0)';
        const cls = daxCharClasses(expr);
        const at = (text: string) => expr.indexOf(text);
        expect(cls[at('IF')]).toBe('text-blue-600');
        expect(cls[at('SUM')]).toBe('text-blue-600');
        expect(cls[at('Sales')]).toBe('text-cyan-700');
        expect(cls[at('Yes')]).toBe('text-orange-600');
        expect(cls[at('0')]).toBe('text-emerald-600');
        // brackets / operators stay plain
        expect(cls[at('(')]).toBeUndefined();
        expect(cls[at('>')]).toBeUndefined();
    });

    it('does not color plain identifiers or the measure name', () => {
        const expr = 'Total Sales = 1';
        const cls = daxCharClasses(expr);
        expect(cls[0]).toBeUndefined();
        expect(cls[expr.indexOf('Sales')]).toBeUndefined();
    });

    it('W1-17 highlights a verbatim % as modulo, never as a percent sign', () => {
        const expr = 'Total = 17 % 5';
        const cls = daxCharClasses(expr);
        const idx = expr.indexOf('%');
        expect(cls[idx]).toContain('fuchsia');
        expect(cls[idx]).toContain('underline');
        // The spaces around it are uncolored — % is not a percent of the number.
        expect(cls[idx - 1]).toBeUndefined();
    });
});

describe('DAX bracket matching', () => {
    const expr = 'Total = IF(SUM(Sales[Amount]), 1, 2)';

    it('matches the open paren under the caret to its close', () => {
        const open = expr.indexOf('IF(') + 2;
        expect(bracketMatch(expr, open)).toEqual({ open, close: expr.length - 1 });
        expect(bracketMatch(expr, open + 1)).toEqual({ open, close: expr.length - 1 });
    });

    it('matches a close paren back to its open', () => {
        const close = expr.length - 1;
        expect(bracketMatch(expr, close)).toEqual({ open: expr.indexOf('IF(') + 2, close });
        expect(bracketMatch(expr, close + 1)).toEqual({ open: expr.indexOf('IF(') + 2, close });
    });

    it('respects nesting when matching the inner SUM parens', () => {
        const innerOpen = expr.indexOf('SUM(') + 3;
        const innerClose = expr.indexOf(']');
        const innerCloseParen = expr.indexOf(')') + 1;
        const m = bracketMatch(expr, innerOpen);
        expect(m?.open).toBe(innerOpen);
        expect(expr[m!.close]).toBe(')');
        expect(m!.close).toBeLessThan(innerCloseParen);
        expect(m!.close).toBeGreaterThan(innerClose);
    });

    it('returns null when the caret is not next to a bracket', () => {
        expect(bracketMatch('Total = 1', 5)).toBeNull();
        expect(bracketMatch('Total = IF', 9)).toBeNull();
    });
});
