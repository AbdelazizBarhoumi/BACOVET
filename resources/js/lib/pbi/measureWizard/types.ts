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
    column: string;
    op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
    value: string;
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
