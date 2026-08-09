import type { Field, TableDef } from '../model';
import { DAX_FUNCTIONS } from './functions';
import type {
    DaxCompletion,
    DaxSuggestion,
    DaxSuggestionKind,
} from './functions';

const TOKEN_STOP = new Set([
    '(',
    ')',
    '[',
    ']',
    ',',
    '=',
    '+',
    '-',
    '*',
    '/',
    '<',
    '>',
    '"',
    "'",
]);

function isTokenChar(c: string): boolean {
    return !TOKEN_STOP.has(c) && c !== '\r' && c !== '\n';
}

function countOccurrences(text: string, ch: string): number {
    let n = 0;
    for (const c of text) if (c === ch) n += 1;
    return n;
}

function tokenRange(
    text: string,
    cursor: number,
): { from: number; to: number; token: string } {
    let i = cursor;
    while (i > 0 && isTokenChar(text[i - 1]!)) i -= 1;
    return { from: i, to: cursor, token: text.slice(i, cursor).trim() };
}

/** Table name sitting right before a `[`, e.g. `Sales[` → `Sales`. */
function tableBeforeBracket(before: string): string {
    let i = before.length - 1;
    if (before[i] !== '[') return '';
    i -= 1;
    while (i >= 0 && /\s/.test(before[i]!)) i -= 1;
    let j = i;
    while (j >= 0 && isTokenChar(before[j]!)) j -= 1;
    return before
        .slice(j + 1, i + 1)
        .replace(/^'+|'+$/g, '')
        .trim();
}

function matches(name: string, lower: string): boolean {
    const n = name.toLowerCase();
    if (!lower) return true;
    return n.startsWith(lower) || n.includes(lower);
}

const KIND_ORDER: Record<DaxSuggestionKind, number> = {
    function: 0,
    table: 1,
    measure: 2,
    column: 3,
};

function rank(kind: DaxSuggestionKind, label: string, lower: string): number {
    const n = label.toLowerCase();
    const base = KIND_ORDER[kind] * 1000;
    if (!lower) return base;
    if (n.startsWith(lower)) return base;
    return base + 500;
}

function columnSuggestion(
    field: Field,
    table: TableDef,
    inBracket: boolean,
): DaxSuggestion {
    return inBracket
        ? {
              kind: 'column',
              label: field.name,
              detail: `${table.name} · ${field.type}`,
              group: table.name,
              insert: `${field.name}]`,
          }
        : {
              kind: 'column',
              label: field.name,
              detail: `${table.name} · ${field.type}`,
              group: table.name,
              insert: `${table.name}[${field.name}]`,
          };
}

function measureSuggestion(measure: Field, inBracket: boolean): DaxSuggestion {
    return {
        kind: 'measure',
        label: measure.name,
        detail: measure.expression ?? 'Mesure',
        group: 'Mesures',
        insert: inBracket ? `${measure.name}]` : `[${measure.name}]`,
    };
}

/** A resolved call-site signature for the argument under the caret. */
export type DaxSignature = {
    name: string;
    signature: string;
    args: string[];
    activeArg: number;
};

function innermostParen(text: string, cursor: number): number | null {
    let open = 0;
    for (let i = cursor - 1; i >= 0; i -= 1) {
        const c = text[i]!;
        if (c === ')') open += 1;
        else if (c === '(') {
            if (open > 0) open -= 1;
            else return i;
        }
    }
    return null;
}

function functionNameBefore(text: string, idx: number): string | null {
    let i = idx - 1;
    while (i >= 0 && /[\p{L}\p{N}_]/u.test(text[i]!)) i -= 1;
    const name = text.slice(i + 1, idx).trim();
    return name || null;
}

/** Comma count at the given call's depth (nested parens are skipped). */
function countTopLevelCommas(text: string, from: number, to: number): number {
    let depth = 0;
    let count = 0;
    for (let i = from; i < to; i += 1) {
        const c = text[i]!;
        if (c === '(') depth += 1;
        else if (c === ')') depth -= 1;
        else if (c === ',' && depth === 0) count += 1;
    }
    return count;
}

function signatureArgs(signature: string): string[] {
    const args: string[] = [];
    const re = /<([^>]+)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(signature)) !== null) args.push(m[1]!);
    return args;
}

/* ------------------------------------------------------------------ */
/* Formula-bar syntax highlighting + bracket matching                   */
/* ------------------------------------------------------------------ */

/**
 * Applies a suggestion's `insert` to `text`, consuming an existing `]`
 * right under the caret when the insert ends with `]` (so picking a column
 * inside an empty `Table[]` doesn't leave a stray closing bracket).
 */
export function applySuggestion(
    text: string,
    cursor: number,
    from: number,
    insert: string,
    cursorAdjust = 0,
): { text: string; cursor: number } {
    const tail =
        text[cursor] === ']' && insert.endsWith(']')
            ? text.slice(cursor + 1)
            : text.slice(cursor);
    const next = text.slice(0, from) + insert + tail;
    return { text: next, cursor: from + insert.length + cursorAdjust };
}

/** Tailwind classes per token kind, Power BI style (functions in blue). */
const TOKEN_CLASS: Record<'function' | 'table' | 'number' | 'string', string> =
    {
        function: 'text-blue-600',
        table: 'text-cyan-700',
        number: 'text-emerald-600',
        string: 'text-orange-600',
    };

/**
 * `%` is DAX's modulo operator, not a percentage — highlight it distinctly so
 * a verbatim `%` (W1-17) never reads as a percent sign.
 */
const MODULO_CLASS = 'font-bold text-fuchsia-600 underline decoration-wavy decoration-fuchsia-400/60';

/**
 * Returns a per-character Tailwind class for a DAX expression so it can be
 * rendered as a highlighted layer under a transparent textarea.
 */
export function daxCharClasses(expr: string): (string | undefined)[] {
    const n = expr.length;
    const cls: (string | undefined)[] = new Array(n).fill(undefined);
    const isWord = (c: string | undefined) => !!c && /[\p{L}\p{N}_]/u.test(c);
    let i = 0;
    while (i < n) {
        const c = expr[i]!;
        if (c === '"' || c === "'") {
            const start = i;
            i += 1;
            while (i < n && expr[i] !== c) i += 1;
            i += 1;
            for (let k = start; k < Math.min(i, n); k += 1)
                cls[k] = TOKEN_CLASS.string;
        } else if (
            /\d/.test(c) ||
            (c === '.' && /\d/.test(expr[i + 1] ?? ''))
        ) {
            const start = i;
            while (i < n && /[\d.]/.test(expr[i]!)) i += 1;
            for (let k = start; k < i; k += 1) cls[k] = TOKEN_CLASS.number;
        } else if (isWord(c)) {
            const start = i;
            while (i < n && isWord(expr[i])) i += 1;
            let j = i;
            while (j < n && /\s/.test(expr[j]!)) j += 1;
            const next = expr[j];
            if (next === '(') {
                for (let k = start; k < i; k += 1)
                    cls[k] = TOKEN_CLASS.function;
            } else if (next === '[') {
                for (let k = start; k < i; k += 1) cls[k] = TOKEN_CLASS.table;
            }
            i = j;
        } else if (c === '%') {
            cls[i] = MODULO_CLASS;
            i += 1;
        } else {
            i += 1;
        }
    }
    return cls;
}

/** Highlight class applied to a matched bracket pair. */
export const BRACKET_MATCH_CLASS =
    'bg-amber-300/80 font-bold text-amber-900 shadow-[inset_0_0_0_1px_rgba(120,53,15,0.6)]';

const BRACKET_PAIRS: Record<string, string> = { '(': ')', '[': ']' };

/**
 * Finds the open/close indices of the bracket pair adjacent to the caret,
 * respecting nesting. Returns null when the caret is not next to a bracket.
 */
export function bracketMatch(
    text: string,
    cursor: number,
): { open: number; close: number } | null {
    const before = text[cursor - 1];
    const at = text[cursor];
    let pos = -1;
    if (before === '(' || before === '[') pos = cursor - 1;
    else if (at === '(' || at === '[') pos = cursor;
    else if (at === ')' || at === ']') pos = cursor;
    else if (before === ')' || before === ']') pos = cursor - 1;
    if (pos < 0) return null;

    const ch = text[pos]!;
    if (ch === '(' || ch === '[') {
        const close = BRACKET_PAIRS[ch]!;
        let depth = 0;
        for (let i = pos; i < text.length; i += 1) {
            if (text[i] === ch) depth += 1;
            else if (text[i] === close) {
                depth -= 1;
                if (depth === 0) return { open: pos, close: i };
            }
        }
    } else {
        const open = ch === ')' ? '(' : '[';
        let depth = 0;
        for (let i = pos; i >= 0; i -= 1) {
            if (text[i] === ch) depth += 1;
            else if (text[i] === open) {
                depth -= 1;
                if (depth === 0) return { open: i, close: pos };
            }
        }
    }
    return null;
}

/**
 * Excel-style function-arguments tooltip: when the caret sits inside the
 * parens of a known call, return its signature and which argument (comma
 * index) is being typed, so the UI can highlight `logical`, `then`, `else`, …
 */
export function daxSignature(
    text: string,
    cursor: number,
): DaxSignature | null {
    const idx = innermostParen(text, cursor);
    if (idx === null) return null;
    const name = functionNameBefore(text, idx);
    if (!name) return null;
    const fn = DAX_FUNCTIONS.find(
        (f) => f.name.toUpperCase() === name.toUpperCase(),
    );
    if (!fn) return null;
    const args = signatureArgs(fn.signature);
    const commas = countTopLevelCommas(text, idx + 1, cursor);
    const activeArg = args.length ? Math.min(commas, args.length - 1) : 0;
    return { name: fn.name, signature: fn.signature, args, activeArg };
}

/**
 * Computes the suggestions for `text` with the caret at `cursor`.
 * Context-aware like Power BI: functions open `()`, tables open `[]`,
 * columns complete with `]`, measures complete as `[name]`.
 */
export function completeDax(
    text: string,
    cursor: number,
    tables: TableDef[],
    measures: Field[],
): DaxCompletion {
    const { from, to, token } = tokenRange(text, cursor);
    const before = text.slice(0, cursor);

    if (!before.includes('=')) return { suggestions: [], from, to };
    if (countOccurrences(before, ')') > countOccurrences(before, '(')) {
        // Past a closed call / unbalanced parens — no completions.
        return { suggestions: [], from, to };
    }
    const parenDepth =
        countOccurrences(before, '(') - countOccurrences(before, ')');
    const tail = before.trimEnd();
    if (parenDepth === 0 && (tail.endsWith(')') || tail.endsWith(']'))) {
        // A complete expression — nothing more to type here.
        return { suggestions: [], from, to };
    }

    const lower = token.toLowerCase();
    const bracketIdx = before.lastIndexOf('[');
    const inBracket = bracketIdx > before.lastIndexOf(']');
    const seen = new Set<string>();
    const functions: DaxSuggestion[] = [];
    const tablesOut: DaxSuggestion[] = [];
    const columns: DaxSuggestion[] = [];
    const measuresOut: DaxSuggestion[] = [];

    const collect = (into: DaxSuggestion[], item: DaxSuggestion) => {
        const key = `${item.kind}:${item.insert}`;
        if (seen.has(key)) return;
        seen.add(key);
        into.push(item);
    };

    if (inBracket) {
        const table = tables.find(
            (t) =>
                t.name === tableBeforeBracket(before.slice(0, bracketIdx + 1)),
        );
        if (table) {
            for (const f of table.fields)
                if (matches(f.name, lower))
                    collect(columns, columnSuggestion(f, table, true));
        } else {
            for (const t of tables)
                for (const f of t.fields)
                    if (matches(f.name, lower))
                        collect(columns, columnSuggestion(f, t, true));
        }
        for (const m of measures)
            if (matches(m.name, lower))
                collect(measuresOut, measureSuggestion(m, true));
    } else {
        for (const f of DAX_FUNCTIONS)
            if (matches(f.name, lower))
                collect(functions, {
                    kind: 'function' as const,
                    label: f.name,
                    detail: f.signature,
                    group: f.group,
                    insert: `${f.name}()`,
                    cursorAdjust: -1,
                });
        for (const t of tables)
            if (matches(t.name, lower))
                collect(tablesOut, {
                    kind: 'table' as const,
                    label: t.name,
                    detail: `${t.fields.length} colonnes`,
                    group: 'Tables',
                    insert: `${t.name}[]`,
                    cursorAdjust: -1,
                });
        for (const m of measures)
            if (matches(m.name, lower))
                collect(measuresOut, measureSuggestion(m, false));
        for (const t of tables)
            for (const f of t.fields)
                if (matches(f.name, lower))
                    collect(columns, columnSuggestion(f, t, false));
    }

    const sortItems = (items: DaxSuggestion[]) =>
        items.sort((a, b) => {
            const byRank =
                rank(a.kind, a.label, lower) - rank(b.kind, b.label, lower);
            if (byRank) return byRank;
            if (lower) {
                const aStart = a.label.toLowerCase().startsWith(lower) ? 0 : 1;
                const bStart = b.label.toLowerCase().startsWith(lower) ? 0 : 1;
                if (aStart !== bStart) return aStart - bStart;
            }
            const byLen = a.label.length - b.label.length;
            if (byLen) return byLen;
            return a.label.localeCompare(b.label);
        });

    // Keep every category visible in the columnar dropdown: each kind is
    // capped independently so datasets aren't pushed out by the function list.
    const FUNCTION_CAP = 24;
    const TABLE_CAP = 15;
    const COLUMN_CAP = 20;
    const MEASURE_CAP = 8;

    const suggestions = [
        ...sortItems(functions).slice(0, FUNCTION_CAP),
        ...sortItems(tablesOut).slice(0, TABLE_CAP),
        ...sortItems(columns).slice(0, COLUMN_CAP),
        ...sortItems(measuresOut).slice(0, MEASURE_CAP),
    ];

    return { suggestions, from, to };
}
