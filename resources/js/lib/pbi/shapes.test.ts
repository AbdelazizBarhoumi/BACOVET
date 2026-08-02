import { describe, expect, it } from 'vitest';
import { SHAPE_KINDS, SHAPES, ShapeGlyph } from '@/lib/pbi/shapes';
import { mkVisual, visualTypeLabel } from '@/lib/pbi/store';
import { visualExportData } from './exportData';
import { setTables, type TableDef } from './model';

const sales: TableDef = {
    name: 'sales',
    fields: [
        { table: 'sales', name: 'Region', type: 'text' },
        { table: 'sales', name: 'Amount', type: 'number' },
    ],
    rows: [
        { Region: 'North', Amount: 90 },
        { Region: 'South', Amount: 30 },
    ],
};

describe('shapes registry', () => {
    it('exposes all 16 shape kinds with labels and defaults', () => {
        expect(SHAPE_KINDS).toHaveLength(16);
        for (const kind of SHAPE_KINDS) {
            const def = SHAPES[kind];
            expect(def.kind).toBe(kind);
            expect(def.label.length).toBeGreaterThan(0);
            expect(def.defaultW).toBeGreaterThan(0);
            expect(def.defaultH).toBeGreaterThan(0);
        }
    });

    it('renders every shape glyph without throwing', () => {
        for (const kind of SHAPE_KINDS) {
            expect(() => ShapeGlyph({ kind })).not.toThrow();
        }
    });
});

describe('shape visuals', () => {
    it('mkVisual carries the shape kind and default rotation', () => {
        const v = mkVisual('shape', 10, 10, 200, 140, {
            shape: 'hexagon',
        });
        expect(v.type).toBe('shape');
        expect(v.shape).toBe('hexagon');
        expect(v.rotation).toBe(0);
    });

    it('visualTypeLabel renders Shape', () => {
        expect(visualTypeLabel('shape')).toBe('Shape');
    });

    it('shapes produce no export dataset (skipped in CSV/Excel)', () => {
        setTables([sales]);
        const v = mkVisual('shape', 10, 10, 200, 140, {
            shape: 'rectangle',
            background: '#2d6df6',
        });
        const ds = visualExportData(v, sales.rows, {
            tables: [sales],
            joins: {},
            crossFilter: null,
            interactionFor: () => 'none',
        });
        expect(ds).toBeNull();
    });
});
