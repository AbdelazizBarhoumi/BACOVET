// DAX IntelliSense: context-aware autocompletion for the New measure
// formula bar, modelled on Power BI's suggestion engine.

import type { Field, TableDef } from './model';

export type DaxSuggestionKind = 'function' | 'table' | 'column' | 'measure';

export type DaxSuggestion = {
    kind: DaxSuggestionKind;
    label: string;
    detail?: string;
    group?: string;
    /** text to insert at the token position */
    insert: string;
    /** extra cursor offset from the end of the inserted text */
    cursorAdjust?: number;
};

export type DaxCompletion = {
    suggestions: DaxSuggestion[];
    /** start of the token being completed */
    from: number;
    /** end of the token being completed (cursor position) */
    to: number;
};

export type DaxFunction = {
    name: string;
    signature: string;
    group: string;
    description?: string;
};

export const DAX_FUNCTIONS: DaxFunction[] = [
    {
        name: 'SUM',
        signature: 'SUM(<column>)',
        group: 'Agrégations',
        description: 'Additionne tous les nombres d’une colonne',
    },
    {
        name: 'SUMX',
        signature: 'SUMX(<table>,<expression>)',
        group: 'Agrégations',
        description:
            'Renvoie la somme d’une expression évaluée pour chaque ligne',
    },
    {
        name: 'AVERAGE',
        signature: 'AVERAGE(<column>)',
        group: 'Agrégations',
        description: 'Renvoie la moyenne (arithmétique) d’une colonne',
    },
    {
        name: 'AVG',
        signature: 'AVG(<column>)',
        group: 'Agrégations',
        description: 'Alias de AVERAGE',
    },
    {
        name: 'AVERAGEA',
        signature: 'AVERAGEA(<column>)',
        group: 'Agrégations',
        description: 'Moyenne incluant les cellules de texte/booléennes',
    },
    {
        name: 'AVERAGEX',
        signature: 'AVERAGEX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Moyenne d’une expression calculée ligne par ligne',
    },
    {
        name: 'COUNTX',
        signature: 'COUNTX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Compte les lignes où l’expression n’est pas vide',
    },
    {
        name: 'MINX',
        signature: 'MINX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Plus petite valeur d’une expression ligne par ligne',
    },
    {
        name: 'MAXX',
        signature: 'MAXX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Plus grande valeur d’une expression ligne par ligne',
    },
    {
        name: 'PRODUCTX',
        signature: 'PRODUCTX(<table>,<expression>)',
        group: 'Agrégations',
        description: 'Multiplie une expression ligne par ligne',
    },
    {
        name: 'COUNT',
        signature: 'COUNT(<column>)',
        group: 'Agrégations',
        description: 'Compte le nombre de lignes numériques non vides',
    },
    {
        name: 'COUNTA',
        signature: 'COUNTA(<column>)',
        group: 'Agrégations',
        description: 'Compte les cellules non vides de n’importe quel type',
    },
    {
        name: 'COUNTROWS',
        signature: 'COUNTROWS(<table>)',
        group: 'Agrégations',
        description: 'Compte les lignes d’une table',
    },
    {
        name: 'DISTINCTCOUNT',
        signature: 'DISTINCTCOUNT(<column>)',
        group: 'Agrégations',
        description: 'Compte les valeurs distinctes d’une colonne',
    },
    {
        name: 'MIN',
        signature: 'MIN(<column>)',
        group: 'Agrégations',
        description: 'Renvoie la plus petite valeur numérique',
    },
    {
        name: 'MAX',
        signature: 'MAX(<column>)',
        group: 'Agrégations',
        description: 'Renvoie la plus grande valeur numérique',
    },
    {
        name: 'MEDIAN',
        signature: 'MEDIAN(<column>)',
        group: 'Agrégations',
        description: 'Renvoie la médiane d’une colonne',
    },
    {
        name: 'PRODUCT',
        signature: 'PRODUCT(<column>)',
        group: 'Agrégations',
        description: 'Multiplie tous les nombres d’une colonne',
    },
    {
        name: 'CALCULATE',
        signature: 'CALCULATE(<measure>,<filter>)',
        group: 'Filtre',
        description: 'Évalue une expression avec des filtres modifiés',
    },
    {
        name: 'FILTER',
        signature: 'FILTER(<table>,<condition>)',
        group: 'Filtre',
        description: 'Renvoie une table filtrée par une condition',
    },
    {
        name: 'ALL',
        signature: 'ALL(<table>|<column>)',
        group: 'Filtre',
        description: 'Supprime tous les filtres d’une table ou d’une colonne',
    },
    {
        name: 'ALLEXCEPT',
        signature: 'ALLEXCEPT(<table>,<column>)',
        group: 'Filtre',
        description:
            'Supprime tous les filtres sauf sur les colonnes spécifiées',
    },
    {
        name: 'VALUES',
        signature: 'VALUES(<table>|<column>)',
        group: 'Filtre',
        description: 'Renvoie les valeurs visibles distinctes',
    },
    {
        name: 'DISTINCT',
        signature: 'DISTINCT(<column>)',
        group: 'Filtre',
        description: 'Renvoie les valeurs distinctes d’une colonne',
    },
    {
        name: 'RELATED',
        signature: 'RELATED(<column>)',
        group: 'Filtre',
        description: 'Renvoie la valeur liée d’une autre table',
    },
    {
        name: 'TOPN',
        signature: 'TOPN(<n>,<table>,<order>)',
        group: 'Filtre',
        description: 'Renvoie les n premières rangées d’une table',
    },
    {
        name: 'IF',
        signature: 'IF(<logical>,<then>[,<else>])',
        group: 'Logique',
        description: 'Renvoie une valeur quand une condition est vraie',
    },
    {
        name: 'SWITCH',
        signature: 'SWITCH(<expr>,<case>,<result>[,...])',
        group: 'Logique',
        description: 'Évalue une expression selon une liste de valeurs',
    },
    {
        name: 'AND',
        signature: 'AND(<a>,<b>)',
        group: 'Logique',
        description: 'Conjonction logique de deux expressions',
    },
    {
        name: 'OR',
        signature: 'OR(<a>,<b>)',
        group: 'Logique',
        description: 'Disjonction logique de deux expressions',
    },
    {
        name: 'NOT',
        signature: 'NOT(<logical>)',
        group: 'Logique',
        description: 'Négation d’une expression logique',
    },
    {
        name: 'IFERROR',
        signature: 'IFERROR(<value>,<fallback>)',
        group: 'Logique',
        description:
            'Renvoie une valeur de secours quand la valeur provoque une erreur',
    },
    {
        name: 'DATEADD',
        signature: 'DATEADD(<dates>,<n>,<unit>)',
        group: 'Intelligence temporelle',
        description: 'Décale un ensemble de dates',
    },
    {
        name: 'SAMEPERIODLASTYEAR',
        signature: 'SAMEPERIODLASTYEAR(<dates>)',
        group: 'Intelligence temporelle',
        description: 'Période équivalente de l’année précédente',
    },
    {
        name: 'TOTALYTD',
        signature: 'TOTALYTD(<measure>,<dates>)',
        group: 'Intelligence temporelle',
        description: 'Cumul depuis le début de l’année',
    },
    {
        name: 'TOTALMTD',
        signature: 'TOTALMTD(<measure>,<dates>)',
        group: 'Intelligence temporelle',
        description: 'Cumul depuis le début du mois',
    },
    {
        name: 'DATESYTD',
        signature: 'DATESYTD(<dates>)',
        group: 'Intelligence temporelle',
        description: 'Période depuis le début de l’année',
    },
    {
        name: 'PREVIOUSMONTH',
        signature: 'PREVIOUSMONTH(<dates>)',
        group: 'Intelligence temporelle',
        description: 'Le mois précédent',
    },
    {
        name: 'DATEDIFF',
        signature: 'DATEDIFF(<start>,<end>,<unit>)',
        group: 'Intelligence temporelle',
        description: 'Intervalle entre deux dates',
    },
    {
        name: 'CONCATENATE',
        signature: 'CONCATENATE(<a>,<b>)',
        group: 'Texte',
        description: 'Concatène deux valeurs de texte',
    },
    {
        name: 'LEFT',
        signature: 'LEFT(<text>,<n>)',
        group: 'Texte',
        description: 'Caractères les plus à gauche d’une chaîne',
    },
    {
        name: 'RIGHT',
        signature: 'RIGHT(<text>,<n>)',
        group: 'Texte',
        description: 'Caractères les plus à droite d’une chaîne',
    },
    {
        name: 'MID',
        signature: 'MID(<text>,<start>,<n>)',
        group: 'Texte',
        description: 'Sous-chaîne d’une chaîne',
    },
    {
        name: 'LEN',
        signature: 'LEN(<text>)',
        group: 'Texte',
        description: 'Longueur d’une chaîne',
    },
    {
        name: 'UPPER',
        signature: 'UPPER(<text>)',
        group: 'Texte',
        description: 'Convertit une chaîne en majuscules',
    },
    {
        name: 'LOWER',
        signature: 'LOWER(<text>)',
        group: 'Texte',
        description: 'Convertit une chaîne en minuscules',
    },
    {
        name: 'TRIM',
        signature: 'TRIM(<text>)',
        group: 'Texte',
        description: 'Supprime les espaces superflus',
    },
    {
        name: 'FORMAT',
        signature: 'FORMAT(<value>,<format>)',
        group: 'Texte',
        description: 'Formate une valeur sous forme de texte',
    },
    {
        name: 'SUBSTITUTE',
        signature: 'SUBSTITUTE(<text>,<old>,<new>)',
        group: 'Texte',
        description: 'Remplace les occurrences d’une chaîne',
    },
    {
        name: 'SEARCH',
        signature: 'SEARCH(<find>,<text>)',
        group: 'Texte',
        description: 'Position d’une chaîne dans un texte',
    },
    {
        name: 'VALUE',
        signature: 'VALUE(<text>)',
        group: 'Texte',
        description: 'Convertit un texte en nombre',
    },
    {
        name: 'ABS',
        signature: 'ABS(<n>)',
        group: 'Math',
        description: 'Valeur absolue',
    },
    {
        name: 'ROUND',
        signature: 'ROUND(<n>,<digits>)',
        group: 'Math',
        description: 'Arrondit un nombre',
    },
    {
        name: 'ROUNDUP',
        signature: 'ROUNDUP(<n>,<digits>)',
        group: 'Math',
        description: 'Arrondit au supérieur',
    },
    {
        name: 'ROUNDDOWN',
        signature: 'ROUNDDOWN(<n>,<digits>)',
        group: 'Math',
        description: 'Arrondit à l’inférieur',
    },
    {
        name: 'DIVIDE',
        signature: 'DIVIDE(<num>,<den>[,...])',
        group: 'Math',
        description: 'Division sûre avec résultat alternatif',
    },
    {
        name: 'POWER',
        signature: 'POWER(<n>,<p>)',
        group: 'Math',
        description: 'Élève un nombre à une puissance',
    },
    {
        name: 'SQRT',
        signature: 'SQRT(<n>)',
        group: 'Math',
        description: 'Racine carrée',
    },
    {
        name: 'INT',
        signature: 'INT(<n>)',
        group: 'Math',
        description: 'Arrondit au nombre entier inférieur',
    },
    {
        name: 'MOD',
        signature: 'MOD(<n>,<d>)',
        group: 'Math',
        description: 'Reste d’une division',
    },
    {
        name: 'SIGN',
        signature: 'SIGN(<n>)',
        group: 'Math',
        description: 'Signe d’un nombre',
    },
    {
        name: 'YEAR',
        signature: 'YEAR(<date>)',
        group: 'Date',
        description: 'Année d’une date',
    },
    {
        name: 'MONTH',
        signature: 'MONTH(<date>)',
        group: 'Date',
        description: 'Mois d’une date',
    },
    {
        name: 'DAY',
        signature: 'DAY(<date>)',
        group: 'Date',
        description: 'Jour d’une date',
    },
    {
        name: 'TODAY',
        signature: 'TODAY()',
        group: 'Date',
        description: 'Date actuelle',
    },
    {
        name: 'NOW',
        signature: 'NOW()',
        group: 'Date',
        description: 'Date et heure actuelles',
    },
    {
        name: 'WEEKDAY',
        signature: 'WEEKDAY(<date>)',
        group: 'Date',
        description: 'Jour de la semaine',
    },
    {
        name: 'EOMONTH',
        signature: 'EOMONTH(<date>,<months>)',
        group: 'Date',
        description: 'Dernier jour du mois',
    },
    {
        name: 'DATE',
        signature: 'DATE(<year>,<month>,<day>)',
        group: 'Date',
        description: 'Construit une date à partir de ses composants',
    },
];

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
