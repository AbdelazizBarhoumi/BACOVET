import { describe, it, expect } from 'vitest';
import type { EndpointEntry } from '@/services/endpointManagerApi';
import {
    detectSource,
    extractColumnNames,
    extractRowCount,
    extractSlug,
    inferColumnType,
    inferStructure,
    isDateString,
} from './endpoint-structure';
import { formatJson, stringifyValue, tryParseJson } from './json-utils';

function makeEntry(overrides: Partial<EndpointEntry> = {}): EndpointEntry {
    return {
        id: 'abc-123',
        name: '01 — ItemTrxEnq (SDT)',
        method: 'GET',
        endpoint:
            'https://bacovet.eu1.netbird.services/api/data/itemtrxenq?limit=100&offset=0',
        status: 200,
        response: {
            success: true,
            source: 'SDT',
            object_type: 'view',
            columns: ['IsSplit', 'TransactionID', 'StartTime', 'Quantity', 'SAM', 'ShiftCode'],
            data: [
                {
                    IsSplit: false,
                    TransactionID: 308175,
                    StartTime: '2016-12-27T15:59:55.000Z',
                    Quantity: 36,
                    SAM: null,
                    ShiftCode: 'JOUR      ',
                },
                {
                    IsSplit: true,
                    TransactionID: 308176,
                    StartTime: '2016-12-27T16:00:00.000Z',
                    Quantity: 12.5,
                    SAM: null,
                    ShiftCode: 'JOUR      ',
                },
            ],
        },
        ...overrides,
    };
}

describe('extractSlug', () => {
    it('extracts api path from full URL', () => {
        expect(extractSlug('https://bacovet.eu1.netbird.services/api/data/itemtrxenq?limit=100')).toBe(
            'api/data/itemtrxenq',
        );
    });

    it('returns empty string for non-api path', () => {
        expect(extractSlug('https://bacovet.eu1.netbird.services/')).toBe('');
    });

    it('returns empty string for invalid URL', () => {
        expect(extractSlug('not a url')).toBe('');
    });
});

describe('detectSource', () => {
    it('parses source from name parens', () => {
        expect(detectSource(makeEntry())).toBe('SDT');
        expect(detectSource(makeEntry({ name: 'Foo (DIVATEX)' }))).toBe('DIVATEX');
        expect(detectSource(makeEntry({ name: 'Foo (QCM)' }))).toBe('QCM');
    });

    it('falls back to response.source', () => {
        const entry = makeEntry({
            name: 'Foo',
            response: { source: 'sdt' },
        });
        expect(detectSource(entry)).toBe('SDT');
    });

    it('returns OTHER when nothing matches', () => {
        expect(detectSource(makeEntry({ name: 'Foo', response: {} }))).toBe('OTHER');
    });
});

describe('isDateString', () => {
    it('detects ISO timestamps', () => {
        expect(isDateString('2016-12-27T15:59:55.000Z')).toBe(true);
        expect(isDateString('2016-12-27')).toBe(true);
        expect(isDateString('2016-12-27 08:00')).toBe(true);
    });

    it('rejects plain strings', () => {
        expect(isDateString('JOUR      ')).toBe(false);
        expect(isDateString('M')).toBe(false);
        expect(isDateString('12345')).toBe(false);
    });
});

describe('inferColumnType', () => {
    it('infers integer', () => {
        expect(inferColumnType([1, 2, 3])).toBe('integer');
    });

    it('infers number (float)', () => {
        expect(inferColumnType([1.5, 2.5])).toBe('number');
    });

    it('infers boolean', () => {
        expect(inferColumnType([true, false])).toBe('boolean');
    });

    it('infers date from ISO strings', () => {
        expect(inferColumnType(['2016-12-27T15:59:55.000Z'])).toBe('date');
    });

    it('infers string', () => {
        expect(inferColumnType(['JOUR      '])).toBe('string');
    });

    it('returns null when no non-null samples', () => {
        expect(inferColumnType([null, undefined])).toBe('null');
    });

    it('returns mixed for heterogeneous values', () => {
        expect(inferColumnType([1, 'a'])).toBe('mixed');
    });
});

describe('extractColumnNames', () => {
    it('prefers response.columns', () => {
        expect(extractColumnNames(makeEntry())).toEqual([
            'IsSplit',
            'TransactionID',
            'StartTime',
            'Quantity',
            'SAM',
            'ShiftCode',
        ]);
    });

    it('falls back to first data row keys', () => {
        const entry = makeEntry({
            response: { data: [{ a: 1, b: 2 }] },
        });
        expect(extractColumnNames(entry)).toEqual(['a', 'b']);
    });

    it('returns empty when no columns and no data', () => {
        expect(extractColumnNames(makeEntry({ response: { message: 'ok' } }))).toEqual([]);
    });
});

describe('extractRowCount', () => {
    it('counts data rows', () => {
        expect(extractRowCount(makeEntry())).toBe(2);
    });

    it('returns 0 when data missing', () => {
        expect(extractRowCount(makeEntry({ response: {} }))).toBe(0);
    });
});

describe('inferStructure', () => {
    it('derives types, nullability and row count', () => {
        const structure = inferStructure(makeEntry());
        const byName = Object.fromEntries(structure.columns.map((c) => [c.name, c]));

        expect(structure.slug).toBe('api/data/itemtrxenq');
        expect(structure.source).toBe('SDT');
        expect(structure.object_type).toBe('view');
        expect(structure.row_count).toBe(2);
        expect(structure.has_data).toBe(true);

        expect(byName.IsSplit.type).toBe('boolean');
        expect(byName.TransactionID.type).toBe('integer');
        expect(byName.StartTime.type).toBe('date');
        expect(byName.ShiftCode.type).toBe('string');
        expect(byName.SAM.type).toBe('null');
        expect(byName.SAM.nullable).toBe(true);
        expect(byName.Quantity.sample).toBe(36);
        expect(['mixed', 'number', 'integer']).toContain(byName.Quantity.type);
    });

    it('handles query-shaped responses without columns metadata', () => {
        const entry = makeEntry({
            name: 'Q-01 — colis (DIVATEX)',
            endpoint: 'https://bacovet.eu1.netbird.services/api/data/q/colis_total_3var',
            response: { data: [{ Colis: 120, Label: 'abc' }] },
        });

        const structure = inferStructure(entry);
        expect(structure.row_count).toBe(1);
        expect(structure.columns.map((c) => c.name)).toEqual(['Colis', 'Label']);
        expect(structure.columns[0].type).toBe('integer');
    });

    it('handles empty responses', () => {
        const entry = makeEntry({
            name: 'Broken (QCM)',
            response: { success: false, message: 'boom' },
        });
        const structure = inferStructure(entry);
        expect(structure.row_count).toBe(0);
        expect(structure.has_data).toBe(false);
        expect(structure.columns).toEqual([]);
    });
});

describe('json-utils', () => {
    it('parses valid JSON', () => {
        expect(tryParseJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    });

    it('reports invalid JSON', () => {
        expect(tryParseJson('{oops').ok).toBe(false);
    });

    it('rejects empty JSON', () => {
        expect(tryParseJson('   ').ok).toBe(false);
    });

    it('formats JSON with 2-space indent', () => {
        expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    });

    it('throws on format of invalid JSON', () => {
        expect(() => formatJson('{oops')).toThrow();
    });

    it('stringifies objects and primitives', () => {
        expect(stringifyValue({ a: 1 })).toContain('"a": 1');
        expect(stringifyValue(null)).toBe('null');
        expect(stringifyValue('hi')).toBe('hi');
        expect(stringifyValue(42)).toBe('42');
    });
});
