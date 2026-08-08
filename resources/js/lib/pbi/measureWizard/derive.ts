import type {
    CompositeOperand,
    CompositeSpec,
    MeasureKind,
    NumericAgg,
    PathHop,
    ValueCondition,
    WizardSpec,
} from './types';

// --- DAX → spec (inverse) ---------------------------------------------------

const COND_OP_RE = /\s*(>=|<=|<>|=|>|<)\s*/;

/** A `TRIM(table[col]) = TRIM(table[col])` hop edge. */
type ChainEdge = { a: string; aCol: string; b: string; bCol: string };

const AGG_FUNCS: Record<string, NumericAgg> = {
    sumx: 'sum',
    averagex: 'avg',
    minx: 'min',
    maxx: 'max',
    countx: 'count',
    sum: 'sum',
    average: 'avg',
    min: 'min',
    max: 'max',
    count: 'count',
};

/** Parses one composed operand: `[Measure]`, `SUM(table[col])`, or a number. */
function parseOperand(s: string): CompositeOperand | null {
    const t = s.trim();
    const measure = /^\[\s*([^\]]+)\s*\]$/i.exec(t);
    if (measure) return { type: 'measure', name: measure[1]!.trim() };
    const aggRe = new RegExp(
        `^(${Object.keys(AGG_FUNCS).join('|')})\\(\\s*([a-zA-Z_][\\w]*)\\s*\\[\\s*([^\\]]+)\\s*\\]\\s*\\)$`,
        'i',
    );
    const agg = aggRe.exec(t);
    if (agg) {
        const op = agg[1]!.toLowerCase();
        return {
            type: 'column',
            table: agg[2]!,
            column: agg[3]!.trim(),
            agg: AGG_FUNCS[op] ?? 'sum',
        };
    }
    if (/^-?\d+(\.\d+)?$/.test(t))
        return { type: 'number', value: Number(t) };
    return null;
}

/** Split on the top-level arithmetic operator (respecting parens/brackets). */
function splitTopLevelBinop(s: string): { l: string; r: string; op: '/' | '*' | '-' | '+' } | null {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i]!;
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (
            depth === 0 &&
            (c === '+' || c === '-' || c === '*' || c === '/')
        ) {
            const l = s.slice(0, i).trim();
            const r = s.slice(i + 1).trim();
            if (!l || !r) continue;
            return { l, r, op: c };
        }
    }
    return null;
}

/**
 * Best-effort reversal of a composed measure:
 *   DIVIDE(A, B, 0) * 100 | DIVIDE(A, B, 0) | (A op B) * 100 | (A op B) | A op B
 * where operands are `[Measure]`, `SUM(table[col])` or a numeric literal.
 */
function parseComposition(trimmed: string): WizardSpec | null {
    let body = trimmed;
    let scale = false;
    const scaleMatch = /^(.*?)\s*\*\s*100\s*$/i.exec(trimmed);
    if (scaleMatch) {
        scale = true;
        body = scaleMatch[1]!.trim();
    }

    let op: '-' | '+' | '*' | '/' | null = null;
    let aRaw: string;
    let bRaw: string;

    const div = /^DIVIDE\(\s*(.+?)\s*,\s*(.+?)\s*,\s*\d+\s*\)$/i.exec(body);
    if (div) {
        op = '/';
        aRaw = div[1]!;
        bRaw = div[2]!;
    } else {
        let inner = body;
        const paren = /^\((.*)\)$/s.exec(body);
        if (paren) {
            if (hasTopLevelComma(paren[1]!)) return null;
            inner = paren[1]!.trim();
        }
        const bin = splitTopLevelBinop(inner);
        if (!bin) return null;
        op = bin.op;
        aRaw = bin.l;
        bRaw = bin.r;
    }

    const a = parseOperand(aRaw);
    const b = parseOperand(bRaw);
    if (!a || !b || !op) return null;
    const composition: CompositeSpec = { a, b, op, scale };

    const from =
        a.type === 'column' ? a.table : b.type === 'column' ? b.table : '';
    const to =
        b.type === 'column' ? b.table : a.type === 'column' ? a.table : '';
    return {
        from,
        to,
        hops: [],
        kind: 'number',
        column: '',
        agg: 'sum',
        composition,
    };
}

function hasTopLevelComma(s: string): boolean {
    let depth = 0;
    for (const c of s) {
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (c === ',' && depth === 0) return true;
    }
    return false;
}

/**
 * Best-effort reversal of the DAX the wizard generates, so a measure that was
 * hand-typed (or produced then edited) can recover its `WizardSpec` and show
 * the joins/banner without relying on a persisted `config`. Unrecognized or
 * hybrid expressions return `null`; the caller then keeps `config` unspecified.
 *
 * Supported shapes:
 *   VALUES(to[col])                        list (no hops)
 *   VALUES(FILTER(to, chain)[col])         list (hops / condition)
 *   COUNTROWS(to)                           count (no hops)
 *   COUNTROWS(FILTER(to, chain))            count (hops / condition)
 *   SUM(to[col]) …                          number (no hops)
 *   SUMX(FILTER(to, chain), to[col]) …      number (hops / condition)
 *   DIVIDE([A],[B]) * 100 …                 composite (composition step)
 */
export function deriveMeasureSpec(body: string): WizardSpec | null {
    const trimmed = body.trim();

    const composite = parseComposition(trimmed);
    if (composite) return composite;

    // ---- no-hop plain forms -------------------------------------------------
    const plainCol = /^([A-Za-z]+)\(\s*([a-zA-Z_][\w]*)\s*\)$/i.exec(trimmed);
    if (plainCol && plainCol[1]!.toLowerCase() === 'countrows') {
        const to = plainCol[2]!;
        return {
            from: to,
            to,
            hops: [],
            kind: 'countrows',
            column: '',
            agg: 'count',
        };
    }
    const plainColList =
        /^([A-Za-z]+)\(\s*([a-zA-Z_][\w]*)\[([^\]]+)\]\s*\)$/i.exec(trimmed);
    if (plainColList) {
        const fn = plainColList[1]!.toLowerCase();
        const to = plainColList[2]!;
        const column = plainColList[3]!;
        if (fn === 'values' || fn === 'distinct') {
            return {
                from: to,
                to,
                hops: [],
                kind: 'list',
                column,
                agg: 'count',
            };
        }
        const agg = AGG_FUNCS[fn];
        if (agg) {
            return { from: to, to, hops: [], kind: 'number', column, agg };
        }
    }

    // ---- FILTER-wrapped forms ----------------------------------------------
    // Split `<fn>( <arg> )<tail>` using balanced parens, so nested FILTER /
    // COUNTROWS parens inside the argument never break the outer match.
    const openIdx = trimmed.indexOf('(');
    if (openIdx < 0) return null;
    const closeIdx = matchingParen(trimmed, openIdx);
    if (closeIdx < 0) return null;
    const fn = trimmed.slice(0, openIdx).trim().toLowerCase();
    const arg = trimmed.slice(openIdx + 1, closeIdx).trim();
    const tail = trimmed.slice(closeIdx + 1).trim();

    if (
        !(fn === 'values' || fn === 'distinct' || fn === 'countrows') &&
        !AGG_FUNCS[fn]
    ) {
        return null;
    }

    // arg must be a FILTER(…).
    const fi = checkPrefix(arg, 'FILTER');
    if (fi < 0) return null;
    const fc = matchingParen(arg, fi);
    if (fc < 0) return null;
    const filterArgs = arg.slice(fi + 1, fc).trim();
    const afterFilter = arg.slice(fc + 1).trim(); // e.g. `[col]`

    const comma = topLevelComma(filterArgs);
    if (comma < 0) return null;
    const to = filterArgs.slice(0, comma).trim();
    const cond = filterArgs.slice(comma + 1).trim();

    let column = '';
    let agg: NumericAgg = 'count';
    let kind: MeasureKind | null = null;

    if (fn === 'values' || fn === 'distinct') {
        kind = 'list';
        const colMatch = /^\[\s*([^\]]+)\s*\]$/.exec(afterFilter);
        column = colMatch ? colMatch[1]!.trim() : '';
        if (!column) return null;
    } else if (fn === 'countrows') {
        kind = 'countrows';
        if (afterFilter) return null;
    } else if (AGG_FUNCS[fn]) {
        kind = 'number';
        agg = AGG_FUNCS[fn]!;
        // SUMX(FILTER(to, chain), to[col]) puts the value column after the
        // FILTER arg inside the same paren; the tail is empty in that case.
        const tailCol = /^\s*,\s*[^,[\s]+\s*\[\s*([^\]]+)\s*\]\s*\)\s*$/.exec(
            tail,
        );
        const afterFilterCol = /^\s*,\s*[^,[\s]+\s*\[\s*([^\]]+)\s*\]\s*$/.exec(
            afterFilter,
        );
        column = tailCol?.[1]?.trim() || afterFilterCol?.[1]?.trim() || '';
        if (!column) return null;
    } else {
        return null;
    }

    // Trailing ` && <condition>` is a scalar filter, not part of the chain.
    const condParts = splitTopLevelAnds(cond);
    let chainStr = cond;
    let condition: ValueCondition | undefined;
    if (condParts.length > 1) {
        const last = condParts.pop()!;
        const parsed = parseCondition(last);
        if (parsed) {
            condition = parsed;
            chainStr = condParts.join(' && ');
        }
    }

    const hops = parseChain(chainStr);
    if (hops === null) return null;
    const from = hops.length ? hops[0]!.from : to;

    return {
        from,
        to,
        hops,
        kind: kind as MeasureKind,
        column,
        agg,
        condition,
    };
}

/** Index of the paren that closes the one opening at `open`. -1 if unmatched. */
function matchingParen(s: string, open: number): number {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

/** If `s` (trimmed) starts with the uppercase-insensitive `name(`, return its paren-open index. */
function checkPrefix(s: string, name: string): number {
    const t = s.trim();
    const k = name.length;
    if (t.slice(0, k).toUpperCase() === name && t[k] === '(') return k;
    return -1;
}

/** Index of the first top-level `,` (depth 0) in `s`, or -1. */
function topLevelComma(s: string): number {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i]!;
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (c === ',' && depth === 0) return i;
    }
    return -1;
}

/** Split a condition string on top-level ` && ` (ignoring nested parens). */
function splitTopLevelAnds(s: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let cur = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i]!;
        if (c === '(') depth++;
        else if (c === ')') depth--;
        if (depth === 0 && c === '&' && s[i + 1] === '&') {
            parts.push(cur.trim());
            cur = '';
            i += 1;
            continue;
        }
        cur += c;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
}

function parseCondition(s: string): ValueCondition | undefined {
    const m = COND_OP_RE.exec(s);
    if (!m) return undefined;
    const colPart = s.slice(0, m.index).trim();
    const valPart = s.slice(m.index + m[0].length).trim();
    const col = stripTrimBrackets(colPart);
    if (!col) return undefined;
    const opMap: Record<string, ValueCondition['op']> = {
        '>': 'gt',
        '>=': 'gte',
        '<': 'lt',
        '<=': 'lte',
        '=': 'eq',
        '<>': 'neq',
    };
    const op = opMap[m[1]!];
    if (!op) return undefined;
    return { column: col, op, value: valPart.replace(/^['"]|['"]$/g, '') };
}

function stripTrimBrackets(s: string): string | null {
    const t = s.trim();
    // Allow an optional trailing `)` from a TRIM(…) wrapper.
    const m = /[^[\]]+\s*\[\s*([^\]]+)\s*\]\s*\)?\s*$/.exec(t);
    return m ? m[1]!.trim() : null;
}

/**
 * Parse a nested `COUNTROWS(FILTER(t, TRIM(a)=TRIM(b) && ...)) > 0` chain into
 * ordered `from → to` hops. The wizard nests innermost = base table last, so
 * scanning every `TRIM(t[x]) = TRIM(t[y])` edge in string order yields target-
 * nearest edges first; reversing reconstructs the base → target path.
 * Returns `null` when no edge is found (i.e. not a correlated chain).
 */
function parseChain(
    s: string,
): (PathHop & { from: string; to: string })[] | null {
    const trimmed = s.trim();
    if (!trimmed) return [];
    const edges: ChainEdge[] = [];
    const re =
        /TRIM\(\s*([a-zA-Z_][\w]*)\s*\[\s*([^\]]+)\s*\]\s*\)\s*=\s*TRIM\(\s*([a-zA-Z_][\w]*)\s*\[\s*([^\]]+)\s*\]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(trimmed)) !== null) {
        edges.push({ a: m[1]!, aCol: m[2]!, b: m[3]!, bCol: m[4]! });
    }
    if (!edges.length) return [];
    edges.reverse();
    return edges.map((e) => ({
        from: e.a,
        to: e.b,
        fromCol: e.aCol,
        toCol: e.bCol,
        kind: 'fk_pk' as const,
        overlap: 0,
        confidence: 0.5,
    }));
}
