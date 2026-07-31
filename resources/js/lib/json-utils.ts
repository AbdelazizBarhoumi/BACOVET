export type JsonParseResult =
    | { ok: true; value: unknown }
    | { ok: false; error: string };

export function tryParseJson(text: string): JsonParseResult {
    const trimmed = text.trim();
    if (trimmed === '') {
        return { ok: false, error: 'JSON is empty' };
    }
    try {
        return { ok: true, value: JSON.parse(trimmed) };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Invalid JSON',
        };
    }
}

export function formatJson(text: string): string {
    const result = tryParseJson(text);
    if (!result.ok) {
        throw new Error(result.error);
    }
    return JSON.stringify(result.value, null, 2);
}

export function stringifyValue(value: unknown, pretty = true): string {
    if (value === undefined) {
        return 'undefined';
    }
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    try {
        return JSON.stringify(value, null, pretty ? 2 : undefined) ?? String(value);
    } catch {
        return String(value);
    }
}
