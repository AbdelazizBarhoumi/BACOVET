// Shared mutable registry state for the report canvas data model and engine.
// This module intentionally has no internal `model` dependencies so that
// `format`, `engine` and `aggregate` can all import it without cycles.

import { BUILTIN_COUNTROWS_IMPL } from './consts';
import type {
    FieldType,
    ListMeasureImpl,
    MeasureImpl,
    TableDef,
} from './types';

export let TABLES: TableDef[] = [];

export function setTables(tables: TableDef[]): void {
    TABLES = tables;
}

/** Compiled measure implementations (built-in + custom, via `registerMeasure`). */
export const MEASURE_IMPL: Record<string, MeasureImpl> = {
    'Nombre de lignes': BUILTIN_COUNTROWS_IMPL,
};

/** Compiled list-measure (VALUES/DISTINCT) implementations. */
export const LIST_MEASURE_IMPL: Record<string, ListMeasureImpl> = {};

/** True when the name resolves to a (built-in or registered) measure. */
export function isMeasure(name: string): boolean {
    return name in MEASURE_IMPL;
}

/** First table that exposes a column with the given name. */
export function findTableForField(name: string, tables?: TableDef[]): string {
    for (const t of tables ?? TABLES) {
        if (t.fields.some((f) => f.name === name)) return t.name;
    }
    return '';
}

/** Resolves a table by name, preferring the exact name then a case-insensitive
 *  match (measures reference tables as `empdefecteff` while datasets carry the
 *  title-case label `EmpDefectEff`). */
export function findTableByName(
    name: string,
    tables?: TableDef[],
): TableDef | undefined {
    const list = tables ?? TABLES;
    return (
        list.find((t) => t.name === name) ??
        list.find((t) => t.name.toLowerCase() === name.toLowerCase())
    );
}

export function fieldType(name: string, table?: string): FieldType {
    if (isMeasure(name)) return 'number';
    if (table) {
        for (const t of TABLES) {
            if (t.name !== table) continue;
            const f = t.fields.find((x) => x.name === name);
            if (f) return f.type;
        }
    }
    for (const t of TABLES) {
        const f = t.fields.find((x) => x.name === name);
        if (f) return f.type;
    }
    return 'text';
}

export function hasColumn(table: TableDef, name: string): boolean {
    return table.fields.some((f) => f.name === name);
}
