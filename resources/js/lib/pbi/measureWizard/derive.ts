import type {
    CompositeOperand,
    CompositeSpec,
    ConditionGroup,
    MeasureKind,
    NumericAgg,
    PathHop,
    PeriodSpec,
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

/**
 * Parses one composed operand: `[Measure]`, `SUM(table[col])`, a raw
 * `table[col]` (row-wise), a correlated `CALCULATE(SUM(table[col]),
 * FILTER(table, …))` lookup (row-wise cross-table), or a number.
 */
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
    // Row-wise: the per-row body references raw columns (`table[col]`) and,
    // across tables, a correlated `CALCULATE(SUM(table[col]), FILTER(table, …))`.
    const correlated =
        /^CALCULATE\(\s*SUM\(\s*([a-zA-Z_][\w]*)\s*\[\s*([^\]]+)\s*\]\s*\)\s*,\s*FILTER\(\s*\1\s*,\s*.+\)\s*\)$/i.exec(
            t,
        );
    if (correlated) {
        return {
            type: 'column',
            table: correlated[1]!,
            column: correlated[2]!.trim(),
            agg: 'sum',
        };
    }
    const rawCol = /^([a-zA-Z_][\w]*)\s*\[\s*([^\]]+)\s*\]$/i.exec(t);
    if (rawCol) {
        return {
            type: 'column',
            table: rawCol[1]!,
            column: rawCol[2]!.trim(),
            agg: 'sum',
        };
    }
    if (/^-?\d+(\.\d+)?$/.test(t)) return { type: 'number', value: Number(t) };
    return null;
}

/** Split on the top-level arithmetic operator (respecting parens/brackets). */
function splitTopLevelBinop(
    s: string,
): { l: string; r: string; op: '/' | '*' | '-' | '+' } | null {
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
 *   DIVIDE(A, B, 0) * 100 | DIVIDE(A, B, 0) | DIVIDE(A, B) | DIVIDE(A, B, NA())
 *   | (A op B) * 100 | (A op B) | A op B
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
    let divZero: 'zero' | 'blank' | 'na' | undefined;

    const div0 = /^DIVIDE\(\s*(.+?)\s*,\s*(.+?)\s*,\s*0\s*\)$/i.exec(body);
    const divNa = /^DIVIDE\(\s*(.+?)\s*,\s*(.+?)\s*,\s*NA\(\s*\)\s*\)$/i.exec(
        body,
    );
    const divBlank = /^DIVIDE\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i.exec(body);
    if (div0) {
        op = '/';
        aRaw = div0[1]!;
        bRaw = div0[2]!;
        divZero = 'zero';
    } else if (divNa) {
        op = '/';
        aRaw = divNa[1]!;
        bRaw = divNa[2]!;
        divZero = 'na';
    } else if (divBlank) {
        op = '/';
        aRaw = divBlank[1]!;
        bRaw = divBlank[2]!;
        divZero = 'blank';
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
    const composition: CompositeSpec = {
        a,
        b,
        op,
        scale,
        // Only a non-default denominator policy round-trips: `zero` (the DAX
        // `, 0` form) stays implicit so hand-written specs keep their shape.
        ...(divZero && divZero !== 'zero' ? { divZero } : {}),
    };

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

const ROW_WISE_FUNCS: Record<string, NumericAgg | 'list'> = {
    sumx: 'sum',
    averagex: 'avg',
    minx: 'min',
    maxx: 'max',
    countx: 'count',
    valuex: 'list',
};

/**
 * Reverse the row-wise composition (W4 "Ligne par ligne"):
 *   SUMX|AVERAGEX|MINX|MAXX|COUNTX(<base rows>, <bare composition>)
 *   VALUEX(<base rows>, <bare composition>)
 * `<base rows>` is the base table (same-table) or `FILTER(from, <existence
 * chain>)` (cross-table); the chain predicate is mined for the from → to hops
 * exactly like the other filtered forms.
 */
function parseRowWise(s: string): WizardSpec | null {
    const t = s.trim();
    const open = t.indexOf('(');
    if (open < 0) return null;
    const fn = t.slice(0, open).trim().toLowerCase();
    const agg = ROW_WISE_FUNCS[fn];
    if (!agg) return null;
    const close = matchingParen(t, open);
    if (close !== t.length - 1) return null;
    const args = splitTopLevelArgs(t.slice(open + 1, close));
    if (args.length !== 2) return null;
    const target = splitTarget(args[0] ?? '');
    if (!target) return null;
    const derived =
        target.predicate === null
            ? { from: target.to, hops: [] as PathHop[] }
            : deriveFiltered(target.to, target.predicate);
    if (derived === null) return null;
    const inner = parseComposition(args[1] ?? '');
    if (inner === null || !inner.composition) return null;
    return {
        from: derived.from,
        to: target.to,
        hops: derived.hops,
        kind: agg === 'list' ? 'list' : 'number',
        column: '',
        agg: agg === 'list' ? 'count' : 'sum',
        composition: { ...inner.composition, rowWise: agg },
    };
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
/**
 * Recognise a period wrapper around a numeric body and split out the inner
 * expression plus its `PeriodSpec`:
 *   TOTALYTD(<inner>, <table>[<field>])
 *   TOTALMTD(<inner>, <table>[<field>])
 *   CALCULATE(<inner>, PREVIOUSMONTH(<table>[<field>]))
 *   CALCULATE(<inner>, SAMEPERIODLASTYEAR(<table>[<field>]))
 * Returns `null` when the expression is not wrapped at the top level.
 */
function unwrapPeriod(s: string): { inner: string; period: PeriodSpec } | null {
    const t = s.trim();

    for (const [head, window] of [
        ['TOTALYTD', 'ytd'],
        ['TOTALMTD', 'mtd'],
        ['TOTALQTD', 'qtd'],
    ] as const) {
        const open = checkPrefix(t, head);
        if (open < 0) continue;
        if (matchingParen(t, open) !== t.length - 1) return null;
        const handle = splitWindowBody(t.slice(open + 1, t.length - 1));
        if (!handle) return null;
        return {
            inner: handle.body,
            period: { window, table: handle.table, field: handle.field },
        };
    }

    const calcOpen = checkPrefix(t, 'CALCULATE');
    if (calcOpen >= 0) {
        if (matchingParen(t, calcOpen) !== t.length - 1) return null;
        const arg = t.slice(calcOpen + 1, t.length - 1).trim();
        const comma = topLevelComma(arg);
        if (comma < 0) return null;
        const body = arg.slice(0, comma).trim();
        const filter = arg.slice(comma + 1).trim();
        for (const [head, window] of [
            ['SAMEPERIODLASTYEAR', 'lastYear'],
            ['PREVIOUSMONTH', 'prevMonth'],
        ] as const) {
            const fOpen = checkPrefix(filter, head);
            if (fOpen < 0) continue;
            if (matchingParen(filter, fOpen) !== filter.length - 1) {
                return null;
            }
            const dates = filter.slice(fOpen + 1, filter.length - 1).trim();
            const ref = /^([a-zA-Z_][\w]*)\s*\[\s*([^\]]+)\s*\]$/.exec(dates);
            if (!ref) return null;
            return {
                inner: body,
                period: {
                    window,
                    table: ref[1]!,
                    field: ref[2]!.trim(),
                },
            };
        }
    }
    return null;
}

/** Split `<body>, <table>[<field>]` on the top-level comma. */
function splitWindowBody(
    s: string,
): { body: string; table: string; field: string } | null {
    const comma = topLevelComma(s);
    if (comma < 0) return null;
    const body = s.slice(0, comma).trim();
    const dates = s.slice(comma + 1).trim();
    const ref = /^([a-zA-Z_][\w]*)\s*\[\s*([^\]]+)\s*\]$/.exec(dates);
    if (!ref) return null;
    return { body, table: ref[1]!, field: ref[2]!.trim() };
}

/**
 * Recognise the percent-of-total wrapper (W3-2):
 *   DIVIDE(<inner>, CALCULATE(<inner>, ALL(<to>[<axis>])), 0) * 100
 *   DIVIDE(<inner>, CALCULATE(<inner>, ALL(<to>)), 0) * 100
 * Returns `null` when not wrapped at the top level.
 */
function unwrapPercentOfTotal(
    s: string,
): { inner: string; axis: string } | null {
    const t = s.trim();
    const scale = /^(.*?)\s*\*\s*100\s*$/i.exec(t);
    const body = (scale ? scale[1]! : t).trim();
    const div = /^DIVIDE\(\s*(.+?)\s*,\s*CALCULATE\(\s*\1\s*,\s*ALL\(\s*([a-zA-Z_][\w]*)(?:\s*\[\s*([^\]]+)\s*\])?\s*\)\s*\)\s*,\s*0\s*\)$/i.exec(
        body,
    );
    if (!div) return null;
    return { inner: div[1]!.trim(), axis: div[3] ? div[3]!.trim() : '' };
}

/**
 * Split a measure's target expression into its table and FILTER predicate.
 * Accepts `<table>` (whole) or `FILTER(<table>, <predicate>)`.
 */
function splitTarget(
    s: string,
): { to: string; predicate: string | null } | null {
    const t = s.trim();
    const fi = checkPrefix(t, 'FILTER');
    if (fi < 0) {
        return /^[a-zA-Z_][\w]*$/.test(t) ? { to: t, predicate: null } : null;
    }
    const fc = matchingParen(t, fi);
    if (fc !== t.length - 1) return null;
    const inner = t.slice(fi + 1, fc).trim();
    const comma = topLevelComma(inner);
    if (comma < 0) return null;
    const to = inner.slice(0, comma).trim();
    const predicate = inner.slice(comma + 1).trim();
    if (!/^[a-zA-Z_][\w]*$/.test(to)) return null;
    return { to, predicate };
}

/** Recover hops/conditions from a FILTER predicate over `to`. */
function deriveFiltered(
    to: string,
    predicate: string,
): {
    from: string;
    hops: PathHop[];
    condition?: ValueCondition;
    conditions?: ConditionGroup;
} | null {
    const parsed = parseFilterPredicate(predicate, to);
    if (parsed === null) return null;
    const hops = parseChain(parsed.chain.join(' && '));
    if (hops === null) return null;
    const from = hops.length ? hops[0]!.from : to;
    const base: {
        from: string;
        hops: PathHop[];
        condition?: ValueCondition;
        conditions?: ConditionGroup;
    } = { from, hops };
    if (parsed.rows.length === 1) base.condition = parsed.rows[0];
    else if (parsed.rows.length > 1)
        base.conditions = { combine: parsed.combine, rows: parsed.rows };
    return base;
}

/** Split `s` on top-level commas (ignoring nested parens / quotes). */
function splitTopLevelArgs(s: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let cur = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i]!;
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (c === ',' && depth === 0) {
            parts.push(cur.trim());
            cur = '';
            continue;
        }
        cur += c;
    }
    parts.push(cur.trim());
    return parts;
}

/**
 * Split IF-template args on commas, honouring parens, `{…}` IN lists and
 * quoted literals (`'a', 'b'` inside braces must not split the args).
 */
function splitIfArgs(s: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let brace = 0;
    let quote: string | null = null;
    let cur = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i]!;
        if (quote) {
            cur += c;
            if (c === quote) {
                if (s[i + 1] === quote) {
                    cur += s[i + 1]!;
                    i += 1;
                } else quote = null;
            }
            continue;
        }
        if (c === "'" || c === '"') {
            quote = c;
            cur += c;
            continue;
        }
        if (c === '(') {
            depth++;
            cur += c;
            continue;
        }
        if (c === ')') {
            depth--;
            cur += c;
            continue;
        }
        if (c === '{') {
            brace++;
            cur += c;
            continue;
        }
        if (c === '}') {
            brace--;
            cur += c;
            continue;
        }
        if (c === ',' && depth === 0 && brace === 0) {
            parts.push(cur.trim());
            cur = '';
            continue;
        }
        cur += c;
    }
    parts.push(cur.trim());
    return parts;
}

/** The value-side expression of an iterated builder is `<table>[<col>]`. */
function columnRef(s: string): { table: string; column: string } | null {
    const m = /^([a-zA-Z_][\w]*)\s*\[\s*([^\]]+)\s*\]$/.exec(s.trim());
    return m ? { table: m[1]!, column: m[2]!.trim() } : null;
}

/** Map a `COND_OP_RE` operator token (friends of parseCondition) to an op. */
function condOpFromToken(tok: string): ValueCondition['op'] | null {
    const map: Record<string, ValueCondition['op']> = {
        '>': 'gt',
        '>=': 'gte',
        '<': 'lt',
        '<=': 'lte',
        '=': 'eq',
        '<>': 'neq',
    };
    return map[tok] ?? null;
}

/**
 * Reverse the Top-N wrapper (W3-3):
 * `SUMX(TOPN(n, <target>, <to>[<orderColumn>], <dir>), <to>[<col>])`, where
 * `<target>` is `<to>` or `FILTER(<to>, <predicate>)`.
 */
function parseTopN(s: string): WizardSpec | null {
    const t = s.trim();
    const open = t.indexOf('(');
    if (open < 0 || t.slice(0, open).trim().toUpperCase() !== 'SUMX') return null;
    const close = matchingParen(t, open);
    if (close !== t.length - 1) return null;
    const comma = topLevelComma(t.slice(open + 1, close));
    if (comma < 0) return null;
    const topn = t.slice(open + 1, open + 1 + comma).trim();
    const ref = columnRef(t.slice(open + 1 + comma + 1, close));
    if (!ref || !/^TOPN\s*\(/i.test(topn)) return null;

    const tnOpen = topn.indexOf('(');
    const tnClose = matchingParen(topn, tnOpen);
    if (tnClose !== topn.length - 1) return null;
    const args = splitTopLevelArgs(topn.slice(tnOpen + 1, tnClose));
    if (args.length !== 4) return null;
    const [nStr, targetStr, orderStr, dirStr] = args;
    if (!/^[0-9]+$/.test(nStr ?? '')) return null;
    const target = splitTarget(targetStr ?? '');
    if (!target || target.to !== ref.table) return null;
    const order = columnRef(orderStr ?? '');
    if (!order || order.table !== ref.table) return null;
    const dir = /^DESC$/i.test(dirStr ?? '')
        ? ('desc' as const)
        : /^ASC$/i.test(dirStr ?? '')
          ? ('asc' as const)
          : null;
    if (!dir) return null;

    const spec: WizardSpec = {
        from: target.to,
        to: target.to,
        hops: [],
        kind: 'number',
        column: ref.column,
        agg: 'sum',
        topN: {
            n: Number(nStr),
            orderColumn: order.column,
            dir,
        },
    };
    if (target.predicate) {
        const derived = deriveFiltered(target.to, target.predicate);
        if (derived === null) return null;
        spec.from = derived.from;
        spec.hops = derived.hops;
        spec.condition = derived.condition;
        spec.conditions = derived.conditions;
    }
    return spec;
}

/**
 * Reverse the CONCATENATEX text-list (W3-5):
 * `CONCATENATEX(<target>, <to>[<column>], "<sep>")`.
 */
function parseConcat(s: string): WizardSpec | null {
    const t = s.trim();
    const open = t.indexOf('(');
    if (open < 0) return null;
    if (t.slice(0, open).trim().toUpperCase() !== 'CONCATENATEX') return null;
    const close = matchingParen(t, open);
    if (close !== t.length - 1) return null;
    const args = splitTopLevelArgs(t.slice(open + 1, close));
    if (args.length < 2) return null;
    const target = splitTarget(args[0] ?? '');
    const ref = columnRef(args[1] ?? '');
    if (!target || !ref || target.to !== ref.table) return null;
    const sepMatch = /^"((?:[^"]|"")*)"$/.exec((args[2] ?? '').trim());
    if (!sepMatch) return null;

    const spec: WizardSpec = {
        from: target.to,
        to: target.to,
        hops: [],
        kind: 'list',
        column: ref.column,
        agg: 'count',
        concat: { column: ref.column, sep: sepMatch[1]!.replace(/""/g, '"') },
    };
    if (target.predicate) {
        const derived = deriveFiltered(target.to, target.predicate);
        if (derived === null) return null;
        spec.from = derived.from;
        spec.hops = derived.hops;
        spec.condition = derived.condition;
        spec.conditions = derived.conditions;
    }
    return spec;
}

/**
 * Reverse the conditional branch template (W3-6):
 * `SUMX(<target>, IF(TRIM(<to>[<column>]) <op> <value>, <then>, <else>))`.
 */
function parseIfTemplate(s: string): WizardSpec | null {
    const t = s.trim();
    const open = t.indexOf('(');
    if (open < 0 || t.slice(0, open).trim().toUpperCase() !== 'SUMX') return null;
    const close = matchingParen(t, open);
    if (close !== t.length - 1) return null;
    const comma = topLevelComma(t.slice(open + 1, close));
    if (comma < 0) return null;
    const target = splitTarget(t.slice(open + 1, open + 1 + comma));
    const ifExpr = t.slice(open + 1 + comma + 1, close).trim();
    if (!target) return null;

    const ifOpen = ifExpr.indexOf('(');
    if (ifOpen < 0 || ifExpr.slice(0, ifOpen).trim().toUpperCase() !== 'IF') {
        return null;
    }
    const ifClose = matchingParen(ifExpr, ifOpen);
    if (ifClose !== ifExpr.length - 1) return null;
    const args = splitIfArgs(ifExpr.slice(ifOpen + 1, ifClose));
    if (args.length !== 3) return null;
    const [condStr, thenStr, elseStr] = args;
    if (!/^-?\d+(\.\d+)?$/.test((thenStr ?? '').trim()) ||
        !/^-?\d+(\.\d+)?$/.test((elseStr ?? '').trim())) {
        return null;
    }

    const cond = (condStr ?? '').trim();
    const notInRe = /^(.+?)\s+(NOT\s+IN|IN)\s*\{([\s\S]*)\}\s*$/i.exec(cond);
    const m = COND_OP_RE.exec(cond);
    let colPart: string;
    let op: ValueCondition['op'] | null;
    let value: string | undefined;
    let values: string[] | undefined;
    if (m) {
        colPart = cond.slice(0, m.index).trim();
        const valPart = cond.slice(m.index + m[0].length).trim();
        op = condOpFromToken(m[1]!);
        if (!op || !isLiteral(valPart)) return null;
        value = unescapeValue(valPart);
    } else if (notInRe) {
        colPart = notInRe[1]!.trim();
        op = notInRe[2]!.toUpperCase().includes('NOT') ? 'notIn' : 'in';
        values = splitInList(notInRe[3]!)
            .map(unescapeValue)
            .filter((v) => v !== '');
        if (!values.length) return null;
    } else {
        return null;
    }
    const colMatch = /^TRIM\(\s*([a-zA-Z_][\w]*)\s*\[\s*([^\]]+)\s*\]\s*\)$/i.exec(
        colPart,
    );
    if (!colMatch || colMatch[1]! !== target.to) return null;

    const spec: WizardSpec = {
        from: target.to,
        to: target.to,
        hops: [],
        kind: 'number',
        column: colMatch[2]!.trim(),
        agg: 'sum',
        ifTemplate: {
            column: colMatch[2]!.trim(),
            op: op!,
            ...(value !== undefined ? { value } : {}),
            ...(values !== undefined ? { values } : {}),
            then: Number(thenStr!.trim()),
            else: Number(elseStr!.trim()),
        },
    };
    if (target.predicate) {
        const derived = deriveFiltered(target.to, target.predicate);
        if (derived === null) return null;
        spec.from = derived.from;
        spec.hops = derived.hops;
        spec.condition = derived.condition;
        spec.conditions = derived.conditions;
    }
    return spec;
}

export function deriveMeasureSpec(body: string): WizardSpec | null {
    const trimmed = body.trim();

    // ---- percent-of-total wrapper ------------------------------------------
    // Reverse DIVIDE(<inner>, CALCULATE(<inner>, ALL(…)), 0)*100 so the
    // "Part du total" toggle re-fills on edit (W3-2).
    const pctWrapped = unwrapPercentOfTotal(trimmed);
    if (pctWrapped) {
        const inner = deriveMeasureSpec(pctWrapped.inner);
        if (inner === null) return null;
        return { ...inner, percentOfTotal: { axis: pctWrapped.axis } };
    }

    // ---- time-window wrappers ----------------------------------------------
    // Reverse TOTALYTD / TOTALMTD / CALCULATE(…, PREVIOUSMONTH | SAMEPERIOD-
    // LASTYEAR(…)) so a period measure round-trips into the Résultat step. The
    // inner body is derived as usual, then the window is attached.
    const periodWrapped = unwrapPeriod(trimmed);
    if (periodWrapped) {
        const inner = deriveMeasureSpec(periodWrapped.inner);
        if (inner === null) return null;
        return { ...inner, period: periodWrapped.period };
    }

    // ---- Top-N / CONCATENATEX / IF template --------------------------------
    const topN = parseTopN(trimmed);
    if (topN) return topN;
    const concat = parseConcat(trimmed);
    if (concat) return concat;
    const ifTemplate = parseIfTemplate(trimmed);
    if (ifTemplate) return ifTemplate;

    const rowWise = parseRowWise(trimmed);
    if (rowWise) return rowWise;

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

    // The predicate is a mix of chain edges (`TRIM(a)=TRIM(b)`) and scalar
    // conditions. Classify every segment so multi-condition AND / OR and
    // base-table conditions all round-trip (W2-2, W2-3, W2-4).
    const derived = deriveFiltered(to, cond);
    if (derived === null) return null;

    const spec: WizardSpec = {
        from: derived.from,
        to,
        hops: derived.hops,
        kind: kind as MeasureKind,
        column,
        agg,
    };
    if (derived.condition) spec.condition = derived.condition;
    if (derived.conditions) spec.conditions = derived.conditions;
    return spec;
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

/** Split `s` on a top-level boolean operator (ignoring nested parens). */
function splitTopLevel(s: string, op: '&&' | '||'): string[] {
    const parts: string[] = [];
    let depth = 0;
    let cur = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i]!;
        if (c === '(') depth++;
        else if (c === ')') depth--;
        if (depth === 0 && c === op[0] && s[i + 1] === op[1]) {
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

/** True when `s` contains `op` at paren-depth 0. */
function hasTopLevelBinop(s: string, op: '&&' | '||'): boolean {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i]!;
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (depth === 0 && c === op[0] && s[i + 1] === op[1]) return true;
    }
    return false;
}

/**
 * Split a FILTER predicate into chain edges and scalar conditions. The wizard
 * emits `chain && <condition-block>` where the block is a bare condition or a
 * parenthesized `(a && b)` / `(a || b)` group; hand-written DAX may use
 * several bare `&&`-joined conditions instead.
 */
/** The predicate inside the innermost `FILTER(<table>, <body>)` of a chain. */
function innermostFilterBody(
    s: string,
): { table: string; body: string } | null {
    const idx = s.lastIndexOf('FILTER(');
    if (idx < 0) return null;
    const open = s.indexOf('(', idx);
    const close = matchingParen(s, open);
    if (close < 0) return null;
    const inner = s.slice(open + 1, close);
    const comma = topLevelComma(inner);
    if (comma < 0) return null;
    return {
        table: inner.slice(0, comma).trim(),
        body: inner.slice(comma + 1).trim(),
    };
}

function parseFilterPredicate(
    cond: string,
    to: string,
): { chain: string[]; rows: ValueCondition[]; combine: 'and' | 'or' } | null {
    const segments = splitTopLevel(cond, '&&');
    const chain: string[] = [];
    const rows: ValueCondition[] = [];
    let combine: 'and' | 'or' = 'and';
    for (const segment of segments) {
        const t = segment.trim();
        if (!t) continue;
        const group = /^\((.*)\)$/s.exec(t);
        if (group) {
            const inner = group[1]!;
            if (hasTopLevelBinop(inner, '||')) {
                combine = 'or';
                for (const part of splitTopLevel(inner, '||')) {
                    const c = parseCondition(part, to);
                    if (!c) return null;
                    rows.push(c);
                }
                continue;
            }
            const innerParts = splitTopLevel(inner, '&&');
            const parsed = innerParts
                .map((p) => parseCondition(p, to))
                .filter((c): c is ValueCondition => c !== undefined);
            if (parsed.length) {
                rows.push(...parsed);
                continue;
            }
        }
        const c = parseCondition(t, to);
        if (c) rows.push(c);
        // Anything else — a `TRIM(a)=TRIM(b)` edge, a nested correlated
        // `COUNTROWS(FILTER(…)) > 0` predicate, … — belongs to the chain and is
        // left for `parseChain` to mine the join edges out of.
        else {
            chain.push(t);
            // Base-table conditions are embedded in the innermost
            // FILTER(from, …) body (W2-3). Dig them out so the round-trip
            // keeps them on the spec.
            const innerBody = innermostFilterBody(t);
            if (innerBody) {
                const sub = parseFilterPredicate(innerBody.body, to);
                if (sub) {
                    rows.push(...sub.rows);
                    if (sub.combine === 'or') combine = 'or';
                }
            }
        }
    }
    return { chain, rows, combine };
}

/** The table name of a `TRIM(<table>[<col>])` prefix, or null. */
function stripTrimTable(s: string): string | null {
    const m = /^\s*TRIM\s*\(\s*([a-zA-Z_][\w]*)\s*\[/.exec(s);
    return m ? m[1]! : null;
}

/** True when the value side is a literal (quoted string, number, or `{…}` list). */
function isLiteral(s: string): boolean {
    const t = s.trim();
    if (/^-?\d+(\.\d+)?$/.test(t)) return true;
    if (
        t.length >= 2 &&
        ((t.startsWith("'") && t.endsWith("'")) ||
            (t.startsWith('"') && t.endsWith('"')))
    )
        return true;
    return t.startsWith('{') && t.endsWith('}');
}

/** Split a `{…}` IN list on commas, honouring quotes and `''` escapes. */
function splitInList(inner: string): string[] {
    const parts: string[] = [];
    let cur = '';
    let quote: string | null = null;
    for (let i = 0; i < inner.length; i++) {
        const c = inner[i]!;
        if (quote) {
            if (c === quote) {
                if (inner[i + 1] === quote) {
                    cur += c;
                    i += 1;
                } else quote = null;
            } else cur += c;
        } else if (c === "'" || c === '"') {
            quote = c;
        } else if (c === ',') {
            parts.push(cur.trim());
            cur = '';
        } else cur += c;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
}

/** Remove one wrapping quote pair and collapse doubled quotes. */
function unescapeValue(v: string): string {
    return v
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/''/g, "'");
}

/** True when a predicate's left side is a simple `TRIM(table[col])` reference. */
function isTrimCol(s: string): boolean {
    return /^TRIM\s*\(\s*[a-zA-Z_][\w]*\s*\[\s*[^\]]+\s*\]\s*\)$/i.test(
        s.trim(),
    );
}

function parseCondition(s: string, to: string): ValueCondition | undefined {
    const t = s.trim();
    // `TRIM(table[col]) IN { … }` / `NOT IN { … }`
    const inMatch = /^(.*?)\s+(NOT\s+IN|IN)\s*\{([\s\S]*)\}\s*$/i.exec(t);
    if (inMatch) {
        if (!isTrimCol(inMatch[1]!)) return undefined;
        const col = stripTrimBrackets(inMatch[1]!);
        if (!col) return undefined;
        const table = stripTrimTable(inMatch[1]!);
        const op: ValueCondition['op'] = inMatch[2]!
            .toUpperCase()
            .includes('NOT')
            ? 'notIn'
            : 'in';
        const values = splitInList(inMatch[3]!)
            .map(unescapeValue)
            .filter((v) => v !== '');
        if (!values.length) return undefined;
        return {
            ...(table && table !== to ? { table } : {}),
            column: col,
            op,
            value: values[0]!,
            values,
        };
    }
    const m = COND_OP_RE.exec(t);
    if (!m) return undefined;
    const colPart = t.slice(0, m.index).trim();
    const valPart = t.slice(m.index + m[0].length).trim();
    // A scalar condition always has a plain `TRIM(table[col])` left side; the
    // correlated chain predicate is `COUNTROWS(FILTER(…)) > 0`, which must NOT
    // be mistaken for one.
    if (!isTrimCol(colPart)) return undefined;
    const col = stripTrimBrackets(colPart);
    if (!col) return undefined;
    const table = stripTrimTable(colPart);
    const opMap: Record<string, ValueCondition['op']> = {
        '>': 'gt',
        '>=': 'gte',
        '<': 'lt',
        '<=': 'lte',
        '=': 'eq',
        '<>': 'neq',
    };
    const op = opMap[m[1]!];
    if (!op || !isLiteral(valPart)) return undefined;
    return {
        ...(table && table !== to ? { table } : {}),
        column: col,
        op,
        value: unescapeValue(valPart),
    };
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
