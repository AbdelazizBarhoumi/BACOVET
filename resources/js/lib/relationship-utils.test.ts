import { describe, it, expect } from 'vitest';
import type { EndpointEntry } from '@/services/endpointManagerApi';
import {
    confidenceFromScore,
    inferEntryKeys,
    keyNameScore,
    normalizeKeyName,
    pickPrimaryKey,
} from './relationship-utils';

describe('normalizeKeyName', () => {
    it('trims and lowercases', () => {
        expect(normalizeKeyName('  ProdGroup  ')).toBe('prodgroup');
        expect(normalizeKeyName('IDMP')).toBe('idmp');
    });
});

describe('keyNameScore', () => {
    it('ranks id-prefixed names highest', () => {
        expect(keyNameScore('id')).toBe(130);
        expect(keyNameScore('IDMP')).toBe(120);
        expect(keyNameScore('IDArticleColis')).toBe(120);
    });

    it('ranks code-like names below id', () => {
        expect(keyNameScore('Code')).toBe(110);
        expect(keyNameScore('CodeMP')).toBe(105);
        expect(keyNameScore('ShiftCode')).toBe(85);
    });

    it('recognizes number / ref variants', () => {
        expect(keyNameScore('EmployeeNo')).toBe(90);
        expect(keyNameScore('NumInterne')).toBe(95);
        expect(keyNameScore('Reference')).toBe(80);
    });

    it('falls back to a low score for plain names', () => {
        expect(keyNameScore('Description')).toBe(10);
    });
});

describe('pickPrimaryKey', () => {
    it('returns null when no column is unique', () => {
        expect(
            pickPrimaryKey([
                { name: 'Name', unique: false },
                { name: 'Qty', unique: false },
            ]),
        ).toBeNull();
    });

    it('picks the best-named unique column', () => {
        const pk = pickPrimaryKey([
            { name: 'Description', unique: true },
            { name: 'IDMP', unique: true },
        ]);
        expect(pk?.column).toBe('IDMP');
        expect(pk?.confidence).toBe(confidenceFromScore(120));
    });

    it('favours id over code over plain', () => {
        const pk = pickPrimaryKey([
            { name: 'Code', unique: true },
            { name: 'IDMPFamille', unique: true },
        ]);
        expect(pk?.column).toBe('IDMPFamille');
    });
});

describe('inferEntryKeys', () => {
    function makeEntry(data: Record<string, unknown>[]): EndpointEntry {
        return {
            id: 'e1',
            name: 'Test (DIVATEX)',
            method: 'GET',
            endpoint: 'https://api.example.com/api/data/test',
            status: 200,
            response: { success: true, data },
        };
    }

    it('detects unique columns and picks the primary key', () => {
        const entry = makeEntry([
            { IDArticleColis: 1, IDColis: 10, Qtte: 5 },
            { IDArticleColis: 2, IDColis: 10, Qtte: 5 },
            { IDArticleColis: 3, IDColis: 11, Qtte: 7 },
        ]);

        const keys = inferEntryKeys(entry);
        expect(keys.uniqueColumns).toContain('IDArticleColis');
        expect(keys.uniqueColumns).not.toContain('Qtte');
        expect(keys.primaryKey?.column).toBe('IDArticleColis');
    });

    it('returns null keys for empty data', () => {
        const keys = inferEntryKeys(makeEntry([]));
        expect(keys.primaryKey).toBeNull();
        expect(keys.uniqueColumns).toEqual([]);
    });

    it('ignores null values when checking uniqueness', () => {
        const entry = makeEntry([
            { EmployeeNo: '1', Name: 'A' },
            { EmployeeNo: '2', Name: 'A' },
            { EmployeeNo: '3', Name: null },
        ]);

        const keys = inferEntryKeys(entry);
        expect(keys.uniqueColumns).toContain('EmployeeNo');
        expect(keys.uniqueColumns).not.toContain('Name');
        expect(keys.primaryKey?.column).toBe('EmployeeNo');
    });
});
