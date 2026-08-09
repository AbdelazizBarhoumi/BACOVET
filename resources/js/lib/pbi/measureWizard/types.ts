/** A single candidate link between two loaded tables. */
export type JoinCandidate = {
    /** table on the "from" side */
    a: string;
    /** column on the `a` side */
    aCol: string;
    /** table on the "to" side */
    b: string;
    /** column on the `b` side */
    bCol: string;
    kind: 'shared' | 'fk_pk' | 'manual';
    /** shared-name 1 / value overlap ratio for fk_pk */
    overlap: number;
    /** 0..1 confidence used for ranking */
    confidence: number;
    /**
     * true when the candidate was confirmed against real values; false when it
     * is only a column-name coincidence that the UI should flag "à vérifier".
     * undefined for persistsed/manual links which are user-approved.
     */
    verified?: boolean;
};

/** One directed hop in a proposed path. `fromCol` lives on `from`. */
export type PathHop = {
    from: string;
    to: string;
    fromCol: string;
    toCol: string;
    kind: JoinCandidate['kind'];
    overlap: number;
    confidence: number;
    verified?: boolean;
};

export type ProposedPath = {
    /** start table */
    from: string;
    /** target table */
    to: string;
    /** ordered hops forming the chain (length 0 when from === to) */
    hops: PathHop[];
    blocked: null | { reason: string; detail: string };
};

export type MeasureKind = 'list' | 'countrows' | 'number';

export type NumericAgg = 'sum' | 'avg' | 'min' | 'max' | 'count';

export type ValueCondition = {
    /**
     * Table the column lives on. Omitted ⇒ the target table (`to`); set to the
     * base table name (`from`) for a base-table condition.
     */
    table?: string;
    column: string;
    op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'in' | 'notIn';
    value: string;
    /** values for `in` / `notIn` conditions */
    values?: string[];
};

/** Multiple conditions combined with a single AND / OR operator. */
export type ConditionGroup = {
    combine: 'and' | 'or';
    rows: ValueCondition[];
};

/**
 * One side of a composed measure: either an existing measure reference
 * (`[Name]`), a column aggregate over a loaded table, or a literal number.
 */
export type CompositeOperand =
    | { type: 'measure'; name: string }
    | { type: 'column'; table: string; column: string; agg: NumericAgg }
    | { type: 'number'; value: number };

/** What the ratio yields when the denominator is 0 (DIVIDE's default). */
export type DivZeroDefault = 'zero' | 'blank' | 'na';

/**
 * A time-window applied around a numeric result (kind === 'number'). The DAX
 * engine evaluates TOTALYTD / TOTALMTD / CALCULATE+… over the given date-ish
 * column, which may live on any loaded table (`table`).
 */
export type PeriodWindow = 'ytd' | 'mtd' | 'qtd' | 'lastYear' | 'prevMonth';

export type PeriodSpec = {
    window: PeriodWindow;
    /** table that owns the date field used to build the window */
    table: string;
    /** date-ish column used to build the window (e.g. `mois` in YYYY-MM) */
    field: string;
};

/** Binary composition (ratio, difference, …) of two operands. */
export type CompositeSpec = {
    a: CompositeOperand;
    b: CompositeOperand;
    /** arithmetic operator applied between the two operands */
    op: '/' | '*' | '-' | '+';
    /** when true the result is scaled ×100 (the `%` display path) */
    scale: boolean;
    /**
     * denominator-is-0 policy for `/` (never a bare slash). `zero` emits
     * `DIVIDE(a, b, 0)`, `blank` emits `DIVIDE(a, b)` (DAX BLANK default),
     * `na` emits `DIVIDE(a, b, NA())`. Absent means `zero`.
     */
    divZero?: DivZeroDefault;
};

export type WizardSpec = {
    /** base table (the measure's own dataset) */
    from: string;
    /** target table where rows/columns are counted or listed */
    to: string;
    /** ordered hops from → to (the chain the DAX correlates) */
    hops: PathHop[];
    kind: MeasureKind;
    /** column on the target table (number: aggregated; list: VALUES) */
    column: string;
    /** numeric aggregation when kind === 'number' */
    agg: NumericAgg;
    /** optional extra condition applied to target rows */
    condition?: ValueCondition;
    /**
     * Multiple conditions combined (AND/OR), each rendered as its own row.
     * When present with more than one row it overrides `condition`; a single
     * row is normalized to `condition`.
     */
    conditions?: ConditionGroup;
    /** time window (YTD / MTD / year-ago / M-1) wrapping a numeric result */
    period?: PeriodSpec;
    /** composed measure (A ÷ B × 100 …). When present, overrides kind/column. */
    composition?: CompositeSpec;
};

/** A join the user can persist and share across sessions (backend tier B). */
export type PersistedJoin = {
    id?: string;
    tableA: string;
    columnA: string;
    tableB: string;
    columnB: string;
    trimCompare: boolean;
};

/** Fuzzy value-overlap floor for proposing an fk_pk hop (lenient in wizard). */
export const FUZZY_OVERLAP_THRESHOLD = 0.2;
