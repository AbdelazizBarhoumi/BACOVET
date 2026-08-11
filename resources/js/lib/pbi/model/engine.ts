// Custom measure creation + lightweight DAX evaluation, and the aggregation
// / chart-data compute engine for the report canvas.

import { applyTableRows, filterTableRows, type ReportFilter } from '../filters';
import type { RelationGraph } from '../graph';
import { isListMeasure, listMeasureValue } from './aggregate';
import {
    AGGREGATION_FUNCS,
    ITERATOR_FUNCS,
    LIST_FUNCS,
    SCALAR_FUNCS,
    SLICER_TYPES,
    TABLE_FUNCS,
} from './consts';
import { fieldLabel, measureLabel } from './format';
import {
    fieldType,
    findTableByName,
    findTableForField,
    isMeasure,
    LIST_MEASURE_IMPL,
    MEASURE_IMPL,
    TABLES,
} from './state';
import type {
    EvalCtx,
    ListMeasureImpl,
    MeasureImpl,
    MeasureValidation,
    Row,
    TableDef,
    ValueAggregationMode,
    Visual,
    WellField,
    ScatterPoint,
} from './types';

/* ------------------------------------------------------------------ */
/* Custom measure creation + lightweight DAX evaluation                */
/* ------------------------------------------------------------------ */

/** Splits a `Table[Column]` (or `'Table Name'[Column]`, `[Column]`, `Table`) ref. */
export function parseDaxRef(arg: string): {
    table?: string;
    column?: string;
} {
    const trimmed = arg.trim();
    const quoted =
        trimmed.match(/^(?:'([^']+)'\s*)?\[([^\]]+)\]$/) ??
        trimmed.match(/^([^[\]]+)\s*\[([^\]]+)\]$/);
    if (quoted)
        return {
            table: (quoted[1] ?? '').trim() || undefined,
            column: quoted[2]!.trim(),
        };
    if (/^[^[\]]+$/.test(trimmed) && trimmed) return { table: trimmed };
    return {};
}

/* ------------------------------------------------------------------ */
/* Measure expression parser / evaluator                                */
/*                                                                      */
/* Supports a small, safe subset of DAX plus the simplified Phase-3     */
/* forms: SUM(Sales), AVG(Price), COUNT(Customer), SUM(Sales)-SUM(Cost) */
/* Column refs may be bare (`Sales`) or qualified (`Sales[Amount]`).    */
/* ------------------------------------------------------------------ */

export type MeasureEvalError = Error;

class MeasureSyntaxError extends Error {}

type MeasureNode =
    | { kind: 'num'; value: number }
    | { kind: 'string'; value: string }
    | { kind: 'col'; table?: string; column: string }
    | { kind: 'func'; name: string; args: MeasureNode[] }
    | {
          kind: 'binop';
          op: '+' | '-' | '*' | '/' | '%';
          left: MeasureNode;
          right: MeasureNode;
      }
    | {
          kind: 'cmp';
          op: '=' | '<>' | '<' | '>' | '<=' | '>=';
          left: MeasureNode;
          right: MeasureNode;
      }
    | {
          kind: 'in';
          op: 'in' | 'notIn';
          left: MeasureNode;
          values: (string | number)[];
      }
    | {
          kind: 'logic';
          op: '&&' | '||';
          left: MeasureNode;
          right: MeasureNode;
      }
    | { kind: 'ref'; name: string }
    | { kind: 'table'; name: string }
    | { kind: 'tablecol'; base: MeasureNode; column: string };

type CmpOp = '=' | '<>' | '<' | '>' | '<=' | '>=';

const CMP_OPS = new Set<CmpOp>(['=', '<>', '<', '>', '<=', '>=']);

/** Type guard narrowing a token operator to a comparison operator. */
function isCmpOp(v: string): v is CmpOp {
    return CMP_OPS.has(v as CmpOp);
}

type Token =
    | { type: 'num'; value: number }
    | { type: 'string'; value: string }
    | { type: 'word'; value: string }
    | { type: 'qword'; value: string }
    | { type: 'bracket'; value: string }
    | { type: 'table'; value: string }
    | { type: 'lparen' | 'rparen' | 'lbrace' | 'rbrace' | 'comma' }
    | {
          type: 'op';
          value:
              | '+'
              | '-'
              | '*'
              | '/'
              | '%'
              | '='
              | '<>'
              | '<'
              | '>'
              | '<='
              | '>='
              | '&&'
              | '||';
      };

/**
 * Scan a quoted literal starting at `src[i]` (which is `'` or `"`), unescaping
 * doubled quotes (`''` / `""`) DAX-style. Returns the unescaped value and the
 * index just past the closing quote.
 */
function scanQuoted(
    src: string,
    i: number,
): { value: string; next: number } {
    const q = src[i]!;
    let j = i + 1;
    let value = '';
    while (j < src.length) {
        const c = src[j]!;
        if (c === q) {
            if (src[j + 1] === q) {
                value += q;
                j += 2;
                continue;
            }
            return { value, next: j + 1 };
        }
        value += c;
        j += 1;
    }
    throw new MeasureSyntaxError('Guillemet non fermé');
}

function tokenize(src: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i]!;
        if (/\s/.test(c)) {
            i += 1;
            continue;
        }
        if (c === '[') {
            const end = src.indexOf(']', i + 1);
            if (end < 0) throw new MeasureSyntaxError('Crochet non fermé');
            tokens.push({
                type: 'bracket',
                value: src.slice(i + 1, end).trim(),
            });
            i = end + 1;
            continue;
        }
        if (c === '(') {
            tokens.push({ type: 'lparen' });
            i += 1;
            continue;
        }
        if (c === ')') {
            tokens.push({ type: 'rparen' });
            i += 1;
            continue;
        }
        if (c === '{') {
            tokens.push({ type: 'lbrace' });
            i += 1;
            continue;
        }
        if (c === '}') {
            tokens.push({ type: 'rbrace' });
            i += 1;
            continue;
        }
        if (c === ',') {
            tokens.push({ type: 'comma' });
            i += 1;
            continue;
        }
        if (c === '"') {
            const scanned = scanQuoted(src, i);
            tokens.push({ type: 'string', value: scanned.value });
            i = scanned.next;
            continue;
        }
        if (c === '<') {
            const end = src.indexOf('>', i + 1);
            if (end >= 0 && src.slice(i + 1, end).trim()) {
                tokens.push({
                    type: 'table',
                    value: src.slice(i + 1, end).trim(),
                });
                i = end + 1;
                continue;
            }
        }
        if (c === '<' && src[i + 1] === '=') {
            tokens.push({ type: 'op', value: '<=' });
            i += 2;
            continue;
        }
        if (c === '>' && src[i + 1] === '=') {
            tokens.push({ type: 'op', value: '>=' });
            i += 2;
            continue;
        }
        if (c === '<' && src[i + 1] === '>') {
            tokens.push({ type: 'op', value: '<>' });
            i += 2;
            continue;
        }
        if (c === '&' && src[i + 1] === '&') {
            tokens.push({ type: 'op', value: '&&' });
            i += 2;
            continue;
        }
        if (c === '|' && src[i + 1] === '|') {
            tokens.push({ type: 'op', value: '||' });
            i += 2;
            continue;
        }
        if (c === '+' || c === '-' || c === '*' || c === '/' || c === '%') {
            tokens.push({ type: 'op', value: c });
            i += 1;
            continue;
        }
        if (c === '=') {
            tokens.push({ type: 'op', value: '=' });
            i += 1;
            continue;
        }
        if (c === '<') {
            tokens.push({ type: 'op', value: '<' });
            i += 1;
            continue;
        }
        if (c === '>') {
            tokens.push({ type: 'op', value: '>' });
            i += 1;
            continue;
        }
        if (c === "'") {
            const scanned = scanQuoted(src, i);
            tokens.push({ type: 'qword', value: scanned.value });
            i = scanned.next;
            continue;
        }
        if (/[0-9]/.test(c)) {
            const m = src.slice(i).match(/^\d+(?:\.\d+)?/);
            if (!m) throw new MeasureSyntaxError('Nombre invalide');
            tokens.push({ type: 'num', value: Number(m[0]) });
            i += m[0].length;
            continue;
        }
        if (/[\p{L}_]/u.test(c)) {
            const m = src.slice(i).match(/^[\p{L}\p{N}_]+/u);
            if (!m) throw new MeasureSyntaxError('Identifiant invalide');
            tokens.push({ type: 'word', value: m[0] });
            i += m[0].length;
            continue;
        }
        throw new MeasureSyntaxError(`Caractère inattendu « ${c} »`);
    }
    return tokens;
}

type ParseState = { tokens: Token[]; pos: number };

function peekToken(t: ParseState): Token | undefined {
    return t.tokens[t.pos];
}

function takeToken(t: ParseState): Token | undefined {
    return t.tokens[t.pos++];
}

function expectToken(t: ParseState, type: Token['type']): Token {
    const tok = takeToken(t);
    if (!tok || tok.type !== type)
        throw new MeasureSyntaxError(`« ${type} » attendu`);
    return tok;
}

function parseExpr(t: ParseState): MeasureNode {
    let left = parseTerm(t);
    for (;;) {
        const tok = peekToken(t);
        if (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
            takeToken(t);
            const right = parseTerm(t);
            left = { kind: 'binop', op: tok.value, left, right };
        } else break;
    }
    return left;
}

function parseCompare(t: ParseState): MeasureNode {
    let left = parseExpr(t);
    for (;;) {
        const tok = peekToken(t);
        if (
            tok?.type === 'op' &&
            tok.value !== '&&' &&
            tok.value !== '||' &&
            isCmpOp(tok.value)
        ) {
            takeToken(t);
            const right = parseExpr(t);
            left = { kind: 'cmp', op: tok.value, left, right };
        } else break;
    }
    return maybeInList(t, left);
}

/**
 * Postfix `IN { … }` / `NOT IN { … }` on a comparison operand, e.g.
 * `TRIM(orders[Status]) IN {'open', 'closed'}`.
 */
function maybeInList(t: ParseState, left: MeasureNode): MeasureNode {
    const first = peekToken(t);
    let negate = false;
    let next = first;
    if (first?.type === 'word' && first.value.toUpperCase() === 'NOT') {
        const second = t.tokens[t.pos + 1];
        if (second?.type === 'word' && second.value.toUpperCase() === 'IN') {
            negate = true;
            t.pos += 2;
            next = peekToken(t);
        }
    } else if (first?.type === 'word' && first.value.toUpperCase() === 'IN') {
        t.pos += 1;
        next = peekToken(t);
    } else {
        return left;
    }
    if (next?.type !== 'lbrace') {
        throw new MeasureSyntaxError(
            'Une liste « { … } » est attendue après IN.',
        );
    }
    takeToken(t);
    const values: (string | number)[] = [];
    if (peekToken(t)?.type !== 'rbrace') {
        for (;;) {
            const tok = takeToken(t);
            if (!tok) throw new MeasureSyntaxError('Liste IN incomplète.');
            if (tok.type === 'num') values.push(tok.value);
            else if (tok.type === 'string' || tok.type === 'qword')
                values.push(tok.value);
            else throw new MeasureSyntaxError('Valeur de liste IN invalide.');
            if (peekToken(t)?.type === 'comma') {
                takeToken(t);
                continue;
            }
            break;
        }
    }
    expectToken(t, 'rbrace');
    return { kind: 'in', op: negate ? 'notIn' : 'in', left, values };
}

function parseAnd(t: ParseState): MeasureNode {
    let left = parseCompare(t);
    for (;;) {
        const tok = peekToken(t);
        if (tok?.type === 'op' && tok.value === '&&') {
            takeToken(t);
            const right = parseCompare(t);
            left = { kind: 'logic', op: '&&', left, right };
        } else break;
    }
    return left;
}

function parseOr(t: ParseState): MeasureNode {
    let left = parseAnd(t);
    for (;;) {
        const tok = peekToken(t);
        if (tok?.type === 'op' && tok.value === '||') {
            takeToken(t);
            const right = parseAnd(t);
            left = { kind: 'logic', op: '||', left, right };
        } else break;
    }
    return left;
}

function parseTerm(t: ParseState): MeasureNode {
    let left = parseFactor(t);
    for (;;) {
        const tok = peekToken(t);
        if (
            tok?.type === 'op' &&
            (tok.value === '*' || tok.value === '/' || tok.value === '%')
        ) {
            takeToken(t);
            const right = parseFactor(t);
            left = { kind: 'binop', op: tok.value, left, right };
        } else break;
    }
    return left;
}

function maybeTableCol(t: ParseState, node: MeasureNode): MeasureNode {
    if (peekToken(t)?.type === 'bracket') {
        const column = takeToken(t) as { type: 'bracket'; value: string };
        return { kind: 'tablecol', base: node, column: column.value };
    }
    return node;
}

function parseFactor(t: ParseState): MeasureNode {
    const tok = takeToken(t);
    if (!tok) throw new MeasureSyntaxError('Expression incomplète');
    if (tok.type === 'num') return { kind: 'num', value: tok.value };
    if (tok.type === 'op' && tok.value === '-') {
        const inner = parseFactor(t);
        return {
            kind: 'binop',
            op: '-',
            left: { kind: 'num', value: 0 },
            right: inner,
        };
    }
    if (tok.type === 'string') return { kind: 'string', value: tok.value };
    if (tok.type === 'lparen') {
        const inner = parseOr(t);
        expectToken(t, 'rparen');
        return maybeTableCol(t, inner);
    }
    if (tok.type === 'bracket') return { kind: 'ref', name: tok.value };
    if (tok.type === 'table')
        return maybeTableCol(t, { kind: 'table', name: tok.value });
    if (tok.type === 'word') {
        if (peekToken(t)?.type === 'lparen') {
            takeToken(t);
            const args: MeasureNode[] = [];
            if (peekToken(t)?.type !== 'rparen') {
                args.push(parseOr(t));
                while (peekToken(t)?.type === 'comma') {
                    takeToken(t);
                    args.push(parseOr(t));
                }
            }
            expectToken(t, 'rparen');
            return maybeTableCol(t, { kind: 'func', name: tok.value, args });
        }
        if (peekToken(t)?.type === 'bracket') {
            const column = takeToken(t) as { type: 'bracket'; value: string };
            return { kind: 'col', table: tok.value, column: column.value };
        }
        return { kind: 'col', column: tok.value };
    }
    if (tok.type === 'qword') {
        if (peekToken(t)?.type === 'bracket') {
            const column = takeToken(t) as { type: 'bracket'; value: string };
            return { kind: 'col', table: tok.value, column: column.value };
        }
        return { kind: 'string', value: tok.value };
    }
    throw new MeasureSyntaxError(`Syntaxe inattendue (${tok.type})`);
}

function walkNode(node: MeasureNode, visit: (n: MeasureNode) => void): void {
    visit(node);
    if (node.kind === 'func') for (const a of node.args) walkNode(a, visit);
    else if (
        node.kind === 'binop' ||
        node.kind === 'cmp' ||
        node.kind === 'logic'
    ) {
        walkNode(node.left, visit);
        walkNode(node.right, visit);
    } else if (node.kind === 'in') walkNode(node.left, visit);
    else if (node.kind === 'tablecol') walkNode(node.base, visit);
}

function tryCompile(
    expression: string,
): { ok: true; node: MeasureNode } | { ok: false; error: string } {
    // Only a top-level `Name = <body>` separator counts: a bare `VALUES(…)`
    // body must not be truncated at the first nested chain-edge `=`.
    let depth = 0;
    let split = -1;
    for (let i = 0; i < expression.length; i++) {
        const c = expression[i]!;
        if (c === '(' || c === '[' || c === '{') depth += 1;
        else if (c === ')' || c === ']' || c === '}') depth -= 1;
        else if (c === '=' && depth === 0) {
            split = i;
            break;
        }
    }
    const rhs = (
        split >= 0 ? expression.slice(split + 1) : expression
    ).trim();
    if (!rhs) return { ok: false, error: 'Expression vide.' };
    try {
        const tokens = tokenize(rhs);
        if (!tokens.length) return { ok: false, error: 'Expression vide.' };
        const state: ParseState = { tokens, pos: 0 };
        const node = parseOr(state);
        if (state.pos < tokens.length) {
            return {
                ok: false,
                error: `Caractère inattendu à la fin de l'expression.`,
            };
        }
        return { ok: true, node };
    } catch (e) {
        return {
            ok: false,
            error:
                e instanceof MeasureSyntaxError
                    ? e.message
                    : 'Expression invalide.',
        };
    }
}

/** Column values from rows, with fallback resolution for referenced columns. */
function resolveColumn(
    column: string,
    rows: Row[],
    ctx: EvalCtx,
    table?: string,
): (string | number | boolean | null)[] {
    const sample = rows[0];
    const present = !!sample && column in sample;
    if (!present) {
        const candidates: string[] = table && table !== '' ? [table] : [];
        if (!candidates.length) {
            const found = findTableForField(column, ctx.tables);
            if (found) candidates.push(found);
        }
        const sourceTables = ctx.tables ?? TABLES;
        for (const name of candidates) {
            const source = findTableByName(name, sourceTables);
            if (!source) continue;
            // The named table exists: resolve against its schema. Empty row
            // sets (a per-row context that matches nothing) stay valid — the
            // column itself is known, so the result is an empty list, not an
            // error (that's the "employee with no data → —" contract).
            const knownColumn = source.fields.some((f) => f.name === column);
            if (
                knownColumn &&
                (source.rows.length === 0 || column in source.rows[0]!)
            ) {
                // A window/CALCULATE filter that matched nothing must yield an
                // empty result set (blank measure), while a global (top-level)
                // evaluation over empty rows keeps resolving to the whole table.
                if (rows.length === 0 && ctx.strictEmpty) return [];
                return source.rows.map((r) => r[column] ?? null);
            }
            if (!knownColumn && source.rows.length) {
                const message = `Colonne « ${column} » introuvable.`;
                ctx.errors?.push(message);
                throw new MeasureSyntaxError(message);
            }
        }
    }
    if (sample && !present && !table) {
        const message = `Colonne « ${column} » introuvable.`;
        ctx.errors?.push(message);
        throw new MeasureSyntaxError(message);
    }
    return rows.map((r) => r[column] ?? null);
}

function numericOf(values: (string | number | boolean | null)[]): number[] {
    return values
        .filter((v) => v !== null && v !== undefined && v !== '')
        .map(Number)
        .filter(Number.isFinite);
}

/** The column a value-aggregation is applied to (a column or a `[Name]` ref). */
function columnNameOf(node: MeasureNode): string {
    if (node.kind === 'col') return node.column;
    if (node.kind === 'ref') return node.name;
    throw new MeasureSyntaxError('Une colonne est attendue en argument.');
}

function isTruthy(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return String(value).trim() !== '';
}

/** Membership equality for `IN` lists: numeric when both sides are numbers. */
function scalarEquals(a: unknown, b: unknown): boolean {
    const aNum = typeof a === 'number' ? a : Number.NaN;
    const bNum = typeof b === 'number' ? b : Number.NaN;
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum === bNum;
    return String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
}

function compareScalar(a: unknown, b: unknown, op: CmpOp): boolean {
    const aNum = typeof a === 'number' ? a : Number.NaN;
    const bNum = typeof b === 'number' ? b : Number.NaN;
    const numeric = Number.isFinite(aNum) && Number.isFinite(bNum);
    if (numeric) {
        switch (op) {
            case '=':
                return aNum === bNum;
            case '<>':
                return aNum !== bNum;
            case '<':
                return aNum < bNum;
            case '>':
                return aNum > bNum;
            case '<=':
                return aNum <= bNum;
            case '>=':
                return aNum >= bNum;
        }
    }
    const as = String(a ?? '').toLowerCase();
    const bs = String(b ?? '').toLowerCase();
    switch (op) {
        case '=':
            return as === bs;
        case '<>':
            return as !== bs;
        case '<':
            return as < bs;
        case '>':
            return as > bs;
        case '<=':
            return as <= bs;
        case '>=':
            return as >= bs;
    }
    return false;
}

/** Rows of a named table from the loaded dataset (or a ctx table set). */
function tableRowsFor(table: string, tables?: TableDef[]): Row[] {
    const source = findTableByName(table, tables);
    return source?.rows ?? [];
}

/**
 * The keyword a bare `ASC` / `DESC` (or `'ASC'`) token parses to. Direction
 * arguments are literal words, not column cells, so `evalCondition` (which
 * would read a cell) must not be used for them.
 */
function dirKeyword(node: MeasureNode | undefined): string {
    if (!node) return '';
    if (node.kind === 'col') return String(node.column).toUpperCase();
    if (node.kind === 'ref') return String(node.name).toUpperCase();
    if (node.kind === 'string') return String(node.value).toUpperCase();
    return '';
}

/**
 * Resolves a single cell of a table-qualified (or bare) column inside an
 * iterator context: the current iteration row first, then enclosing iterator
 * rows (outermost last), then falls back to the loaded table's first row.
 */
function cellValue(
    table: string | undefined,
    column: string,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): unknown {
    if (frame && column in frame.row) {
        if (!table || table === frame.table) return frame.row[column] ?? null;
    }
    const stack = ctx.iter ?? [];
    for (let i = stack.length - 1; i >= 0; i -= 1) {
        const f = stack[i]!;
        if (column in f.row) {
            if (!table || table === f.table) return f.row[column] ?? null;
        }
    }
    return null;
}

/**
 * Evaluates a scalar node against a single iteration frame (row) plus the
 * enclosing row context.
 */
function evalCondition(
    node: MeasureNode,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): unknown {
    switch (node.kind) {
        case 'num':
            return node.value;
        case 'string':
            return node.value;
        case 'col':
            return cellValue(node.table, node.column, frame, ctx);
        case 'ref': {
            const known = ctx.measures;
            const fn =
                known && node.name in known
                    ? known[node.name]
                    : (MEASURE_IMPL[node.name] ?? null);
            if (fn)
                return fn(frame ? [frame.row] : [], {
                    ...ctx,
                    iter: frame
                        ? [...(ctx.iter ?? []), frame]
                        : (ctx.iter ?? []),
                });
            return cellValue(undefined, node.name, frame, ctx);
        }
        case 'func':
            return evalConditionFunction(node, frame, ctx);
        case 'binop': {
            const left = Number(evalCondition(node.left, frame, ctx) ?? 0);
            const right = Number(evalCondition(node.right, frame, ctx) ?? 0);
            if (node.op === '+') return left + right;
            if (node.op === '-') return left - right;
            if (node.op === '*') return left * right;
            if (node.op === '/') return right === 0 ? 0 : left / right;
            if (node.op === '%') return right === 0 ? 0 : left % right;
            return 0;
        }
        case 'cmp': {
            const left = evalCondition(node.left, frame, ctx);
            const right = evalCondition(node.right, frame, ctx);
            return compareScalar(left, right, node.op);
        }
        case 'in': {
            const left = evalCondition(node.left, frame, ctx);
            const matches = node.values.some((v) => scalarEquals(left, v));
            return node.op === 'notIn' ? !matches : matches;
        }
        case 'logic': {
            const left = evalCondition(node.left, frame, ctx);
            if (node.op === '&&')
                return (
                    isTruthy(left) &&
                    isTruthy(evalCondition(node.right, frame, ctx))
                );
            return (
                isTruthy(left) ||
                isTruthy(evalCondition(node.right, frame, ctx))
            );
        }
        case 'table':
            return null;
        case 'tablecol':
            return null;
    }
}

function evalConditionFunction(
    node: Extract<MeasureNode, { kind: 'func' }>,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): unknown {
    const name = node.name.toUpperCase();
    const args = node.args;

    if (name === 'IF') {
        const cond = args[0];
        const thenValue = args[1];
        const elseValue = args[2];
        return isTruthy(evalCondition(cond, frame, ctx))
            ? evalCondition(thenValue, frame, ctx)
            : elseValue
              ? evalCondition(elseValue, frame, ctx)
              : 0;
    }
    if (name === 'AND')
        return (
            isTruthy(evalCondition(args[0], frame, ctx)) &&
            isTruthy(evalCondition(args[1], frame, ctx))
        );
    if (name === 'OR')
        return (
            isTruthy(evalCondition(args[0], frame, ctx)) ||
            isTruthy(evalCondition(args[1], frame, ctx))
        );
    if (SCALAR_FUNCS.has(name)) return evalScalarFunction(node, frame, ctx);
    // Aggregate calls used inside a condition: thread the current row in.
    return evalFunction(node, frame ? [frame.row] : [], {
        ...ctx,
        iter: frame ? [...(ctx.iter ?? []), frame] : (ctx.iter ?? []),
    });
}

const scalarNumber = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const scalarText = (v: unknown): string => String(v ?? '');

function midnightEpoch(d: Date): number {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
}

/** Coerces a raw cell value into an epoch-milliseconds date. */
function dateEpoch(v: unknown): number {
    if (v instanceof Date) {
        return typeof (v as unknown as { getTime?: unknown }).getTime ===
            'function'
            ? (v as Date).getTime()
            : NaN;
    }
    if (typeof v === 'number') {
        if (!Number.isFinite(v)) return NaN;
        const ms = v > 100000000000 ? v : v * 1000;
        return isNaN(midnightEpoch(new Date(ms)))
            ? NaN
            : (midnightEpoch(new Date(ms)), ms);
    }
    const s = scalarText(v);
    const month = /^(\d{4})-(\d{2})$/.exec(s);
    if (month) {
        const y = Number(month[1]);
        const m = Number(month[2]);
        if (m >= 1 && m <= 12) return Date.UTC(y, m - 1, 1);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? NaN : d.getTime();
}

/** Evaluates a scalar/row-context function to a primitive. */
function evalScalarFunction(
    node: Extract<MeasureNode, { kind: 'func' }>,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): unknown {
    const name = node.name.toUpperCase();
    const args = node.args;
    const a = (i: number) => evalCondition(args[i], frame, ctx);
    const n = (i: number) => scalarNumber(a(i));

    switch (name) {
        case 'NOT':
            return isTruthy(a(0)) ? 0 : 1;
        case 'SWITCH': {
            const expr = args[0];
            const match = evalCondition(expr, frame, ctx);
            for (let i = 1; i + 1 < args.length; i += 2) {
                if (compareScalar(match, a(i), '='))
                    return evalCondition(args[i + 1], frame, ctx);
            }
            if (args.length > 1 && args.length % 2 === 0)
                return evalCondition(args[args.length - 1]!, frame, ctx);
            return 0;
        }
        case 'IFERROR':
            try {
                return evalCondition(args[0], frame, ctx);
            } catch {
                return args[1] ? evalCondition(args[1], frame, ctx) : 0;
            }
        case 'ABS':
            return Math.abs(n(0));
        case 'ROUND':
            return Math.round(n(0) * 10 ** n(1)) / 10 ** n(1);
        case 'ROUNDUP':
            return Math.ceil(n(0) * 10 ** n(1)) / 10 ** n(1);
        case 'ROUNDDOWN':
            return Math.floor(n(0) * 10 ** n(1)) / 10 ** n(1);
        case 'POWER':
            return Math.pow(n(0), n(1));
        case 'DIVIDE': {
            const d = n(1);
            if (d !== 0) return n(0) / d;
            // Zero denominator: DAX returns the 3rd default — `0`, `BLANK`
            // (when omitted), or `NA()`. The engine coerces BLANK to 0 and
            // surfaces NA as an error so it never reads as a silent 0.
            if (args.length < 3) return 0;
            const fallback = a(2);
            if (typeof fallback === 'number' && Number.isNaN(fallback))
                throw new MeasureSyntaxError(
                    'DIVIDE par zéro (le dénominateur est 0 et la valeur par défaut est NA()).',
                );
            return scalarNumber(fallback);
        }
        case 'MOD': {
            const d = n(1);
            return d === 0 ? 0 : n(0) % d;
        }
        case 'BLANK':
            return 0;
        case 'NA':
            return Number.NaN;
        case 'SQRT':
            return Math.sqrt(n(0));
        case 'INT':
            return Math.floor(n(0));
        case 'SIGN':
            return Math.sign(n(0));
        case 'LEN':
            return scalarText(a(0)).length;
        case 'UPPER':
            return scalarText(a(0)).toUpperCase();
        case 'LOWER':
            return scalarText(a(0)).toLowerCase();
        case 'LEFT': {
            const t = scalarText(a(0));
            return t.slice(0, Math.max(0, n(1)));
        }
        case 'RIGHT': {
            const t = scalarText(a(0));
            const k = Math.max(0, n(1));
            return k === 0 ? '' : t.slice(-k);
        }
        case 'MID': {
            const t = scalarText(a(0));
            return t.slice(Math.max(0, n(1) - 1), Math.max(0, n(1) - 1) + n(2));
        }
        case 'SUBSTITUTE':
            return scalarText(a(0))
                .split(scalarText(a(1)))
                .join(scalarText(a(2)));
        case 'SEARCH': {
            const idx = scalarText(a(1))
                .toLowerCase()
                .indexOf(scalarText(a(0)).toLowerCase());
            return idx < 0 ? 0 : idx + 1;
        }
        case 'VALUE': {
            const v = scalarText(a(0)).trim();
            return v ? Number(v) : 0;
        }
        case 'CONCATENATE':
            return scalarText(a(0)) + scalarText(a(1));
        case 'FORMAT':
            return String(a(0));
        case 'TRIM':
            return scalarText(a(0)).trim();
        case 'RELATED': {
            const colNode = args[0];
            const column =
                colNode && colNode.kind === 'col'
                    ? colNode.column
                    : colNode && colNode.kind === 'ref'
                      ? colNode.name
                      : undefined;
            if (!column) return 0;
            const direct = cellValue(
                colNode?.kind === 'col'
                    ? colNode.table
                    : (undefined as string | undefined),
                column,
                frame,
                ctx,
            );
            if (direct !== null && direct !== undefined) return direct;
            const host = ctx.tables ?? TABLES;
            if (frame) {
                for (const t of host) {
                    if (!t.rows.length || !(column in t.rows[0]!)) continue;
                    for (const row of t.rows) {
                        if (row[column] === frame.row[column])
                            return row[column] ?? 0;
                    }
                }
            }
            return 0;
        }
        case 'TODAY':
            return midnightEpoch(new Date());
        case 'NOW':
            return Date.now();
        case 'DATE':
            return new Date(n(0), n(1) - 1, n(2)).getTime();
        case 'YEAR':
            return new Date(dateEpoch(a(0))).getUTCFullYear();
        case 'MONTH': {
            const d = new Date(dateEpoch(a(0)));
            return d.getUTCMonth() + 1;
        }
        case 'DAY':
            return new Date(dateEpoch(a(0))).getUTCDate();
        case 'WEEKDAY':
            return new Date(dateEpoch(a(0))).getUTCDay() + 1;
        case 'EOMONTH': {
            const d = new Date(dateEpoch(a(0)));
            return new Date(
                d.getUTCFullYear(),
                d.getUTCMonth() + 1 + n(1),
                0,
            ).getTime();
        }
        case 'DATEDIFF': {
            const unit = scalarText(a(2)).toUpperCase();
            const ms = dateEpoch(a(1)) - dateEpoch(a(0));
            switch (unit) {
                case 'DAY':
                    return Math.round(ms / 86400000);
                case 'HOUR':
                    return Math.round(ms / 3600000);
                case 'MONTH':
                    return Math.round(ms / (86400000 * 30));
                case 'YEAR':
                    return Math.round(ms / (86400000 * 365));
                default:
                    return Math.round(ms / 1000);
            }
        }
        case 'RANK':
        case 'RANKX': {
            // RANKX(<table>, <orderExpr>, [<value>], [<dir>])  (W3-3)
            // RANK(<value>, <table>, <orderExpr>, [<dir>])
            // Both return the 1-based ordinal of `value` among the table's
            // distinct ordered keys (default descending, DAX RANKX default).
            const isRankx = name === 'RANKX';
            const tableNode = isRankx ? args[0] : args[1];
            const orderNode = isRankx ? args[1] : args[2];
            const valueNode = isRankx ? args[2] : args[0];
            if (!tableNode || !orderNode) return 0;
            const frames = evalTableArg(tableNode, ctx);
            const keys = [
                ...new Set(
                    frames.map((f) =>
                        scalarNumber(evalCondition(orderNode, f, ctx)),
                    ),
                ),
            ].sort((x, y) => x - y);
            if (!keys.length) return 0;
            const ascending = dirKeyword(args[3]) === 'ASC';
            const ordered = ascending ? keys : [...keys].reverse();
            let value = valueNode
                ? scalarNumber(evalCondition(valueNode, frame, ctx))
                : Number.NaN;
            if (!Number.isFinite(value)) {
                // RANKX with no explicit value: the current row's own key.
                value =
                    frame && isRankx
                        ? scalarNumber(evalCondition(orderNode, frame, ctx))
                        : Number.NaN;
            }
            if (!Number.isFinite(value)) return 0;
            const idx = ordered.findIndex((k) => k === value);
            return idx < 0 ? 0 : idx + 1;
        }
        default:
            return undefined;
    }
}

/**
 * Rows of a table expression with the per-group axis filter removed (W3-1):
 * `ALL(<col>|<table>)` evaluates against the store's tables (`TABLES`), which
 * carry the global/slicer filters but *not* the per-group axis slice that lives
 * in `ctx.tables` — so `CALCULATE(<expr>, ALL(axis))` re-aggregates the scalar
 * over the whole dataset (the percent-of-total denominator).
 */
function unfilteredRows(
    node: MeasureNode,
    _ctx: EvalCtx,
): { table: string; row: Row }[] {
    let table: string;
    if (node.kind === 'table') {
        table = node.name;
    } else if (node.kind === 'col') {
        table =
            node.table ||
            (TABLES.some((t) => t.name === node.column)
                ? node.column
                : findTableForField(node.column, TABLES));
    } else {
        throw new MeasureSyntaxError(
            'ALL() attend une table ou une colonne.',
        );
    }
    return tableRowsFor(table, TABLES).map((row) => ({ table, row }));
}

/**
 * Resolves a table expression argument: a table name, a bare column (the
 * table owning the column), or a FILTER(...) over another table expression.
 */
function evalTableArg(
    node: MeasureNode,
    ctx: EvalCtx,
): { table: string; row: Row }[] {
    if (node.kind === 'table') {
        return tableRowsFor(node.name, ctx.tables).map((row) => ({
            table: node.name,
            row,
        }));
    }
    if (node.kind === 'col') {
        const tables = ctx.tables ?? TABLES;
        const table =
            node.table ||
            (tables.some((t) => t.name === node.column)
                ? node.column
                : findTableForField(node.column, tables));
        return tableRowsFor(table, tables).map((row) => ({ table, row }));
    }
    if (node.kind === 'func' && node.name.toUpperCase() === 'FILTER') {
        const base = evalTableArg(node.args[0], ctx);
        const cond = node.args[1];
        return base.filter((frame) =>
            isTruthy(evalCondition(cond, frame, ctx)),
        );
    }
    if (node.kind === 'func') {
        const fname = node.name.toUpperCase();
        if (fname === 'TOPN') {
            // DAX signature: TOPN(<n>, <table>, [<orderBy>], [<asc|desc>]).
            const frames = evalTableArg(node.args[1]!, ctx);
            const orderColumn = node.args[2];
            const ranked = frames
                .map((frame) => ({
                    frame,
                    key: scalarNumber(evalCondition(orderColumn, frame, ctx)),
                }))
                .sort((x, y) => y.key - x.key);
            // Direction is the optional 4th argument; DAX defaults to descending.
            const dir = dirKeyword(node.args[3]);
            if (dir === 'ASC') ranked.reverse();
            const n = Math.max(
                0,
                Math.floor(
                    scalarNumber(evalCondition(node.args[0]!, null, ctx)),
                ),
            );
            return ranked.slice(0, n).map((r) => r.frame);
        }
        if (fname === 'DISTINCT') {
            const frames = evalTableArg(node.args[0]!, ctx);
            const seen = new Set<string>();
            const out: { table: string; row: Row }[] = [];
            for (const f of frames) {
                const key = JSON.stringify(f.row);
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(f);
            }
            return out;
        }
        if (fname === 'ALL' || fname === 'ALLEXCEPT') {
            const base = node.args[0];
            if (!base)
                throw new MeasureSyntaxError(`${fname}() attend une table.`);
            // Remove the per-group axis filter so `COUNTROWS(ALL(t))` /
            // `SUMX(ALL(t), …)` see the whole dataset (W3-1).
            return unfilteredRows(base, ctx);
        }
        if (fname === 'CALCULATE') {
            const base = node.args[0];
            if (!base)
                throw new MeasureSyntaxError('CALCULATE() attend une table.');
            return evalTableArg(base, ctx);
        }
        if (isTimeFunc(fname)) {
            return timeWindowFrames(fname, node.args, ctx);
        }
    }
    if (node.kind === 'tablecol') {
        return evalTableArg(node.base, ctx);
    }
    throw new MeasureSyntaxError('Une table est attendue.');
}

/** The DAX time-intelligence functions resolved by `timeWindowFrames`. */
function isTimeFunc(name: string): boolean {
    return (
        name === 'DATEADD' ||
        name === 'SAMEPERIODLASTYEAR' ||
        name === 'PREVIOUSMONTH' ||
        name === 'DATESYTD' ||
        name === 'DATESQTD' ||
        name === 'TOTALYTD' ||
        name === 'TOTALMTD' ||
        name === 'TOTALQTD'
    );
}

/** Reads a numeric literal argument (used for DATEADD's step count). */
function numericArg(node: MeasureNode | undefined): number {
    if (!node) return 0;
    if (node.kind === 'num') return node.value;
    if (node.kind === 'string') {
        const n = Number(node.value);
        return Number.isFinite(n) ? n : 0;
    }
    if (
        node.kind === 'binop' &&
        node.left.kind === 'num' &&
        node.left.value === 0
    ) {
        const right = numericArg(node.right);
        return node.op === '-' ? -right : node.op === '+' ? right : 0;
    }
    return 0;
}

/** Shifts a [start, end] ms date range by `n`×`unit` (calendar-aware). */
function shiftDateRange(
    startMs: number,
    endMs: number,
    n: number,
    unit: string,
): [number, number] {
    const shift = (ms: number): number => {
        const d = new Date(ms);
        switch (unit) {
            case 'YEAR':
                d.setUTCFullYear(d.getUTCFullYear() + n);
                break;
            case 'QUARTER':
                d.setUTCMonth(d.getUTCMonth() + n * 3);
                break;
            case 'MONTH':
                d.setUTCMonth(d.getUTCMonth() + n);
                break;
            default:
                d.setUTCDate(d.getUTCDate() + n);
        }
        return d.getTime();
    };
    return [shift(startMs), shift(endMs)];
}

/**
 * Resolves a `<dates>` argument (a bare column or `table[column]`) to the
 * owning table and column name, mirroring the `col` branch of `evalTableArg`.
 */
function resolveDateColumn(
    node: MeasureNode | undefined,
    ctx: EvalCtx,
): { table: string; column: string } {
    if (!node) {
        throw new MeasureSyntaxError('Une colonne de date est attendue.');
    }
    let table: string | undefined;
    let column: string | undefined;
    if (node.kind === 'col') {
        const tables = ctx.tables ?? TABLES;
        table =
            node.table ||
            (tables.some((t) => t.name === node.column)
                ? node.column
                : findTableForField(node.column, tables));
        column = node.column;
    } else if (node.kind === 'tablecol' && node.base.kind === 'table') {
        table = node.base.name;
        column = node.column;
    }
    if (!table || !column) {
        throw new MeasureSyntaxError('Une colonne de date est attendue.');
    }
    const source = findTableByName(table, ctx.tables ?? TABLES);
    if (!source) {
        throw new MeasureSyntaxError(`Table « ${table} » introuvable.`);
    }
    if (!source.fields.some((f) => f.name === column)) {
        throw new MeasureSyntaxError(`Colonne « ${column} » introuvable.`);
    }
    return { table, column };
}

/**
 * Time-window resolution for the DAX time-intelligence functions.
 *
 * The `<dates>` argument is a date column; the anchor date is the maximum
 * loaded value of that column. Each function returns the owning table's rows
 * whose date falls inside a derived UTC window:
 *
 *   DATESYTD            [Jan 1(anchor year), anchor]
 *   TOTALYTD (scalar)   the same YTD window
 *   TOTALMTD (scalar)   [1st of anchor month, anchor]
 *   DATESQTD / TOTALQTD the quarter-to-date window of the anchor's quarter
 *   PREVIOUSMONTH       [1st of previous month, last of previous month]
 *   SAMEPERIODLASTYEAR  the YTD window shifted back one year
 *   DATEADD(n, unit)    the YTD window shifted by n×unit
 */
function timeWindowFrames(
    fname: string,
    args: MeasureNode[],
    ctx: EvalCtx,
): { table: string; row: Row }[] {
    const datesIndex =
        fname === 'TOTALYTD' || fname === 'TOTALMTD' || fname === 'TOTALQTD'
            ? 1
            : 0;
    const { table, column } = resolveDateColumn(args[datesIndex], ctx);
    const rows = tableRowsFor(table, ctx.tables ?? TABLES);
    const epochs = rows.map((r) => dateEpoch(r[column]));
    const anchor = Math.max(...epochs.filter((v) => Number.isFinite(v)));
    if (!Number.isFinite(anchor)) return [];

    const a = new Date(anchor);
    const year = a.getUTCFullYear();
    const month = a.getUTCMonth();
    const yearStart = Date.UTC(year, 0, 1);

    let start: number;
    let end: number;
    switch (fname) {
        case 'DATESYTD':
        case 'TOTALYTD':
            start = yearStart;
            end = anchor;
            break;
        case 'TOTALMTD':
            start = Date.UTC(year, month, 1);
            end = anchor;
            break;
        case 'DATESQTD':
        case 'TOTALQTD':
            start = Date.UTC(year, Math.floor(month / 3) * 3, 1);
            end = anchor;
            break;
        case 'PREVIOUSMONTH':
            start = Date.UTC(year, month - 1, 1);
            end = Date.UTC(year, month, 1) - 1;
            break;
        case 'SAMEPERIODLASTYEAR': {
            const previousYearStart = Date.UTC(year - 1, 0, 1);
            start = previousYearStart;
            end = previousYearStart + (anchor - yearStart);
            break;
        }
        case 'DATEADD': {
            const unit = (
                args[2]?.kind === 'string' ? args[2].value : ''
            ).toUpperCase();
            [start, end] = shiftDateRange(
                yearStart,
                anchor,
                numericArg(args[1]),
                unit,
            );
            break;
        }
        default:
            return [];
    }

    return rows
        .filter((r) => {
            const v = dateEpoch(r[column]);
            return Number.isFinite(v) && v >= start && v <= end;
        })
        .map((row) => ({ table, row }));
}

function evalFunction(
    node: Extract<MeasureNode, { kind: 'func' }>,
    rows: Row[],
    ctx: EvalCtx,
): number {
    const name = node.name.toUpperCase();
    const arg = node.args[0];

    if (name === 'IF') {
        return isTruthy(evalCondition(arg, null, ctx))
            ? evalIteratorValue(node.args[1]!, null, ctx)
            : evalIteratorValue(
                  node.args[2] ?? { kind: 'num', value: 0 },
                  null,
                  ctx,
              );
    }
    if (name === 'AND')
        return isTruthy(evalCondition(node.args[0], null, ctx)) &&
            isTruthy(evalCondition(node.args[1], null, ctx))
            ? 1
            : 0;
    if (name === 'OR')
        return isTruthy(evalCondition(node.args[0], null, ctx)) ||
            isTruthy(evalCondition(node.args[1], null, ctx))
            ? 1
            : 0;

    if (SCALAR_FUNCS.has(name)) {
        const v = evalScalarFunction(node, null, ctx);
        return typeof v === 'number' && Number.isFinite(v) ? v : 0;
    }

    if (ITERATOR_FUNCS.has(name)) {
        const frames = evalTableArg(node.args[0]!, ctx);
        const expr = node.args[1];
        const values = frames.map((frame) =>
            evalCondition(expr, frame, {
                ...ctx,
                iter: [...(ctx.iter ?? []), frame],
            }),
        );
        switch (name) {
            case 'SUMX': {
                let total = 0;
                for (const v of values) {
                    if (typeof v === 'number') total += v;
                    else if (typeof v === 'string') {
                        const n = Number(v);
                        if (Number.isFinite(n)) total += n;
                    } else if (v === true) total += 1;
                }
                return total;
            }
            case 'COUNTX':
                return values.filter(
                    (v) => v !== null && v !== undefined && v !== '',
                ).length;
            case 'AVERAGEX': {
                const nums = values.map(Number).filter(Number.isFinite);
                return nums.length
                    ? nums.reduce((total, value) => total + value, 0) /
                          nums.length
                    : 0;
            }
            case 'MINX': {
                const nums = values.map(Number).filter(Number.isFinite);
                return nums.length ? Math.min(...nums) : 0;
            }
            case 'MAXX': {
                const nums = values.map(Number).filter(Number.isFinite);
                return nums.length ? Math.max(...nums) : 0;
            }
            case 'PRODUCTX': {
                const nums = values.map(Number).filter(Number.isFinite);
                return nums.reduce((total, value) => total * value, 1);
            }
            default:
                return 0;
        }
    }

    if (name === 'COUNTROWS') {
        const first = node.args[0];
        if (
            first &&
            (first.kind === 'table' ||
                first.kind === 'col' ||
                (first.kind === 'func' &&
                    (first.name.toUpperCase() === 'FILTER' ||
                        first.name.toUpperCase() === 'ALL' ||
                        first.name.toUpperCase() === 'ALLEXCEPT' ||
                        first.name.toUpperCase() === 'TOPN' ||
                        first.name.toUpperCase() === 'CALCULATE' ||
                        isTimeFunc(first.name.toUpperCase()))))
        ) {
            return evalTableArg(first, ctx).length;
        }
        return rows.length;
    }
    if (name === 'FILTER') {
        return evalTableArg(node, ctx).length;
    }
    if (name === 'VALUES') {
        throw new MeasureSyntaxError(
            'VALUES renvoie une liste de valeurs et ne peut être utilisé qu’au niveau supérieur de la mesure.',
        );
    }
    if (name === 'TOTALYTD' || name === 'TOTALMTD' || name === 'TOTALQTD') {
        const expression = node.args[0];
        if (!expression) {
            throw new MeasureSyntaxError(
                `${name}() attend une expression.`,
            );
        }
        const frames = timeWindowFrames(name, node.args, ctx);
        const windowRows = frames.map((frame) => frame.row);
        return evalNode(expression, windowRows, {
            ...ctx,
            strictEmpty: windowRows.length === 0,
        });
    }

    if (name === 'CALCULATE') {
        // CALCULATE(<scalar-expr>, <date-window>) — what the Période wizard
        // emits for M-1 and SPLY: the scalar is evaluated over the rows inside
        // the window (PREVIOUSMONTH / SAMEPERIODLASTYEAR / DATESYTD / …).
        const expression = node.args[0];
        const filterArg = node.args[1];
        if (!expression) {
            throw new MeasureSyntaxError(
                'CALCULATE() attend une expression.',
            );
        }
        const win =
            filterArg && filterArg.kind === 'func'
                ? filterArg.name.toUpperCase()
                : '';
        if (win && isTimeFunc(win) && filterArg.kind === 'func') {
            const frames = timeWindowFrames(win, filterArg.args, ctx);
            const windowRows = frames.map((frame) => frame.row);
            return evalNode(expression, windowRows, {
                ...ctx,
                strictEmpty: windowRows.length === 0,
            });
        }
        // CALCULATE(<scalar>, ALL(<col>|<table>)) (W3-1): drop the current
        // group filter so the scalar aggregates over the whole dataset — the
        // denominator of a percent-of-total. ALLEXCEPT is treated the same way
        // (the app only authors ALL over the axis column).
        if (
            filterArg &&
            filterArg.kind === 'func' &&
            (win === 'ALL' || win === 'ALLEXCEPT')
        ) {
            const frames = unfilteredRows(filterArg.args[0], ctx);
            const allRows = frames.map((frame) => frame.row);
            return evalNode(expression, allRows, {
                ...ctx,
                tables: undefined,
                strictEmpty: allRows.length === 0,
            });
        }
        // CALCULATE(<scalar>, FILTER(<table>, <predicate>)) — wrapped composed
        // measures. The filter restricts the target-table rows; the descriptor
        // re-scopes that table's rows so the inner aggregate operands (SUM,
        // AVERAGE, …) sum only the matching rows.
        if (filterArg && filterArg.kind === 'func' && win === 'FILTER') {
            const frames = evalTableArg(filterArg, ctx);
            const filterRows = frames.map((frame) => frame.row);
            const filterTable = frames[0]?.table;
            if (!filterTable) {
                throw new MeasureSyntaxError(
                    'CALCULATE() FILTER attend une table.',
                );
            }
            const baseTables = ctx.tables ?? TABLES;
            const scopedTables = baseTables.map((t) =>
                t.name === filterTable ? { ...t, rows: filterRows } : t,
            );
            return evalNode(expression, [], {
                ...ctx,
                tables: scopedTables,
                strictEmpty: filterRows.length === 0,
            });
        }
        // Any other CALCULATE shape keeps the unsupported-function error.
    }

    if (!AGGREGATION_FUNCS.has(name)) {
        throw new MeasureSyntaxError(
            `Fonction « ${node.name} » non supportée.`,
        );
    }
    if (!arg) throw new MeasureSyntaxError(`${name}() attend une colonne.`);

    const column = columnNameOf(arg);
    const table = arg.kind === 'col' ? arg.table : undefined;
    const values = resolveColumn(column, rows, ctx, table);

    switch (name) {
        case 'SUM':
            return numericOf(values).reduce((t, v) => t + v, 0);
        case 'AVERAGE':
        case 'AVERAGEA':
        case 'AVG': {
            const nums = numericOf(values);
            return nums.length
                ? nums.reduce((t, v) => t + v, 0) / nums.length
                : 0;
        }
        case 'COUNT':
            return values.filter(
                (v) => v !== null && v !== undefined && v !== '',
            ).length;
        case 'COUNTA':
            return values.filter((v) => v !== null && v !== undefined).length;
        case 'DISTINCTCOUNT':
            return new Set(
                values.filter((v) => v !== null && v !== undefined && v !== ''),
            ).size;
        case 'MIN': {
            const nums = numericOf(values);
            return nums.length ? Math.min(...nums) : 0;
        }
        case 'MAX': {
            const nums = numericOf(values);
            return nums.length ? Math.max(...nums) : 0;
        }
        case 'MEDIAN': {
            const nums = numericOf(values).sort((a, b) => a - b);
            if (!nums.length) return 0;
            const mid = Math.floor(nums.length / 2);
            return nums.length % 2
                ? nums[mid]!
                : (nums[mid - 1]! + nums[mid]!) / 2;
        }
        case 'PRODUCT':
            return numericOf(values).reduce((t, v) => t * v, 1);
        default:
            return 0;
    }
}

/** Coerces a per-row scalar (condition result) into an aggregate number. */
function evalIteratorValue(
    node: MeasureNode,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): number {
    const value = evalCondition(node, frame, ctx);
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

function evalNode(node: MeasureNode, rows: Row[], ctx: EvalCtx): number {
    switch (node.kind) {
        case 'num':
            return node.value;
        case 'string':
            return 0;
        case 'col':
            return numericOf(
                resolveColumn(node.column, rows, ctx, node.table),
            ).reduce((total, value) => total + value, 0);
        case 'ref': {
            const known = ctx.measures;
            const fn =
                known && node.name in known
                    ? known[node.name]
                    : (MEASURE_IMPL[node.name] ?? null);
            if (fn) {
                const depth = ctx.depth ?? 0;
                if (depth > 8) return 0;
                return fn(rows, { ...ctx, depth: depth + 1 }) ?? 0;
            }
            return numericOf(
                resolveColumn(
                    node.name,
                    rows,
                    ctx,
                    findTableForField(node.name, ctx.tables) || undefined,
                ),
            ).reduce((total, value) => total + value, 0);
        }
        case 'table':
            return 0;
        case 'tablecol':
            return 0;
        case 'binop': {
            const left = evalNode(node.left, rows, ctx);
            const right = evalNode(node.right, rows, ctx);
            if (node.op === '+') return left + right;
            if (node.op === '-') return left - right;
            if (node.op === '*') return left * right;
            if (node.op === '/') return right === 0 ? 0 : left / right;
            if (node.op === '%') return right === 0 ? 0 : left % right;
            return 0;
        }
        case 'cmp': {
            const left = evalCondition(node.left, null, ctx);
            const right = evalCondition(node.right, null, ctx);
            return compareScalar(left, right, node.op) ? 1 : 0;
        }
        case 'in': {
            const left = evalCondition(node.left, null, ctx);
            const matches = node.values.some((v) => scalarEquals(left, v));
            return (node.op === 'notIn' ? !matches : matches) ? 1 : 0;
        }
        case 'logic': {
            const left = evalCondition(node.left, null, ctx);
            if (node.op === '&&')
                return isTruthy(left) &&
                    isTruthy(evalCondition(node.right, null, ctx))
                    ? 1
                    : 0;
            return isTruthy(left) ||
                isTruthy(evalCondition(node.right, null, ctx))
                ? 1
                : 0;
        }
        case 'func':
            return evalFunction(node, rows, ctx);
    }
}

/**
 * Compiles a measure expression into a row aggregator. Unsupported or
 * malformed expressions compile to a function that always returns 0, so
 * existing callers keep working; use `validateMeasureExpression` /
 * `evaluateMeasure` to surface errors.
 */
export function compileMeasure(expression: string): MeasureImpl {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return () => 0;
    const node = compiled.node;
    return (rows, ctx = {}) => {
        try {
            return evalNode(node, rows, ctx);
        } catch {
            return 0;
        }
    };
}

/**
 * Compiles a top-level `VALUES(<column>)`, `VALUES(<table-expr>[<column>])`,
 * or `CONCATENATEX(<table>, <expr>, <delim>)` measure into a list aggregator.
 * Returns `null` when the expression is none of those, so the numeric
 * `compileMeasure` path keeps handling everything else.
 */
export function compileListMeasure(expression: string): ListMeasureImpl | null {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return null;
    const node = compiled.node;
    if (node.kind !== 'func') return null;
    const topName = node.name.toUpperCase();
    if (topName === 'CONCATENATEX') {
        // CONCATENATEX(<table-expr>, <value-expr>, [<delim>]) (W3-5): joins the
        // per-row values into a single text cell (returned as a one-element
        // string list so the existing list/chips rendering path shows it).
        const tableNode = node.args[0];
        const exprNode = node.args[1];
        if (!tableNode || !exprNode)
            throw new MeasureSyntaxError(
                'CONCATENATEX() attend une table et une expression.',
            );
        const delimNode = node.args[2];
        return (rows, ctx = {}) => {
            const frames = evalTableArg(tableNode, ctx);
            const delim =
                delimNode && delimNode.kind === 'string'
                    ? delimNode.value
                    : ', ';
            const parts = frames
                .map((frame) => {
                    const v = evalCondition(exprNode, frame, ctx);
                    return v === null || v === undefined ? '' : String(v);
                })
                .filter((p) => p !== '');
            return parts.length ? [parts.join(delim)] : [];
        };
    }
    if (topName !== 'VALUES' && topName !== 'DISTINCT') return null;
    const arg = node.args[0];
    if (!arg)
        throw new MeasureSyntaxError(
            `${node.name.toUpperCase()}() attend une colonne.`,
        );
    let column: string;
    let table: string | undefined;
    let base: MeasureNode | null = null;
    if (arg.kind === 'col') {
        column = arg.column;
        table = arg.table;
    } else if (arg.kind === 'tablecol') {
        column = arg.column;
        base = arg.base;
    } else if (arg.kind === 'ref') {
        column = arg.name;
    } else {
        throw new MeasureSyntaxError('VALUES() attend une colonne.');
    }
    if (base) {
        return (rows, ctx = {}) => {
            const frames = evalTableArg(base, ctx);
            return [
                ...new Set(
                    frames
                        .map((f) => f.row[column] ?? null)
                        .filter(
                            (v) => v !== null && v !== undefined && v !== '',
                        )
                        .map((v) => String(v)),
                ),
            ].sort();
        };
    }
    return (rows, ctx = {}) => {
        const values = resolveColumn(column, rows, ctx, table);
        return [
            ...new Set(
                values
                    .filter((v) => v !== null && v !== undefined && v !== '')
                    .map((v) => String(v)),
            ),
        ].sort();
    };
}

/**
 * Extracts the target table + column a `VALUES()` / `DISTINCT()` list measure
 * operates on, working purely from the expression. Returns `{ table, column }`
 * when the top-level call is a list measure over a column, or `null` otherwise.
 */
export function listMeasureSource(
    expression: string,
): { table: string; column: string } | null {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return null;
    const node = compiled.node;
    if (
        node.kind !== 'func' ||
        (node.name.toUpperCase() !== 'VALUES' &&
            node.name.toUpperCase() !== 'DISTINCT')
    ) {
        return null;
    }
    const arg = node.args[0];
    if (!arg) return null;
    if (arg.kind === 'col') {
        return { table: arg.table ?? '', column: arg.column };
    }
    if (arg.kind === 'ref') {
        return { table: '', column: arg.name };
    }
    if (arg.kind === 'tablecol') {
        return { table: staticTable(arg.base) ?? '', column: arg.column };
    }
    return null;
}

/** Best-effort static table name for a table-expression node. */
function staticTable(node: MeasureNode | null): string | null {
    if (!node) return null;
    if (node.kind === 'table') return node.name;
    if (node.kind === 'col') {
        return node.table || node.column || null;
    }
    if (node.kind === 'tablecol') return staticTable(node.base);
    if (node.kind === 'func' && node.name.toUpperCase() === 'FILTER') {
        return staticTable(node.args[0] ?? null);
    }
    return null;
}

/**
 * Returns the `Table[column]` / `[column]` references a measure expression
 * depends on, so callers can resolve the rows the measure should be evaluated
 * against (enrichment, measure-only visuals).
 */
export function measureColumnRefs(
    expression: string,
): { table?: string; column: string }[] {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return [];
    const refs: { table?: string; column: string }[] = [];
    walkNode(compiled.node, (node) => {
        if (node.kind === 'col')
            refs.push({ table: node.table, column: node.column });
        else if (node.kind === 'ref') refs.push({ column: node.name });
        else if (node.kind === 'tablecol') refs.push({ column: node.column });
    });
    return refs;
}

/**
 * Validates a measure expression. When `columns` is given, every referenced
 * column must exist in it; when `measures` is given, `[Name]` refs may
 * resolve to those measure names.
 */
export function validateMeasureExpression(
    expression: string,
    columns?: string[],
    measures?: string[],
): MeasureValidation {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return compiled;

    const knownColumns = new Set(
        (columns ?? []).map((c) => c.trim().toLowerCase()),
    );
    const knownMeasures = new Set(
        (measures ?? []).map((m) => m.trim().toLowerCase()),
    );

    let missing: string | null = null;
    walkNode(compiled.node, (node) => {
        if (missing) return;
        if (
            node.kind === 'func' &&
            !AGGREGATION_FUNCS.has(node.name.toUpperCase()) &&
            !SCALAR_FUNCS.has(node.name.toUpperCase()) &&
            !ITERATOR_FUNCS.has(node.name.toUpperCase()) &&
            !TABLE_FUNCS.has(node.name.toUpperCase()) &&
            !LIST_FUNCS.has(node.name.toUpperCase())
        ) {
            missing = `Fonction « ${node.name} » non supportée.`;
        } else if (
            node.kind === 'col' &&
            knownColumns.size > 0 &&
            node.column
        ) {
            // Bare ASC / DESC are the sort-direction keyword of RANKX / TOPN
            // (parsed as a bare `col`), not column cells — never flag them.
            if (!node.table) {
                const bare = node.column.trim().toUpperCase();
                if (bare === 'ASC' || bare === 'DESC') return;
            }
            if (!node.table && TABLES.some((t) => t.name === node.column))
                return;
            if (!knownColumns.has(node.column.trim().toLowerCase())) {
                missing = `Colonne « ${node.column} » introuvable.`;
            }
        } else if (
            node.kind === 'tablecol' &&
            knownColumns.size > 0 &&
            node.column
        ) {
            if (!knownColumns.has(node.column.trim().toLowerCase())) {
                missing = `Colonne « ${node.column} » introuvable.`;
            }
        } else if (node.kind === 'ref' && node.name) {
            const key = node.name.trim().toLowerCase();
            if (knownMeasures.has(key)) return;
            if (knownColumns.size > 0 && knownColumns.has(key)) return;
            if (knownColumns.size > 0 || knownMeasures.size > 0) {
                missing = `Référence « ${node.name} » introuvable.`;
            }
        }
    });
    if (missing) return { ok: false, error: missing };
    return { ok: true };
}

/**
 * Evaluates a measure expression against rows, reporting the first error
 * instead of silently returning 0.
 */
export function evaluateMeasure(
    expression: string,
    rows: Row[],
    measures?: Record<string, MeasureImpl | null>,
): { value: number; error?: string } {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return { value: 0, error: compiled.error };
    const errors: string[] = [];
    const ctx: EvalCtx = { errors, measures };
    try {
        const value = evalNode(compiled.node, rows, ctx);
        if (errors.length) return { value: 0, error: errors[0]! };
        return { value };
    } catch (e) {
        const message =
            e instanceof MeasureSyntaxError || e instanceof TypeError
                ? e.message
                : String(e);
        return { value: 0, error: message };
    }
}

/**
 * Makes a measure usable by the aggregation engine. Custom measures live in
 * the PBI state; this wires the evaluator so `isMeasure` and `aggregate`
 * resolve them like the built-in ones. Any problem is recorded in
 * `MEASURE_ERRORS` so the UI can flag broken measures.
 */
export const MEASURE_ERRORS: Record<string, string> = {};

export function measureError(name: string): string | undefined {
    return MEASURE_ERRORS[name];
}

function availableColumns(): string[] {
    const columns: string[] = [];
    for (const t of TABLES) for (const f of t.fields) columns.push(f.name);
    return columns;
}

function knownMeasureNames(): string[] {
    return Object.keys(MEASURE_IMPL);
}

export function registerMeasure(
    name: string,
    expression: string,
    impl?: MeasureImpl,
): void {
    MEASURE_IMPL[name] = impl ?? compileMeasure(expression);
    try {
        const list = compileListMeasure(expression);
        if (list) LIST_MEASURE_IMPL[name] = list;
        else delete LIST_MEASURE_IMPL[name];
    } catch {
        delete LIST_MEASURE_IMPL[name];
    }
    const validation = validateMeasureExpression(
        expression,
        availableColumns(),
        knownMeasureNames(),
    );
    if (validation.ok) delete MEASURE_ERRORS[name];
    else MEASURE_ERRORS[name] = validation.error;
}

/** Removes a custom measure (and any recorded error) from the engine. */
export function unregisterMeasure(name: string): void {
    delete MEASURE_IMPL[name];
    delete LIST_MEASURE_IMPL[name];
    delete MEASURE_ERRORS[name];
}

/* ------------------------------------------------------------------ */
/* Aggregation engine                                                  */
/* ------------------------------------------------------------------ */

function numericValues(rows: Row[], col: string): number[] {
    return rows
        .map((row) => row[col])
        .filter(
            (value): value is number | string =>
                value !== null && value !== undefined && value !== '',
        )
        .map(Number)
        .filter(Number.isFinite);
}

function sum(rows: Row[], col: string) {
    return numericValues(rows, col).reduce((total, value) => total + value, 0);
}

/**
 * Restricts rows to the aggregation window configured on the field, or returns
 * the rows untouched when no window is set.
 */
export function scopedRows(rows: Row[], wf: WellField): Row[] {
    const n = wf.window;
    if (!n || !Number.isFinite(n) || n <= 0) return rows;
    const count = Math.min(Math.floor(n), rows.length);
    if (count <= 0) return rows;
    return wf.windowDir === 'first' ? rows.slice(0, count) : rows.slice(-count);
}

export function aggregate(rows: Row[], wf: WellField, ctx?: EvalCtx): number {
    if (isMeasure(wf.name)) return MEASURE_IMPL[wf.name]!(rows, ctx);
    const scoped = scopedRows(rows, wf);
    const col = wf.name;
    switch (wf.agg) {
        case 'count':
            return scoped.filter(
                (row) => row[col] !== null && row[col] !== undefined,
            ).length;
        case 'distinct':
            return new Set(scoped.map((r) => r[col])).size;
        case 'avg': {
            const values = numericValues(scoped, col);
            return values.length
                ? values.reduce((total, value) => total + value, 0) /
                      values.length
                : 0;
        }
        case 'min': {
            const values = numericValues(scoped, col);
            return values.length ? Math.min(...values) : 0;
        }
        case 'max': {
            const values = numericValues(scoped, col);
            return values.length ? Math.max(...values) : 0;
        }
        case 'first': {
            const values = numericValues(scoped, col);
            return values.length ? values[0] : 0;
        }
        case 'latest': {
            const values = numericValues(scoped, col);
            const last = values[values.length - 1];
            return last === undefined ? 0 : last;
        }
        case 'nth': {
            const values = numericValues(scoped, col);
            const at = Math.max(0, Math.floor((wf.index ?? 1) - 1));
            return values[at] ?? 0;
        }
        case 'raw': {
            const nums = numericValues(scoped, col);
            return nums.length ? nums[0] : 0;
        }
        default:
            return sum(scoped, col);
    }
}

/**
 * Collapses a single-value visual's rows into one displayed value.
 * Returns `null` when no value can be shown.
 */
export function singleValue(
    rows: Row[],
    wf: WellField,
    mode?: ValueAggregationMode,
): string | number | boolean | null {
    if (isMeasure(wf.name)) return aggregate(rows, wf);
    if (fieldType(wf.name, wf.table) === 'number') return aggregate(rows, wf);
    const scoped = scopedRows(rows, wf);
    const aggregation = mode ?? wf.valueAggregation ?? 'first';
    if (aggregation === 'count') {
        return scoped.filter(
            (row) => row[wf.name] !== null && row[wf.name] !== undefined,
        ).length;
    }
    const cells = scoped
        .map((row) => row[wf.name])
        .filter((v) => v !== null && v !== undefined && v !== '');
    if (aggregation === 'latest') {
        const last = cells[cells.length - 1];
        return last === undefined ? null : last;
    }
    if (aggregation === 'nth') {
        const nth = cells[(wf.index ?? 1) - 1];
        return nth === undefined ? null : nth;
    }
    return cells[0] ?? null;
}

/**
 * Resolves a gauge bound (min/max/target) value. A dropped field wins over a
 * typed constant; returns `undefined` when neither yields a finite number.
 */
export function gaugeBoundValue(
    rows: Row[],
    wf: WellField | undefined,
    constant: number | undefined,
): number | undefined {
    if (wf) {
        const n = Number(singleValue(rows, wf) ?? 0);
        return Number.isFinite(n) ? n : undefined;
    }
    return typeof constant === 'number' && Number.isFinite(constant)
        ? constant
        : undefined;
}

export function distinctValues(col: string, rows: Row[]) {
    const s = new Set<string>();
    for (const r of rows) s.add(String(r[col]));
    return [...s].sort();
}

/** True for any slicer family visual (checkbox, buttons, dropdown, input, date). */
export function isSlicerVisual(v: Pick<Visual, 'type'>): boolean {
    return SLICER_TYPES.has(v.type);
}

/** Table backing a visual — resolved from its first populated well. */
export function visualTable(
    v: Pick<
        Visual,
        | 'axis'
        | 'legend'
        | 'values'
        | 'drillFields'
        | 'smallMultiples'
        | 'tooltips'
        | 'minimum'
        | 'maximum'
        | 'target'
    >,
): string {
    const wells = [
        v.axis,
        v.legend,
        v.values,
        v.drillFields,
        v.smallMultiples,
        v.tooltips,
        v.minimum ?? [],
        v.maximum ?? [],
        v.target ?? [],
    ];
    for (const well of wells) {
        if (well[0]?.table) return well[0].table;
    }
    return '';
}

export function buildChartData(
    rows: Row[],
    axis: WellField[],
    legend: WellField[],
    values: WellField[],
    tooltips: WellField[] = [],
    maxCategories?: number,
    extra?: WellField,
    extraColor?: string,
    graph?: RelationGraph,
) {
    const axisCol = axis[0]?.name;
    const axisTable = axis[0]?.table;
    const legendCol = legend[0]?.name;

    const hasMeasure = (list: WellField[]) =>
        list.some((f) => isMeasure(f.name));

    const needsContext =
        !!graph &&
        !!axisCol &&
        (hasMeasure(values) ||
            hasMeasure(tooltips) ||
            hasMeasure(legend) ||
            (extra != null && isMeasure(extra.name)));

    const ctxCache = new Map<string, EvalCtx | undefined>();
    const ctxFor = (key: string): EvalCtx | undefined => {
        if (!needsContext) return undefined;
        if (ctxCache.has(key)) return ctxCache.get(key);
        const table =
            axisTable ||
            (TABLES.find((td) => td.fields.some((f) => f.name === axisCol))
                ?.name ??
                '');
        if (!table) return undefined;
        const filter: ReportFilter = {
            column: axisCol,
            table,
            values: [key],
            scope: 'report',
            type: 'list',
        };
        const filtered = filterTableRows(TABLES, [filter], graph);
        const ctx: EvalCtx | undefined = {
            tables: applyTableRows(TABLES, filtered),
        };
        ctxCache.set(key, ctx);
        return ctx;
    };

    const firstNonNull = (groupRows: Row[], col: string): unknown => {
        for (const r of groupRows) {
            const v = r[col];
            if (v !== null && v !== undefined && v !== '') return v;
        }
        return null;
    };

    const withTooltips = (
        item: Record<string, string | number>,
        groupRows: Row[],
        ctx: EvalCtx | undefined,
    ) => {
        for (const t of tooltips) {
            item[`tt:${t.name}`] = aggregate(groupRows, t, ctx);
        }
        if (extra) item['_cf'] = aggregate(groupRows, extra, ctx);
        if (extraColor)
            item['_cfx'] = firstNonNull(groupRows, extraColor) as
                string | number;
        return item;
    };

    if (!axisCol) {
        const single: Record<string, string | number> = { category: 'Total' };
        values.forEach((v) => (single[measureLabel(v)] = aggregate(rows, v)));
        return {
            data: [withTooltips(single, rows, undefined)],
            series: values.map(measureLabel),
        };
    }

    const groups = new Map<string, Row[]>();
    for (const r of rows) {
        const k = String(r[axisCol]);
        const arr = groups.get(k);
        if (arr) arr.push(r);
        else groups.set(k, [r]);
    }

    const cap = maxCategories && maxCategories > 0 ? maxCategories : Infinity;
    const capped = cap < groups.size;
    const entries = [...groups.entries()];

    if (capped) {
        entries.sort((a, b) => {
            const av = values[0]
                ? aggregate(a[1], values[0], ctxFor(a[0]))
                : a[1].length;
            const bv = values[0]
                ? aggregate(b[1], values[0], ctxFor(b[0]))
                : b[1].length;
            return Number(bv) - Number(av);
        });
    }

    const kept = capped ? entries.slice(0, cap) : entries;

    const seriesSet = new Set<string>();
    const data: Record<string, string | number>[] = kept.map(
        ([key, groupRows]) => {
            const ctx = ctxFor(key);
            const item: Record<string, string | number> = { category: key };
            if (legendCol) {
                const byLegend = new Map<string, Row[]>();
                for (const r of groupRows) {
                    const lk = String(r[legendCol]);
                    const arr = byLegend.get(lk);
                    if (arr) arr.push(r);
                    else byLegend.set(lk, [r]);
                }
                for (const [lk, lrows] of byLegend) {
                    seriesSet.add(lk);
                    item[lk] = values[0]
                        ? aggregate(lrows, values[0], ctx)
                        : lrows.length;
                }
            } else {
                values.forEach((v) => {
                    seriesSet.add(measureLabel(v));
                    item[measureLabel(v)] = aggregate(groupRows, v, ctx);
                });
            }
            return withTooltips(item, groupRows, ctx);
        },
    );

    if (capped) {
        const rest = entries.slice(cap);
        const other: Record<string, string | number> = { category: 'Autre' };
        const otherRows: Row[] = [];
        for (const [, groupRows] of rest) otherRows.push(...groupRows);
        const otherCtx = needsContext
            ? (() => {
                  const table =
                      axisTable ||
                      (TABLES.find((td) =>
                          td.fields.some((f) => f.name === axisCol),
                      )?.name ??
                          '');
                  if (!table) return undefined;
                  const filter: ReportFilter = {
                      column: axisCol,
                      table,
                      values: rest.map(([key]) => key),
                      scope: 'report',
                      type: 'list',
                  };
                  return {
                      tables: applyTableRows(
                          TABLES,
                          filterTableRows(TABLES, [filter], graph),
                      ),
                  };
              })()
            : undefined;
        if (legendCol) {
            const byLegend = new Map<string, Row[]>();
            for (const r of otherRows) {
                const lk = String(r[legendCol]);
                const arr = byLegend.get(lk);
                if (arr) arr.push(r);
                else byLegend.set(lk, [r]);
            }
            for (const [lk, lrows] of byLegend) {
                seriesSet.add(lk);
                other[lk] = values[0]
                    ? aggregate(lrows, values[0], otherCtx)
                    : lrows.length;
            }
        } else {
            values.forEach((v) => {
                seriesSet.add(measureLabel(v));
                other[measureLabel(v)] = aggregate(otherRows, v, otherCtx);
            });
        }
        data.push(withTooltips(other, otherRows, otherCtx));
    }

    if (fieldType(axisCol, axis[0]?.table) === 'number') {
        data.sort((a, b) => Number(a['category']) - Number(b['category']));
    } else if (values.length && !legendCol && !capped) {
        const key = measureLabel(values[0]!);
        data.sort((a, b) => Number(b[key]) - Number(a[key]));
    }

    // Rang / Cumul passes (W3-3 / W3-4) — only over the full series with no
    // legend bucket ("Autre" would corrupt a running total).
    if (!legendCol && !capped) applyRankRunning(data, values, measureLabel);

    return { data, series: [...seriesSet] };
}

/**
 * A table cell: a numeric aggregate, a plain value, or a per-row distinct list
 * (string[]) when the value well holds a list measure (VALUES / DISTINCT).
 */
export type TableCellValue = number | string | string[] | null;

/** One cell value: list measures resolve in the filtered-table ctx. */
function tableCellFor(
    rows: Row[],
    v: WellField,
    ctx: EvalCtx | undefined,
): TableCellValue {
    if (v.name in LIST_MEASURE_IMPL) return listMeasureValue(rows, v.name, ctx);
    if (isMeasure(v.name) || fieldType(v.name, v.table) === 'number')
        return aggregate(rows, v, ctx);
    return singleValue(rows, v);
}

/**
 * Builds table/matrix cells. Each axis category gets its own filtered-table
 * context, so a list measure in `values` shows **that category's** distinct
 * items — the "each row has its own list" contract (W1-12). Numeric measures
 * keep the existing per-group aggregation.
 */
export function buildTableCells(
    rows: Row[],
    axis: WellField[],
    legend: WellField[],
    values: WellField[],
    graph?: RelationGraph,
): { data: Record<string, unknown>[]; series: string[] } {
    const axisCol = axis[0]?.name;
    const axisTable = axis[0]?.table;
    const legendCol = legend[0]?.name;

    const hasList = (list: WellField[]) =>
        list.some((f) => isListMeasure(f.name));
    const hasM = (list: WellField[]) => list.some((f) => isMeasure(f.name));
    const needsContext =
        !!graph && (hasM(values) || hasM(legend) || hasList(values));

    const ctxCache = new Map<string, EvalCtx | undefined>();
    const ctxFor = (key: string): EvalCtx | undefined => {
        if (!needsContext) return undefined;
        if (ctxCache.has(key)) return ctxCache.get(key);
        const table =
            axisTable ||
            (TABLES.find((td) => td.fields.some((f) => f.name === axisCol))
                ?.name ??
                '');
        if (!table) return undefined;
        const filter: ReportFilter = {
            column: axisCol,
            table,
            values: [key],
            scope: 'report',
            type: 'list',
        };
        const filtered = filterTableRows(TABLES, [filter], graph);
        // Tables that carry the axis column are constrained directly, with
        // normalized matching, instead of trusting network propagation: a dense
        // relationship graph can cascade the axis value through spurious paths
        // and wipe a list measure's source table to zero rows, which would make
        // every per-row list render empty (W1-12 regression).
        const norm = (v: unknown) =>
            String(v ?? '')
                .trim()
                .toLowerCase();
        const keyNorm = norm(key);
        const ctxRows: Record<string, Row[]> = {};
        for (const t of TABLES) {
            const hasAxis = t.fields.some(
                (f) => f.name.toLowerCase() === axisCol.toLowerCase(),
            );
            ctxRows[t.name] = hasAxis
                ? t.rows.filter((r) => norm(r[axisCol]) === keyNorm)
                : (filtered[t.name] ?? t.rows);
        }
        const ctx: EvalCtx | undefined = {
            tables: applyTableRows(TABLES, ctxRows),
        };
        ctxCache.set(key, ctx);
        return ctx;
    };

    if (!axisCol) {
        const single: Record<string, unknown> = { category: 'Total' };
        const series: string[] = [];
        for (const v of values) {
            const label = measureLabel(v);
            series.push(label);
            single[label] = tableCellFor(rows, v, undefined);
        }
        return { data: [single], series };
    }

    const isRowDetailMode =
        !legendCol &&
        values.length > 0 &&
        values.every(
            (v) => !isMeasure(v.name) && fieldType(v.name, v.table) !== 'number',
        );
    if (isRowDetailMode) {
        const seriesSet = new Set<string>();
        const data = rows.map((r) => {
            const item: Record<string, unknown> = {
                category: String(r[axisCol] ?? ''),
            };
            const ctx = ctxFor(String(r[axisCol] ?? ''));
            for (const v of values) {
                const label = fieldLabel(v);
                seriesSet.add(label);
                item[label] =
                    r[v.name] !== undefined && r[v.name] !== null
                        ? r[v.name]
                        : tableCellFor([r], v, ctx);
            }
            return item;
        });
        return { data, series: [...seriesSet] };
    }

    const groups = new Map<string, Row[]>();
    for (const r of rows) {
        const k = String(r[axisCol]);
        const arr = groups.get(k);
        if (arr) arr.push(r);
        else groups.set(k, [r]);
    }

    const seriesSet = new Set<string>();
    const data = [...groups.entries()].map(([key, groupRows]) => {
        const ctx = ctxFor(key);
        const item: Record<string, unknown> = { category: key };
        if (legendCol) {
            const byLegend = new Map<string, Row[]>();
            for (const r of groupRows) {
                const lk = String(r[legendCol]);
                const arr2 = byLegend.get(lk);
                if (arr2) arr2.push(r);
                else byLegend.set(lk, [r]);
            }
            for (const [lk, lrows] of byLegend) {
                seriesSet.add(lk);
                item[lk] = values[0]
                    ? tableCellFor(lrows, values[0]!, ctx)
                    : lrows.length;
            }
        } else {
            values.forEach((v) => {
                const label = measureLabel(v);
                seriesSet.add(label);
                item[label] = tableCellFor(groupRows, v, ctx);
            });
        }
        return item;
    });

    if (fieldType(axisCol, axis[0]?.table) === 'number')
        data.sort((a, b) => Number(a['category']) - Number(b['category']));

    // Rang / Cumul column passes (W3-3 / W3-4). Only on the non-legend path:
    // a matrix with a legend has no single row ordering to rank/cumulate over.
    if (!legendCol) applyRankRunning(data, values, measureLabel);

    return { data, series: [...seriesSet] };
}

/**
 * Visual-layer "Rang" and "Cumul" passes over the per-group cells built by
 * `buildTableCells` / `buildChartData` (W3-3 / W3-4):
 *  - a value with `running` becomes a running / cumulative total across the
 *    axis order already applied to `data` (numeric axis ascending, otherwise
 *    group insertion order);
 *  - a value with `rank` becomes a 1-based descending rank over the whole
 *    result set (largest value → 1) and `data` is reordered so ranks run 1..N.
 */
function applyRankRunning(
    data: Record<string, unknown>[],
    values: WellField[],
    labelOf: (v: WellField) => string,
): void {
    const numeric = (v: unknown): number => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    for (const v of values) {
        if (v.running !== true) continue;
        const label = labelOf(v);
        let acc = 0;
        for (const item of data) {
            acc += numeric(item[label]);
            item[label] = acc;
        }
    }
    const rankField = values.find((v) => v.rank === true);
    if (!rankField) return;
    const label = labelOf(rankField);
    const entries = data
        .map((item) => ({ item, value: numeric(item[label]) }))
        .sort(
            (a, b) =>
                b.value - a.value ||
                String(a.item['category']).localeCompare(
                    String(b.item['category']),
                ),
        );
    entries.forEach((entry, i) => {
        entry.item[label] = i + 1;
    });
    data.length = 0;
    for (const entry of entries) data.push(entry.item);
}

/**
 * Builds scatter/bubble points directly from rows: one point per row using
 * raw numeric X/Y (and optional Z for bubble size) values. Falls back to the
 * empty result when the axis fields are not numeric.
 */
export function buildScatterData(
    rows: Row[],
    xWell: WellField | undefined,
    yWell: WellField | undefined,
    zWell: WellField | undefined,
): { points: ScatterPoint[]; numeric: boolean } {
    const xCol = xWell?.name;
    const yCol = yWell?.name;
    const zCol = zWell?.name;

    if (!xCol || !yCol) return { points: [], numeric: false };
    const xNumeric = fieldType(xCol, xWell?.table) === 'number';
    const yNumeric = fieldType(yCol, yWell?.table) === 'number';
    if (!xNumeric || !yNumeric) return { points: [], numeric: false };

    const points: ScatterPoint[] = [];
    for (const r of rows) {
        const xv = r[xCol];
        const yv = r[yCol];
        if (xv === null || xv === undefined || xv === '') continue;
        if (yv === null || yv === undefined || yv === '') continue;
        const x = Number(xv);
        const y = Number(yv);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const point: ScatterPoint = { x, y, raw: r };
        if (zCol) {
            const zv = r[zCol];
            if (zv !== null && zv !== undefined && zv !== '') {
                const z = Number(zv);
                if (Number.isFinite(z)) point.z = z;
            }
        }
        points.push(point);
    }
    return { points, numeric: true };
}
