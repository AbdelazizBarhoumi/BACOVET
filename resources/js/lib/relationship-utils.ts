/**
 * Pure key-relationship heuristics, mirroring the PHP EndpointSchemaAnalyzer.
 * Used to unit-test the algorithm and to derive quick PK badges client-side.
 */

import type { EndpointEntry } from '@/services/endpointManagerApi';

export function normalizeKeyName(name: string): string {
    return name.trim().toLowerCase();
}

export function keyNameScore(name: string): number {
    const canonical = normalizeKeyName(name);

    if (canonical === 'id') {
        return 130;
    }
    if (canonical.startsWith('id')) {
        return 120;
    }
    if (canonical === 'code') {
        return 110;
    }
    if (canonical.startsWith('code')) {
        return 105;
    }
    if (canonical.endsWith('id')) {
        return 100;
    }
    if (canonical.startsWith('num')) {
        return 95;
    }
    if (canonical.endsWith('no')) {
        return 90;
    }
    if (canonical.endsWith('code')) {
        return 85;
    }
    if (canonical.startsWith('ref') || canonical === 'reference') {
        return 80;
    }
    if (canonical.endsWith('ref')) {
        return 75;
    }
    return 10;
}

export function confidenceFromScore(score: number): number {
    if (score >= 120) {
        return 0.95;
    }
    if (score >= 100) {
        return 0.85;
    }
    if (score >= 85) {
        return 0.75;
    }
    if (score >= 60) {
        return 0.6;
    }
    return 0.4;
}

export function pickPrimaryKey(
    columns: Array<{ name: string; unique: boolean }>,
): { column: string; confidence: number } | null {
    const candidates = columns.filter((column) => column.unique);
    if (candidates.length === 0) {
        return null;
    }

    let best = candidates[0];
    let bestScore = keyNameScore(best.name);

    for (const column of candidates.slice(1)) {
        const score = keyNameScore(column.name);
        if (score > bestScore) {
            best = column;
            bestScore = score;
        }
    }

    return { column: best.name, confidence: confidenceFromScore(bestScore) };
}

/**
 * Lightweight client-side key inference from a single entry's rows
 * (mirrors the backend pass over up to ~1000 rows).
 */
export function inferEntryKeys(
    entry: EndpointEntry,
): { primaryKey: { column: string; confidence: number } | null; uniqueColumns: string[] } {
    const response = entry.response as Record<string, unknown> | null | undefined;
    const data = Array.isArray(response?.data) ? response.data : [];
    const rows = data.filter(
        (row): row is Record<string, unknown> =>
            typeof row === 'object' && row !== null,
    );

    if (rows.length === 0) {
        return { primaryKey: null, uniqueColumns: [] };
    }

    const fields = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            fields.add(key);
        }
    }

    const uniqueColumns: string[] = [];

    for (const field of fields) {
        const seen = new Set<string>();
        let nonNull = 0;
        for (const row of rows) {
            const value = row[field];
            if (value === null || value === undefined) {
                continue;
            }
            nonNull++;
            seen.add(`${typeof value}:${String(value)}`);
        }
        if (nonNull > 0 && seen.size === nonNull) {
            uniqueColumns.push(field);
        }
    }

    return {
        primaryKey: pickPrimaryKey(
            uniqueColumns.map((name) => ({ name, unique: true })),
        ),
        uniqueColumns,
    };
}
