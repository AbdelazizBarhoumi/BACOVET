import { motion } from 'framer-motion';
import {
    ArrowRight,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    GitMerge,
    Hash,
    List,
    Percent,
    Plus,
    Save,
    Sigma,
    Sparkles,
    Table2,
    X,
} from 'lucide-react';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { distinctValuesForTableColumn } from '@/lib/pbi/filters';
import {
    AGG_LABELS,
    COND_LABELS,
    KIND_LABELS,
    PERIOD_LABELS,
    buildMeasureDax,
    chainRowCount,
    firstFailingHop,
    isReliableHop,
    isReliablePath,
    joinCandidates,
    measureExpression,
    proposePaths,
    type CompositeOperand,
    type CompositeSpec,
    type DivZeroDefault,
    type JoinCandidate,
    type MeasureKind,
    type NumericAgg,
    type PathHop,
    type PeriodWindow,
    type ProposedPath,
    type ProposalRankBy,
    type ValueCondition,
    type WizardSpec,
} from '@/lib/pbi/measureWizard';
import {
    compileListMeasure,
    evaluateMeasure,
    type Field,
    type TableDef,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';

type StepKey = 'objective' | 'table' | 'result' | 'operands' | 'save';

const STEP_LABELS: Record<StepKey, string> = {
    objective: 'Objectif',
    table: 'Table',
    result: 'Résultat',
    operands: 'Opérandes',
    save: 'Enregistrer',
};

/**
 * Two ways of building a measure. Single reads a value from one table.
 * Linked composes two operands (A • B) or reads a value on a table linked to
 * another one.
 */
type WizardMode = 'single' | 'linked';

const COMPOSE_OPS: { key: CompositeSpec['op']; label: string }[] = [
    { key: '/', label: '÷' },
    { key: '*', label: '×' },
    { key: '-', label: '−' },
    { key: '+', label: '+' },
];

const DIV_ZERO_OPTIONS: { key: DivZeroDefault; label: string }[] = [
    { key: 'zero', label: '0' },
    { key: 'blank', label: 'Vide (BLANK)' },
    { key: 'na', label: 'Non dispo (NA)' },
];

const DIV_ZERO_DAX: Record<DivZeroDefault, string> = {
    zero: 'DIVIDE(A, B, 0)',
    blank: 'DIVIDE(A, B)',
    na: 'DIVIDE(A, B, NA())',
};

/** Readable result options shared by the "Valeurs liées" flow. */
type SimpleOperation = {
    key: string;
    kind: MeasureKind;
    agg?: NumericAgg;
    label: string;
    needsColumn: boolean;
};

const SIMPLE_OPERATIONS: SimpleOperation[] = [
    {
        key: 'countrows',
        kind: 'countrows',
        label: 'Nombre de lignes',
        needsColumn: false,
    },
    {
        key: 'sum',
        kind: 'number',
        agg: 'sum',
        label: 'Somme',
        needsColumn: true,
    },
    {
        key: 'avg',
        kind: 'number',
        agg: 'avg',
        label: 'Moyenne',
        needsColumn: true,
    },
    {
        key: 'min',
        kind: 'number',
        agg: 'min',
        label: 'Min',
        needsColumn: true,
    },
    {
        key: 'max',
        kind: 'number',
        agg: 'max',
        label: 'Max',
        needsColumn: true,
    },
    {
        key: 'list',
        kind: 'list',
        label: 'Liste des valeurs',
        needsColumn: true,
    },
];

function simpleIcon(key: string, cls: string) {
    switch (key) {
        case 'countrows':
            return <Hash className={cls} />;
        case 'avg':
            return <Percent className={cls} />;
        case 'list':
            return <List className={cls} />;
        default:
            return <Sigma className={cls} />;
    }
}

/** First usable column (prefers numeric) of a table, for sensible defaults. */
function firstFieldOf(tables: TableDef[], name: string): string {
    const def = tables.find((t) => t.name === name);
    return (
        (def?.fields.find((f) => f.type === 'number') ?? def?.fields[0])
            ?.name ?? ''
    );
}

/** Editable description of one side of a composed measure. */
type OperandDraft = {
    kind: 'measure' | 'column' | 'number';
    measure: string;
    /** source table when kind === 'column' */
    table: string;
    column: string;
    agg: NumericAgg;
    /** literal when kind === 'number' */
    value: string;
};

/**
 * Wave-3 result post-processing state (shared by the single-value flow, the
 * linked "Valeurs liées" flow and, reduced to pct/period, composed measures).
 */
type Wave3State = {
    /** Part du total (W3-2): axis '' = whole target table */
    pctOn: boolean;
    pctAxis: string;
    /** Top-N (W3-3): keep only the n rows ordered by a column */
    topNOn: boolean;
    topNCount: number;
    topNOrder: string;
    topNDir: 'desc' | 'asc';
    /** Texte concaténé (W3-5) for list results */
    concatOn: boolean;
    concatSep: string;
    /** Modèle SI (W3-6): conditional branch template */
    ifOn: boolean;
    ifColumn: string;
    ifOp: ValueCondition['op'];
    ifValue: string;
    ifValues: string[];
    ifThen: number;
    ifElse: number;
};

const OP_KEYS = Object.keys(COND_LABELS) as ValueCondition['op'][];
const AGG_KEYS = Object.keys(AGG_LABELS) as NumericAgg[];
const PERIOD_KEYS = Object.keys(PERIOD_LABELS) as PeriodWindow[];
const EMPTY_HOPS: PathHop[] = [];

const MODE_CARDS: {
    key: WizardMode;
    title: string;
    hint: string;
    icon: typeof Table2;
}[] = [
    {
        key: 'single',
        title: 'Valeur d’une table',
        hint: 'Nombre de lignes, somme, moyenne, min, max, liste des valeurs… sur une seule table.',
        icon: Table2,
    },
    {
        key: 'linked',
        title: 'Valeur composée / entre 2 tables',
        hint: 'Comparez deux opérandes (A ÷ B, A − B…), ou lisez le compte / une somme / une liste des valeurs d’une table liée à une autre.',
        icon: GitMerge,
    },
];

export function MeasureWizardDialog({
    onClose,
    createCategory,
}: {
    onClose: () => void;
    createCategory?: string | null;
}) {
    const { tables, addMeasure, sharedJoins, measures } = usePbi();
    const [step, setStep] = useState<StepKey>('objective');
    const [mode, setMode] = useState<WizardMode | null>(null);
    const [linkedStyle, setLinkedStyle] = useState<
        'compose' | 'related' | null
    >(null);

    // Single value flow reads one table (from === to). The related flow reads
    // a table linked to the operand pair, so its endpoints mirror operands A/B.
    const [table, setTable] = useState(tables[0]?.name ?? '');
    const [paths, setPaths] = useState<PathHop[][]>([]);
    const [activeVariant, setActiveVariant] = useState(0);
    const [kind, setKind] = useState<MeasureKind>('number');
    const [agg, setAgg] = useState<NumericAgg>('sum');
    const [column, setColumn] = useState('');
    const [condOn, setCondOn] = useState(false);
    const [condRows, setCondRows] = useState<ValueCondition[]>([
        { column: '', op: 'gt', value: '' },
    ]);
    const [condCombine, setCondCombine] = useState<'and' | 'or'>('and');
    // Time window (Période): wraps the numeric result in TOTALYTD / TOTALMTD /
    // CALCULATE(…, SAMEPERIODLASTYEAR | PREVIOUSMONTH(…)) over a date column
    // picked anywhere in the loaded tables (`table[field]`).
    const [periodOn, setPeriodOn] = useState(false);
    const [periodWindow, setPeriodWindow] = useState<PeriodWindow>('ytd');
    const [periodDateRef, setPeriodDateRef] = useState('');
    // Wave-3 result post-processing (shared by the single-value flow, the
    // linked "Valeurs liées" flow and, in a reduced form, composed measures):
    // percent-of-total, Top-N, CONCATENATEX list and IF template.
    const [w3, setW3] = useState<Wave3State>({
        pctOn: false,
        pctAxis: '',
        topNOn: false,
        topNCount: 10,
        topNOrder: '',
        topNDir: 'desc',
        concatOn: false,
        concatSep: ', ',
        ifOn: false,
        ifColumn: '',
        ifOp: 'gt',
        ifValue: '',
        ifValues: [],
        ifThen: 1,
        ifElse: 0,
    });
    const patchW3 = (patch: Partial<Wave3State>) =>
        setW3((s) => ({ ...s, ...patch }));
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [allowWeak, setAllowWeak] = useState(false);
    const [rankBy, setRankBy] = useState<ProposalRankBy>('shortest');

    // Composition operands (A • B). Seeded on the best working pair so the
    // linked entry point always opens on a pair that yields live data.
    const [composeOp, setComposeOp] = useState<CompositeSpec['op']>('/');
    const [scaleHundreds, setScaleHundreds] = useState(true);
    const [divZero, setDivZero] = useState<DivZeroDefault>('zero');
    const [opA, setOpA] = useState<OperandDraft>(() => ({
        kind: 'column',
        measure: '',
        table: tables[0]?.name ?? '',
        column: firstFieldOf(tables, tables[0]?.name ?? ''),
        agg: 'sum',
        value: '',
    }));
    const [opB, setOpB] = useState<OperandDraft>(() => ({
        kind: 'column',
        measure: '',
        table: tables[1]?.name ?? tables[0]?.name ?? '',
        column: firstFieldOf(tables, tables[1]?.name ?? tables[0]?.name ?? ''),
        agg: 'sum',
        value: '',
    }));

    const fromTable = table;
    const bothColumnTables =
        mode === 'linked' &&
        opA.kind === 'column' &&
        opB.kind === 'column' &&
        opA.table !== '' &&
        opB.table !== '' &&
        opA.table !== opB.table;
    const effectiveFrom = bothColumnTables ? opA.table : fromTable;
    const effectiveTo = bothColumnTables ? opB.table : effectiveFrom;

    // The active chain is the hops of the currently selected variant. Edits
    // write back into its slot so switching variant keeps each one's tweaks.
    const hops = useMemo<PathHop[]>(
        () => paths[activeVariant] ?? EMPTY_HOPS,
        [paths, activeVariant],
    );
    const setHops = (next: PathHop[]) =>
        setPaths((prev) => {
            if (activeVariant >= prev.length) return prev;
            const copy = prev.slice();
            copy[activeVariant] = next;
            return copy;
        });

    const pathReliable = isReliablePath(hops);
    const hasWeakHop = hops.some((h) => !isReliableHop(h));

    const steps: StepKey[] =
        mode === 'linked'
            ? ['objective', 'operands', 'save']
            : mode === 'single'
              ? ['objective', 'table', 'result', 'save']
              : ['objective'];
    const stepIndex = steps.findIndex((s) => s === step);

    // --- Composition operands ---------------------------------------------
    const toOperand = (d: OperandDraft): CompositeOperand | null => {
        if (d.kind === 'measure')
            return d.measure ? { type: 'measure', name: d.measure } : null;
        if (d.kind === 'column')
            return d.table && d.column
                ? {
                      type: 'column',
                      table: d.table,
                      column: d.column,
                      agg: d.agg,
                  }
                : null;
        const n = Number(d.value);
        return Number.isFinite(n) ? { type: 'number', value: n } : null;
    };
    const composeA = useMemo(() => toOperand(opA), [opA]);
    const composeB = useMemo(() => toOperand(opB), [opB]);
    const operandsReady = composeA !== null && composeB !== null;

    const manual: JoinCandidate[] = useMemo(
        () =>
            sharedJoins.map((j) => ({
                a: j.table_a,
                aCol: j.column_a,
                b: j.table_b,
                bCol: j.column_b,
                kind: 'manual' as const,
                overlap: 1,
                confidence: 1,
            })),
        [sharedJoins],
    );

    const proposals = useMemo(
        () =>
            proposePaths(tables, effectiveFrom, effectiveTo, manual, 5, rankBy),
        [tables, effectiveFrom, effectiveTo, manual, rankBy],
    );

    const toDef = tables.find((t) => t.name === effectiveTo);
    const toColumns = (toDef?.fields ?? []).map((f) => f.name);

    const chooseMode = (m: WizardMode) => {
        setMode(m);
        setLinkedStyle(m === 'linked' ? 'compose' : null);
        if (m === 'single') {
            setTable(tables[0]?.name ?? '');
            setColumn(firstFieldOf(tables, tables[0]?.name ?? ''));
            setPaths([]);
            setActiveVariant(0);
            setStep('table');
        } else {
            setPaths([]);
            setStep('operands');
        }
    };

    const switchToSingle = () => {
        setMode('single');
        setLinkedStyle(null);
        setColumn(firstFieldOf(tables, table));
        setPaths([]);
        setActiveVariant(0);
        setStep('table');
    };

    const chooseLinkedStyle = (s: 'compose' | 'related') => {
        setLinkedStyle(s);
        const a =
            opA.kind === 'column'
                ? opA
                : {
                      ...opA,
                      kind: 'column' as const,
                      table: tables[0]?.name ?? '',
                      column: firstFieldOf(tables, tables[0]?.name ?? ''),
                  };
        const b =
            opB.kind === 'column'
                ? opB
                : {
                      ...opB,
                      kind: 'column' as const,
                      table: tables[1]?.name ?? tables[0]?.name ?? '',
                      column: firstFieldOf(
                          tables,
                          tables[1]?.name ?? tables[0]?.name ?? '',
                      ),
                  };
        setOpA(a);
        setOpB(b);
        if (s === 'compose') {
            const x = opA.kind === 'column' ? opA.table : '';
            const y = opB.kind === 'column' ? opB.table : '';
            if (x && y && x !== y) {
                setPaths(
                    proposePaths(tables, x, y, manual, 5, rankBy).map(
                        (p) => p.hops,
                    ),
                );
                setActiveVariant(0);
            } else {
                setPaths([]);
            }
            return;
        }
        if (a.table && b.table && a.table !== b.table) {
            setPaths(
                proposePaths(tables, a.table, b.table, manual, 5, rankBy).map(
                    (p) => p.hops,
                ),
            );
            setActiveVariant(0);
        } else {
            setPaths([]);
        }
    };

    const setOperand = (
        side: 'A' | 'B',
        patch: Partial<OperandDraft>,
    ) => {
        const draft = side === 'A' ? opA : opB;
        let next = { ...draft, ...patch };
        if (mode === 'linked' && linkedStyle === 'related') {
            // Related mode always reads two table columns.
            next = { ...next, kind: 'column' as const };
        }
        if (side === 'A') setOpA(next);
        else setOpB(next);
        if (mode === 'linked') {
            const xKind = side === 'A' ? next.kind : opA.kind;
            const yKind = side === 'B' ? next.kind : opB.kind;
            const xTable = side === 'A' ? next.table : opA.table;
            const yTable = side === 'B' ? next.table : opB.table;
            if (
                xKind === 'column' &&
                yKind === 'column' &&
                xTable &&
                yTable &&
                xTable !== yTable
            ) {
                setPaths(
                    proposePaths(tables, xTable, yTable, manual, 5, rankBy).map(
                        (p) => p.hops,
                    ),
                );
                setActiveVariant(0);
            } else {
                setPaths([]);
            }
        }
    };

    const selectTable = (t: string) => {
        setTable(t);
        setColumn(firstFieldOf(tables, t));
    };

    const spec: WizardSpec = useMemo(() => {
        const base = {
            from: effectiveFrom,
            to: effectiveTo,
            hops,
            kind,
            column,
            agg,
        };
        const rows = condOn
            ? condRows.filter((r) => r.column.trim() !== '')
            : [];
        const withCond =
            rows.length === 1
                ? { ...base, condition: rows[0] }
                : rows.length > 1
                  ? { ...base, conditions: { combine: condCombine, rows } }
                  : base;
        const refMatch =
            periodOn && periodDateRef
                ? /^([a-zA-Z_][\w]*)\[([^\]]+)\]$/.exec(periodDateRef)
                : null;
        const periodSpec = refMatch
            ? {
                  window: periodWindow,
                  table: refMatch[1]!,
                  field: refMatch[2]!,
              }
            : undefined;
        if (
            mode === 'linked' &&
            linkedStyle === 'compose' &&
            composeA &&
            composeB
        ) {
            return {
                ...withCond,
                kind: 'number',
                ...(periodSpec ? { period: periodSpec } : {}),
                ...(w3.pctOn
                    ? { percentOfTotal: { axis: w3.pctAxis } }
                    : {}),
                composition: {
                    a: composeA,
                    b: composeB,
                    op: composeOp,
                    scale: scaleHundreds,
                    divZero: composeOp === '/' ? divZero : undefined,
                },
            };
        }
        const withW3 =
            kind === 'number'
                ? {
                      ...withCond,
                      ...(w3.pctOn
                          ? { percentOfTotal: { axis: w3.pctAxis } }
                          : {}),
                      ...(w3.topNOn
                          ? {
                                topN: {
                                    n: w3.topNCount,
                                    orderColumn: w3.topNOrder,
                                    dir: w3.topNDir,
                                },
                            }
                          : {}),
                      ...(w3.ifOn
                          ? {
                                ifTemplate: {
                                    column: w3.ifColumn,
                                    op: w3.ifOp,
                                    ...(w3.ifOp === 'in' ||
                                    w3.ifOp === 'notIn'
                                        ? { values: w3.ifValues }
                                        : { value: w3.ifValue }),
                                    then: w3.ifThen,
                                    else: w3.ifElse,
                                },
                            }
                          : {}),
                  }
                : kind === 'list'
                  ? {
                        ...withCond,
                        ...(w3.concatOn
                            ? { concat: { column, sep: w3.concatSep } }
                            : {}),
                    }
                  : withCond;
        return periodSpec ? { ...withW3, period: periodSpec } : withW3;
    }, [
        effectiveFrom,
        effectiveTo,
        hops,
        kind,
        column,
        agg,
        condOn,
        condRows,
        condCombine,
        periodOn,
        periodWindow,
        periodDateRef,
        w3,
        mode,
        linkedStyle,
        composeA,
        composeB,
        composeOp,
        scaleHundreds,
        divZero,
    ]);

    const dax = useMemo(
        () =>
            name.trim()
                ? measureExpression(name.trim(), spec)
                : buildMeasureDax(spec),
        [name, spec],
    );

    const pathGate = hops.length === 0 || pathReliable || allowWeak;

    const previewState = useMemo(() => {
        const none = {
            value: null as number | string[] | null,
            error: null as string | null,
        };
        const expr = measureExpression(name.trim() || 'Aperçu', spec);
        if (mode === 'single') {
            if (fromTable === '' || (kind !== 'countrows' && column === ''))
                return none;
            if (kind === 'number' || kind === 'countrows') {
                const r = evaluateMeasure(expr, []);
                return {
                    value: typeof r.value === 'number' ? r.value : null,
                    error: r.error ?? null,
                };
            }
            try {
                const compiled = compileListMeasure(expr);
                if (!compiled) return none;
                const values = compiled([], {});
                return {
                    value: Array.isArray(values) ? values : [],
                    error: null,
                };
            } catch {
                return none;
            }
        }
        if (mode === 'linked' && linkedStyle === 'compose') {
            if (!composeA || !composeB) return none;
            const r = evaluateMeasure(expr, []);
            return {
                value: typeof r.value === 'number' ? r.value : null,
                error: r.error ?? null,
            };
        }
        if (mode === 'linked' && linkedStyle === 'related') {
            if (!hops.length || !pathGate) return none;
            if (kind === 'number' || kind === 'countrows') {
                const r = evaluateMeasure(expr, []);
                return {
                    value: typeof r.value === 'number' ? r.value : null,
                    error: r.error ?? null,
                };
            }
            try {
                const compiled = compileListMeasure(expr);
                if (!compiled) return none;
                const values = compiled([], {});
                return {
                    value: Array.isArray(values) ? values : [],
                    error: null,
                };
            } catch {
                return none;
            }
        }
        return none;
    }, [
        spec,
        mode,
        linkedStyle,
        fromTable,
        kind,
        column,
        hops,
        pathGate,
        name,
        composeA,
        composeB,
    ]);
    const preview = previewState.value;
    const previewError = previewState.error;

    const relatedReady =
        !mode || mode === 'single' || linkedStyle === 'compose'
            ? true
            : hops.length > 0 &&
              pathGate &&
              (kind === 'countrows' || column !== '');

    const canProceed =
        (step === 'objective' && mode !== null) ||
        (step === 'table' && fromTable !== '') ||
        (step === 'result' &&
            (kind === 'countrows' || column !== '')) ||
        (step === 'operands' &&
            operandsReady &&
            (linkedStyle === 'related' ? relatedReady : true)) ||
        (step === 'save' && name.trim() !== '');

    const changeRankBy = (r: ProposalRankBy) => {
        const reordered = proposePaths(
            tables,
            effectiveFrom,
            effectiveTo,
            manual,
            5,
            r,
        );
        setRankBy(r);
        setPaths(reordered.map((p) => p.hops));
        setActiveVariant(0);
    };

    const stepBack = () => {
        if (stepIndex === 0) onClose();
        else setStep(steps[stepIndex - 1] ?? 'objective');
    };

    const goNext = async () => {
        if (step === 'objective') return;
        if (step === 'table') {
            setPaths([]);
            setActiveVariant(0);
            setStep('result');
            return;
        }
        if (step === 'result') {
            setStep('save');
            return;
        }
        if (step === 'operands') {
            setStep('save');
            return;
        }
        if (saving) return;
        if (!name.trim()) {
            toast.error('Saisissez un nom de mesure');
            return;
        }
        setSaving(true);
        try {
            await addMeasure(
                name.trim(),
                measureExpression(name.trim(), spec),
                createCategory || undefined,
                undefined,
                JSON.stringify(spec),
            );
            toast.success('Mesure créée');
            onClose();
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : 'Échec de l’enregistrement de la mesure',
            );
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                {/* Progress rail */}
                <div className="flex items-center gap-1 border-b border-border bg-panel px-4 py-2.5">
                    {steps.map((s, i) => (
                        <button
                            key={s}
                            onClick={() => i < stepIndex && setStep(s)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                                i === stepIndex
                                    ? 'bg-brand text-brand-foreground'
                                    : i < stepIndex
                                      ? 'bg-brand/15 text-brand hover:bg-brand/25'
                                      : 'text-muted-foreground hover:bg-accent',
                            )}
                        >
                            <span className="size-4 rounded-full bg-foreground/10 text-center text-[9px] leading-4">
                                {i + 1}
                            </span>
                            {STEP_LABELS[s]}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                        <Sparkles className="size-3.5 text-brand" />
                        <span className="text-[11px] font-semibold">
                            Assistant de mesure
                        </span>
                        <button
                            onClick={onClose}
                            aria-label="Fermer l'assistant"
                            title="Fermer"
                            className="ml-1 inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-4 p-4"
                    >
                        {step === 'objective' && (
                            <ObjectiveStep onPick={chooseMode} />
                        )}
                        {step === 'table' && (
                            <SingleTableStep
                                tables={tables}
                                value={fromTable}
                                onChange={selectTable}
                            />
                        )}
                        {step === 'result' && (
                            <ResultStep
                                toDef={toDef}
                                toColumns={toColumns}
                                kind={kind}
                                setKind={setKind}
                                agg={agg}
                                setAgg={setAgg}
                                column={column}
                                setColumn={setColumn}
                                condOn={condOn}
                                setCondOn={setCondOn}
                                condRows={condRows}
                                setCondRows={setCondRows}
                                condCombine={condCombine}
                                setCondCombine={setCondCombine}
                                periodOn={periodOn}
                                setPeriodOn={setPeriodOn}
                                periodWindow={periodWindow}
                                setPeriodWindow={setPeriodWindow}
                                periodDateRef={periodDateRef}
                                setPeriodDateRef={setPeriodDateRef}
                                tables={tables}
                                fromTable={fromTable}
                                dax={dax}
                                w3={w3}
                                patchW3={patchW3}
                            />
                        )}
                        {step === 'operands' && (
                            <LinkedStep
                                tables={tables}
                                measures={measures}
                                opA={opA}
                                setOpA={(d) => setOperand('A', d)}
                                opB={opB}
                                setOpB={(d) => setOperand('B', d)}
                                linkedStyle={linkedStyle}
                                chooseLinkedStyle={chooseLinkedStyle}
                                composeOp={composeOp}
                                setComposeOp={setComposeOp}
                                scaleHundreds={scaleHundreds}
                                setScaleHundreds={setScaleHundreds}
                                divZero={divZero}
                                setDivZero={setDivZero}
                                paths={paths}
                                activeVariant={activeVariant}
                                setActiveVariant={setActiveVariant}
                                hops={hops}
                                setHops={setHops}
                                proposals={proposals}
                                allowWeak={allowWeak}
                                setAllowWeak={setAllowWeak}
                                hasWeakHop={hasWeakHop}
                                kind={kind}
                                setKind={setKind}
                                agg={agg}
                                setAgg={setAgg}
                                column={column}
                                setColumn={setColumn}
                                toDef={toDef}
                                toColumns={toColumns}
                                rankBy={rankBy}
                                setRankBy={changeRankBy}
                                value={
                                    typeof preview === 'number'
                                        ? preview
                                        : null
                                }
                                error={previewError}
                                dax={dax}
                                onCreateSimple={switchToSingle}
                                condOn={condOn}
                                setCondOn={setCondOn}
                                condRows={condRows}
                                setCondRows={setCondRows}
                                condCombine={condCombine}
                                setCondCombine={setCondCombine}
                                periodOn={periodOn}
                                setPeriodOn={setPeriodOn}
                                periodWindow={periodWindow}
                                setPeriodWindow={setPeriodWindow}
                                periodDateRef={periodDateRef}
                                setPeriodDateRef={setPeriodDateRef}
                                w3={w3}
                                patchW3={patchW3}
                            />
                        )}
                        {step === 'save' && (
                            <SaveStep
                                name={name}
                                setName={setName}
                                dax={dax}
                                preview={preview}
                                error={previewError}
                            />
                        )}
                    </motion.div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border bg-panel px-4 py-2.5">
                    <button
                        onClick={stepBack}
                        className="flex items-center gap-1 rounded border border-border px-3 py-1 text-[12px]"
                    >
                        <ChevronLeft className="size-3.5" />
                        {stepIndex === 0 ? 'Annuler' : 'Retour'}
                    </button>
                    <button
                        onClick={goNext}
                        disabled={!canProceed}
                        className="flex items-center gap-1 rounded bg-brand px-4 py-1 text-[12px] font-medium text-brand-foreground disabled:opacity-40"
                    >
                        {stepIndex === steps.length - 1 ? (
                            <>
                                <Save className="size-3.5" />
                                {saving ? 'Enregistrement…' : 'Enregistrer'}
                            </>
                        ) : (
                            <>
                                {stepIndex >= 2 ? 'Vérifier' : 'Continuer'}
                                <ChevronRight className="size-3.5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/* ─────────────────────── Step: Objectif ─────────────────────────────── */

function ObjectiveStep({
    onPick,
}: {
    onPick: (m: WizardMode) => void;
}) {
    return (
        <div>
            <div className="mb-2 text-[15px] font-semibold">
                Que voulez-vous créer ?
            </div>
            <p className="mb-3 text-[12px] text-muted-foreground">
                Deux types de mesure. L’assistant en déduit les étapes — vous
                pourrez toujours ajuster le détail ensuite.
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
                {MODE_CARDS.map((c) => (
                    <button
                        key={c.key}
                        onClick={() => onPick(c.key)}
                        className="group rounded-xl border border-border bg-panel p-4 text-left transition-colors hover:border-brand/50 hover:bg-brand/5"
                    >
                        <span className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                            <c.icon className="size-4" />
                        </span>
                        <div className="text-[13px] font-semibold">
                            {c.title}
                        </div>
                        <div className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                            {c.hint}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ──────────────────────── Step: Table ──────────────────────────────── */

function SingleTableStep({
    tables,
    value,
    onChange,
}: {
    tables: TableDef[];
    value: string;
    onChange: (t: string) => void;
}) {
    return (
        <div>
            <div className="mb-1.5 text-[12px] font-semibold">
                Table à lire
            </div>
            <div className="flex flex-wrap gap-1">
                {tables.map((t) => (
                    <button
                        key={t.name}
                        onClick={() => onChange(t.name)}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-[12px] transition-colors',
                            value === t.name
                                ? 'border-brand bg-brand/15 font-medium'
                                : 'border-border hover:bg-accent',
                        )}
                    >
                        <Table2 className="mr-1.5 inline size-3.5 text-muted-foreground" />
                        {t.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ────────────────────────── Step: Chemin ────────────────────────────── */

/** Small pill describing how trustworthy a link is. */
function HopBadge({ c }: { c: JoinCandidate }) {
    const v = c.verified === true;
    const manuel = c.kind === 'manual';
    const sharedName = c.kind === 'shared';
    const label = manuel
        ? 'Manuelle'
        : sharedName
          ? v
              ? 'Colonne partagée'
              : 'Nom seul – à vérifier'
          : v
            ? 'Clé confirmée'
            : 'Partielle';
    const cls = manuel
        ? 'bg-brand/15 text-brand'
        : v
          ? 'bg-emerald-500/15 text-emerald-700'
          : 'bg-amber-500/15 text-amber-700';
    return (
        <span
            className={cn(
                'ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase',
                cls,
            )}
        >
            {label}
        </span>
    );
}

/* ────────────────────────── Step: Chemin ────────────────────────────── */

/** One editable stop on the route. */
function StopCard({
    index,
    hop,
    isFailing,
    siblings,
    onReplace,
    onRemove,
    onMove,
    canMoveUp,
    canMoveDown,
}: {
    index: number;
    hop: PathHop;
    isFailing: boolean;
    siblings: TableDef[];
    onReplace: (hop: PathHop) => void;
    onRemove: () => void;
    onMove: (dir: -1 | 1) => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
}) {
    const itFrom = siblings.find((t) => t.name === hop.from);
    const itTo = siblings.find((t) => t.name === hop.to);
    const options = (itFrom && itTo ? joinCandidates(itFrom, itTo) : []).filter(
        (c) =>
            !(
                c.aCol === hop.fromCol &&
                c.bCol === hop.toCol &&
                c.kind === hop.kind
            ) || c.overlap === hop.overlap,
    );

    const [swapFrom, setSwapFrom] = useState('');
    const [swapTo, setSwapTo] = useState('');

    const swapOptions = useMemo(() => {
        if (!swapFrom || !swapTo) return [] as JoinCandidate[];
        const da = siblings.find((t) => t.name === swapFrom);
        const db = siblings.find((t) => t.name === swapTo);
        if (!da || !db) return [] as JoinCandidate[];
        return joinCandidates(da, db);
    }, [swapFrom, swapTo, siblings]);

    const redefine = (c: JoinCandidate) =>
        onReplace({
            from: c.a,
            to: c.b,
            fromCol: c.aCol,
            toCol: c.bCol,
            kind: c.kind,
            overlap: c.overlap,
            confidence: c.confidence,
            verified: c.verified,
        });

    return (
        <div
            className={cn(
                'rounded-lg border p-2.5',
                isFailing
                    ? 'border-red-400 bg-red-50/40'
                    : 'border-border bg-background/50',
            )}
        >
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                    Arrêt {index + 1} —{' '}
                    <span className="font-mono text-foreground">
                        {hop.from}
                    </span>{' '}
                    →{' '}
                    <span className="font-mono text-foreground">{hop.to}</span>
                    {isFailing && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-red-700 uppercase">
                            ne renvoie aucune ligne
                        </span>
                    )}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        disabled={!canMoveUp}
                        onClick={() => onMove(-1)}
                        title="Monter"
                        className="rounded border border-border px-1.5 py-0.5 text-[11px] disabled:opacity-30"
                    >
                        ↑
                    </button>
                    <button
                        disabled={!canMoveDown}
                        onClick={() => onMove(1)}
                        title="Descendre"
                        className="rounded border border-border px-1.5 py-0.5 text-[11px] disabled:opacity-30"
                    >
                        ↓
                    </button>
                    <button
                        onClick={onRemove}
                        title="Supprimer cet arrêt"
                        className="rounded border border-border px-1.5 py-0.5 text-[11px] text-red-600 hover:border-red-400"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="mb-1 text-[11px] font-semibold">
                Colonnes de liaison
            </div>
            <div className="flex max-h-32 flex-wrap gap-1 overflow-auto">
                {options.map((c) => {
                    const active =
                        c.aCol === hop.fromCol && c.bCol === hop.toCol;
                    return (
                        <button
                            key={`${c.aCol}-${c.bCol}`}
                            onClick={() => redefine(c)}
                            className={cn(
                                'flex flex-wrap items-center rounded border px-2 py-1 text-[11px] transition-colors',
                                active
                                    ? 'border-brand bg-brand/15'
                                    : 'border-border hover:bg-accent',
                            )}
                        >
                            <span className="font-mono">
                                {c.aCol} ↔ {c.bCol}
                            </span>
                            <span className="ml-1 text-muted-foreground">
                                {Math.round(c.confidence * 100)}%
                            </span>
                            <HopBadge c={c} />
                        </button>
                    );
                })}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-[11px]">
                <span className="text-muted-foreground">
                    Changer les tables :
                </span>
                <select
                    value={swapFrom}
                    onChange={(e) => setSwapFrom(e.target.value)}
                    className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]"
                >
                    <option value="">Table A</option>
                    {siblings.map((t) => (
                        <option key={t.name} value={t.name}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <span className="text-muted-foreground">↔</span>
                <select
                    value={swapTo}
                    onChange={(e) => setSwapTo(e.target.value)}
                    className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]"
                >
                    <option value="">Table B</option>
                    {siblings.map((t) => (
                        <option key={t.name} value={t.name}>
                            {t.name}
                        </option>
                    ))}
                </select>
                {swapOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {swapOptions.map((c) => (
                            <button
                                key={`s-${c.aCol}-${c.bCol}`}
                                onClick={() => redefine(c)}
                                className="flex items-center rounded border border-brand/40 bg-card px-2 py-0.5 font-mono text-[11px] hover:bg-brand/10"
                            >
                                {c.aCol} ↔ {c.bCol}
                                <HopBadge c={c} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function PathStep({
    tables,
    proposals,
    paths,
    activeVariant,
    setActiveVariant,
    rankBy,
    setRankBy,
    hops,
    setHops,
    hasWeakHop,
    allowWeak,
    setAllowWeak,
    collapsible = false,
}: {
    tables: TableDef[];
    proposals: ProposedPath[];
    paths: PathHop[][];
    activeVariant: number;
    setActiveVariant: (i: number) => void;
    rankBy: ProposalRankBy;
    setRankBy: (r: ProposalRankBy) => void;
    hops: PathHop[];
    setHops: (h: PathHop[]) => void;
    hasWeakHop: boolean;
    allowWeak: boolean;
    setAllowWeak: (b: boolean) => void;
    collapsible?: boolean;
}) {
    const [open, setOpen] = useState(true);
    const replaceEdge = (index: number, hop: PathHop) =>
        setHops(hops.map((h, i) => (i === index ? hop : h)));

    const removeAt = (index: number) =>
        setHops(hops.filter((_, i) => i !== index));

    const moveAt = (index: number, dir: -1 | 1) => {
        const j = index + dir;
        if (j < 0 || j >= hops.length) return;
        const copy = [...hops];
        const tmp = copy[index]!;
        copy[index] = copy[j]!;
        copy[j] = tmp;
        setHops(copy);
    };

    const addHop = (hop: PathHop) => setHops([...hops, hop]);

    // Live diagnostics: does each generated variant actually produce data
    // against the loaded tables, and where does the active chain first break?
    const variantHasData = useMemo(
        () =>
            paths.map((hp) => {
                if (hp.length === 0) return false;
                const to = hp[hp.length - 1]!.to;
                const r = chainRowCount(hp[0]!.from, to, hp);
                return r.ok && r.count > 0;
            }),
        [paths],
    );
    const activeHasData = variantHasData[activeVariant] ?? false;
    const firstFail = useMemo(
        () =>
            hops.length
                ? firstFailingHop(
                      hops[0]!.from,
                      hops[hops.length - 1]!.to,
                      hops,
                  )
                : -1,
        [hops],
    );
    const nextGood = variantHasData.findIndex(
        (d, i) => d && i !== activeVariant,
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => collapsible && setOpen((o) => !o)}
                    className="flex items-center gap-1 text-[12px] font-semibold"
                >
                    {collapsible && (
                        <ChevronDown
                            className={cn(
                                'size-3 text-muted-foreground transition-transform',
                                open && 'rotate-180',
                            )}
                        />
                    )}
                    Chemin de relation
                </button>
                <div className="flex items-center gap-1 rounded-full border border-border p-0.5 text-[11px]">
                    <button
                        onClick={() => setRankBy('shortest')}
                        className={cn(
                            'rounded-full px-2.5 py-0.5',
                            rankBy === 'shortest'
                                ? 'bg-brand text-brand-foreground'
                                : 'text-muted-foreground',
                        )}
                        title="Prioriser les chemins les plus courts"
                    >
                        Plus court
                    </button>
                    <button
                        onClick={() => setRankBy('reliable')}
                        className={cn(
                            'rounded-full px-2.5 py-0.5',
                            rankBy === 'reliable'
                                ? 'bg-brand text-brand-foreground'
                                : 'text-muted-foreground',
                        )}
                        title="Prioriser les liaisons vérifiées"
                    >
                        Fiable
                    </button>
                </div>
            </div>

            {(!collapsible || open) && (
                <>
                    {proposals.every((p) => p.blocked) ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-700">
                    <div className="font-semibold">
                        {proposals[0]?.blocked?.reason ?? 'Chemin introuvable'}
                    </div>
                    <div className="mt-0.5 opacity-80">
                        {proposals[0]?.blocked?.detail ??
                            'Aucune colonne ne relie ces deux tables.'}
                    </div>
                    <p className="mt-2 text-[11px]">
                        Construisez le chemin à la main ci-dessous.
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-muted-foreground">
                            Variantes générées — sélectionnez celle à appliquer
                        </div>
                        {proposals.map((p, i) =>
                            p.blocked ? null : (
                                <VariantCard
                                    key={i}
                                    index={i}
                                    hops={paths[i] ?? p.hops}
                                    active={i === activeVariant}
                                    hasWeakHop={(paths[i] ?? p.hops).some(
                                        (h) => !isReliableHop(h),
                                    )}
                                    hasData={variantHasData[i] ?? false}
                                    onClick={() => setActiveVariant(i)}
                                />
                            ),
                        )}
                    </div>
                    {!activeHasData && nextGood >= 0 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 p-2.5 text-[12px]">
                            <span>
                                Cette variante ne produit <b>aucune donnée</b>{' '}
                                (0 / vide) sur les tables chargées.
                            </span>
                            <button
                                onClick={() => setActiveVariant(nextGood)}
                                className="rounded bg-brand px-2.5 py-1 text-[11px] font-medium text-brand-foreground"
                            >
                                Essayer la variante n°{nextGood + 1} qui produit
                                des données
                            </button>
                        </div>
                    )}
                    <PathVisualizer hops={hops} firstFail={firstFail} />
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            onClick={() =>
                                setHops(proposals[activeVariant]?.hops ?? [])
                            }
                            disabled={activeVariant >= proposals.length}
                            className="rounded border border-brand/40 bg-brand/5 px-2.5 py-1 text-[11px] text-brand hover:bg-brand/10 disabled:opacity-40"
                        >
                            Réinitialiser la variante activée
                        </button>
                        <button
                            onClick={() => setHops([])}
                            disabled={hops.length === 0}
                            className="rounded border border-border px-2.5 py-1 text-[11px] disabled:opacity-30"
                        >
                            Vider le chemin
                        </button>
                    </div>
                </>
            )}

            {hasWeakHop && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-[12px] text-red-700">
                    <span className="mr-1">
                        Au moins une liaison de cet arrêt n'a{' '}
                        <b>aucune correspondance de valeurs vérifiée</b>. La
                        mesure produira 0 / vide tant que ce lien n'est pas
                        corrigé.
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium">
                        <input
                            type="checkbox"
                            checked={allowWeak}
                            onChange={(e) => setAllowWeak(e.target.checked)}
                            className="accent-red-600"
                        />
                        Autoriser quand même une liaison non vérifiée
                    </label>
                </div>
            )}

            {hops.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[12px] font-semibold">
                        Modifier chaque arrêt
                    </div>
                    {hops.map((hop, idx) => (
                        <StopCard
                            key={idx}
                            index={idx}
                            hop={hop}
                            isFailing={idx === firstFail}
                            siblings={tables}
                            onReplace={(h) => replaceEdge(idx, h)}
                            onRemove={() => removeAt(idx)}
                            onMove={(d) => moveAt(idx, d)}
                            canMoveUp={idx > 0}
                            canMoveDown={idx < hops.length - 1}
                        />
                    ))}
                </div>
            )}

            <JoinBuilder
                tables={tables}
                onPick={(from, to, fromCol, toCol) =>
                    addHop({
                        from,
                        to,
                        fromCol,
                        toCol,
                        kind: 'manual',
                        overlap: 1,
                        confidence: 1,
                    })
                }
            />
                </>
            )}
        </div>
    );
}

/* ───────────────────────── Step: Résultat ───────────────────────────── */

/** Multi-select value picker fed by the column's distinct values (W2-1). */
function ConditionValuePicker({
    tables,
    table,
    column,
    selected,
    onChange,
}: {
    tables: TableDef[];
    table: string;
    column: string;
    selected: string[];
    onChange: (values: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const values = useMemo(
        () =>
            table && column
                ? distinctValuesForTableColumn(tables, table, column)
                : [],
        [tables, table, column],
    );
    const filtered = values.filter((v) =>
        v.toLowerCase().includes(q.trim().toLowerCase()),
    );
    const chosen = new Set(selected);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px]"
            >
                {selected.length
                    ? `${selected.length} valeur${selected.length > 1 ? 's' : ''}`
                    : 'Choisir…'}
                <ChevronDown className="size-3" />
            </button>
            {open && (
                <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-md border border-border bg-card p-2 shadow-xl">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Filtrer…"
                        className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/50"
                    />
                    <div className="mt-1.5 max-h-48 space-y-0.5 overflow-auto">
                        {filtered.length === 0 && (
                            <p className="px-1 py-1 text-[11px] text-muted-foreground">
                                Aucune valeur
                            </p>
                        )}
                        {filtered.map((v) => (
                            <label
                                key={v}
                                className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[11px] hover:bg-accent"
                            >
                                <input
                                    type="checkbox"
                                    checked={chosen.has(v)}
                                    onChange={() => {
                                        const next = new Set(selected);
                                        if (next.has(v)) next.delete(v);
                                        else next.add(v);
                                        onChange(
                                            [...next].sort((a, b) =>
                                                a.localeCompare(b),
                                            ),
                                        );
                                    }}
                                    className="accent-brand"
                                />
                                <span className="truncate">{v}</span>
                            </label>
                        ))}
                    </div>
                    {selected.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="mt-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                            Tout effacer
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/** One editable condition row: column (base or target), operator, value. */
function ConditionRowEditor({
    row,
    tables,
    from,
    to,
    onChange,
    onRemove,
}: {
    row: ValueCondition;
    tables: TableDef[];
    from: string;
    to: string;
    onChange: (patch: Partial<ValueCondition>) => void;
    onRemove: () => void;
}) {
    const table = row.table ?? to;
    const targetDef = tables.find((t) => t.name === to);
    const baseDef = tables.find((t) => t.name === from);
    const isMulti = row.op === 'in' || row.op === 'notIn';
    const colOptions: { table: string; column: string; label: string }[] = [
        ...(targetDef?.fields ?? []).map((f) => ({
            table: to,
            column: f.name,
            label: f.name,
        })),
        ...(from !== to
            ? (baseDef?.fields ?? []).map((f) => ({
                  table: from,
                  column: f.name,
                  label: `${from} — ${f.name}`,
              }))
            : []),
    ];

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <select
                value={`${table}|${row.column}`}
                onChange={(e) => {
                    const [t, c] = e.target.value.split('|');
                    onChange({
                        table: t && t !== to ? t : undefined,
                        column: c ?? '',
                    });
                }}
                className="rounded border border-border bg-background px-2 py-1 text-[11px]"
            >
                <option value="">Colonne</option>
                {colOptions.map((o) => (
                    <option
                        key={`${o.table}|${o.column}`}
                        value={`${o.table}|${o.column}`}
                    >
                        {o.label}
                    </option>
                ))}
            </select>
            <select
                value={row.op}
                onChange={(e) => {
                    const op = e.target.value as ValueCondition['op'];
                    const multi = op === 'in' || op === 'notIn';
                    onChange(
                        multi
                            ? {
                                  op,
                                  values: row.value
                                      ? [row.value]
                                      : (row.values ?? []),
                              }
                            : {
                                  op,
                                  value: row.values?.[0] ?? row.value ?? '',
                              },
                    );
                }}
                className="rounded border border-border bg-background px-2 py-1 text-[11px]"
            >
                {OP_KEYS.map((op) => (
                    <option key={op} value={op}>
                        {COND_LABELS[op]}
                    </option>
                ))}
            </select>
            {isMulti ? (
                <ConditionValuePicker
                    tables={tables}
                    table={table}
                    column={row.column}
                    selected={row.values ?? []}
                    onChange={(values) => onChange({ values })}
                />
            ) : (
                <input
                    value={row.value}
                    onChange={(e) => onChange({ value: e.target.value })}
                    placeholder="valeur"
                    className="w-28 rounded border border-border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/50"
                />
            )}
            <button
                type="button"
                onClick={onRemove}
                aria-label="Supprimer la condition"
                title="Supprimer"
                className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
                <X className="size-3.5" />
            </button>
        </div>
    );
}

/** Result to read on the arrival table of the "Valeurs liées" flow. */
function ResultAxisSelect({
    toDef,
    columns,
    kind,
    setKind,
    agg,
    setAgg,
    column,
    setColumn,
}: {
    toDef: TableDef | undefined;
    columns: string[];
    kind: WizardSpec['kind'];
    setKind: (k: WizardSpec['kind']) => void;
    agg: NumericAgg;
    setAgg: (a: NumericAgg) => void;
    column: string;
    setColumn: (c: string) => void;
}) {
    const activeOp =
        SIMPLE_OPERATIONS.find(
            (o) => o.kind === kind && (o.kind !== 'number' || o.agg === agg),
        ) ?? SIMPLE_OPERATIONS[1]!;
    const opNeedsColumn = activeOp.needsColumn;
    const clickOp = (o: SimpleOperation) => {
        setKind(o.kind);
        setAgg(o.agg ?? 'sum');
        if (o.needsColumn && column === '') {
            const num = toDef?.fields.find((f) => f.type === 'number');
            setColumn(num?.name ?? toDef?.fields?.[0]?.name ?? '');
        }
    };
    const toFields = toDef?.fields ?? [];
    const numericColumns = toFields
        .filter((f) => f.type === 'number')
        .map((f) => f.name);
    const orderedColumns = [
        ...numericColumns,
        ...columns.filter((c) => !numericColumns.includes(c)),
    ];
    const selectedType = toFields.find((f) => f.name === column)?.type;
    const numOnly =
        kind === 'number' && (agg === 'sum' || agg === 'avg');
    const numOnlyMismatch = numOnly && selectedType !== 'number';
    const clickColumn = (c: string) => {
        const f = toFields.find((x) => x.name === c);
        if (
            f != null &&
            f.type !== 'number' &&
            numOnly
        ) {
            setAgg('count');
            setColumn(c);
            return;
        }
        setColumn(c);
    };
    return (
        <div className="space-y-3">
            <div>
                <div className="mb-1.5 text-[12px] font-semibold">
                    Résultat à lire
                </div>
                <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4">
                    {SIMPLE_OPERATIONS.map((o) => (
                        <button
                            key={o.key}
                            onClick={() => clickOp(o)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors',
                                activeOp.key === o.key
                                    ? 'border-brand bg-brand/15 font-medium'
                                    : 'border-border hover:bg-accent',
                            )}
                        >
                            <span className="text-muted-foreground">
                                {simpleIcon(o.key, 'size-3.5')}
                            </span>
                            {o.label}
                        </button>
                    ))}
                </div>
                {opNeedsColumn && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                        Colonne à lire sur la table d'arrivée.
                    </p>
                )}
            </div>

            {opNeedsColumn && (
                <div>
                    <div
                        className={cn(
                            'mb-1.5 text-[12px] font-semibold',
                            column === '' && 'text-brand',
                        )}
                    >
                        Colonne de la table « {toDef?.name ?? ''} »
                    </div>
                    {columns.length ? (
                        <div className="flex max-h-40 flex-wrap gap-1 overflow-auto">
                            {orderedColumns.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => clickColumn(c)}
                                    className={cn(
                                        'rounded border px-2 py-1 font-mono text-[11px] transition-colors',
                                        column === c
                                            ? 'border-brand bg-brand/15'
                                            : 'border-border hover:bg-accent',
                                    )}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">
                            Aucune colonne disponible.
                        </p>
                    )}
                    {numOnlyMismatch && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                            Somme et Moyenne exigent une colonne numérique —
                            agrégation réglée sur Nombre (non vides).
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Card: the multi-row AND / OR condition section, shared by the single-value
 * flow and composed measures (its rows are folded into the spec the engine
 * turns into the correlated FILTER rear the CALCULATE wrapper).
 */
function ConditionCard({
    condOn,
    setCondOn,
    condRows,
    setCondRows,
    condCombine,
    setCondCombine,
    tables,
    from,
    to,
}: {
    condOn: boolean;
    setCondOn: (b: boolean) => void;
    condRows: ValueCondition[];
    setCondRows: Dispatch<SetStateAction<ValueCondition[]>>;
    condCombine: 'and' | 'or';
    setCondCombine: (c: 'and' | 'or') => void;
    tables: TableDef[];
    from: string;
    to: string;
}) {
    return (
        <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-[12px]">
                <input
                    type="checkbox"
                    checked={condOn}
                    onChange={(e) => setCondOn(e.target.checked)}
                    className="accent-brand"
                />
                Appliquer une condition
            </label>
            {condOn && (
                <div className="mt-2 space-y-1.5">
                    {condRows.length > 1 && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-muted-foreground">
                                Combiner les conditions en
                            </span>
                            <select
                                value={condCombine}
                                onChange={(e) =>
                                    setCondCombine(
                                        e.target.value as 'and' | 'or',
                                    )
                                }
                                className="rounded border border-border bg-background px-2 py-1 text-[11px]"
                            >
                                <option value="and">ET (toutes)</option>
                                <option value="or">OU (au moins une)</option>
                            </select>
                        </div>
                    )}
                    {condRows.map((row, i) => (
                        <ConditionRowEditor
                            key={i}
                            row={row}
                            tables={tables}
                            from={from}
                            to={to}
                            onChange={(patch) =>
                                setCondRows((rows) =>
                                    rows.map((r, idx) =>
                                        idx === i
                                            ? { ...r, ...patch }
                                            : r,
                                    ),
                                )
                            }
                            onRemove={() =>
                                setCondRows((rows) =>
                                    rows.length > 1
                                        ? rows.filter(
                                              (_, idx) => idx !== i,
                                          )
                                        : rows,
                                )
                            }
                        />
                    ))}
                    <button
                        type="button"
                        onClick={() =>
                            setCondRows((rows) => [
                                ...rows,
                                { column: '', op: 'gt', value: '' },
                            ])
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline"
                    >
                        <Plus className="size-3" />
                        Ajouter une condition
                    </button>
                </div>
            )}
        </div>
    );
}

/** Card: the time-window (YTD / MTD / year-ago / M-1) section. */
function PeriodCard({
    periodOn,
    setPeriodOn,
    periodWindow,
    setPeriodWindow,
    periodDateRef,
    setPeriodDateRef,
    tables,
}: {
    periodOn: boolean;
    setPeriodOn: (b: boolean) => void;
    periodWindow: PeriodWindow;
    setPeriodWindow: (w: PeriodWindow) => void;
    periodDateRef: string;
    setPeriodDateRef: (v: string) => void;
    tables: TableDef[];
}) {
    const dateFieldOptions = tables.flatMap((t) =>
        (t.fields ?? []).map((f) => `${t.name}[${f.name}]`),
    );
    return (
        <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-[12px]">
                <input
                    type="checkbox"
                    checked={periodOn}
                    onChange={(e) => setPeriodOn(e.target.checked)}
                    className="accent-brand"
                />
                Appliquer une période
            </label>
            {periodOn && (
                <div className="mt-2 space-y-1.5">
                    <select
                        value={periodWindow}
                        onChange={(e) =>
                            setPeriodWindow(e.target.value as PeriodWindow)
                        }
                        className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                    >
                        {PERIOD_KEYS.map((w) => (
                            <option key={w} value={w}>
                                {PERIOD_LABELS[w]}
                            </option>
                        ))}
                    </select>
                    <div className="text-[11px] text-muted-foreground">
                        Colonne de date (ex. kpi_br_print[mois])
                    </div>
                    <select
                        value={periodDateRef}
                        onChange={(e) =>
                            setPeriodDateRef(e.target.value)
                        }
                        className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-[11px]"
                    >
                        <option value="">Choisir une colonne…</option>
                        {dateFieldOptions.map((ref) => (
                            <option key={ref} value={ref}>
                                {ref}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}

/**
 * Wave-3 cards: « Part du total », « Top N », « Texte concaténé » and
 * « Modèle SI ». Number wrappers (pct / topN / IF) are mutually exclusive;
 * `compose` narrows the set to the percent-of-total card (row-iteration
 * wrappers have no meaning over a composed scalar ratio).
 */
function Wave3Options({
    toColumns,
    column,
    kind,
    compose,
    w3,
    patch,
}: {
    toColumns: string[];
    column: string;
    kind: MeasureKind;
    compose?: boolean;
    w3: Wave3State;
    patch: (p: Partial<Wave3State>) => void;
}) {
    const defaultColumn = column || toColumns[0] || '';
    const setPct = (on: boolean) => {
        if (on) patch({ pctOn: true, topNOn: false, ifOn: false });
        else patch({ pctOn: false });
    };
    const setTopN = (on: boolean) => {
        if (on)
            patch({
                topNOn: true,
                pctOn: false,
                ifOn: false,
                ...(w3.topNOrder === ''
                    ? { topNOrder: defaultColumn }
                    : {}),
            });
        else patch({ topNOn: false });
    };
    const setIf = (on: boolean) =>
        on
            ? patch({
                  ifOn: true,
                  pctOn: false,
                  topNOn: false,
                  ...(w3.ifColumn === '' ? { ifColumn: defaultColumn } : {}),
              })
            : patch({ ifOn: false });
    const setConcat = (on: boolean) => patch({ concatOn: on });

    const ifListOp = w3.ifOp === 'in' || w3.ifOp === 'notIn';

    return (
        <div className="space-y-2">
            {/* ── Part du total (W3-2) ── */}
            {(kind === 'number' || compose) && (
                <div className="rounded-lg border border-border p-3">
                    <label className="flex items-center gap-2 text-[12px]">
                        <input
                            type="checkbox"
                            checked={w3.pctOn}
                            onChange={(e) => setPct(e.target.checked)}
                            className="accent-brand"
                        />
                        <Percent className="size-3.5 text-muted-foreground" />
                        Part du total (%)
                    </label>
                    {w3.pctOn && (
                        <div className="mt-2 space-y-1.5">
                            <select
                                value={w3.pctAxis}
                                onChange={(e) =>
                                    patch({ pctAxis: e.target.value })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                            >
                                <option value="">
                                    Toute la table ({compose ? 'ALL(...)' : 'ALL(to)'})
                                </option>
                                {toColumns.map((c) => (
                                    <option key={c} value={c}>
                                        Par « {c} »
                                    </option>
                                ))}
                            </select>
                            <div className="font-mono text-[10px] text-muted-foreground">
                                DIVIDE(résultat, CALCULATE(résultat, ALL(
                                {w3.pctAxis ? `to[${w3.pctAxis}]` : 'to'}
                                )), 0) * 100
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Top N (W3-3) ── */}
            {kind === 'number' && !compose && (
                <div className="rounded-lg border border-border p-3">
                    <label className="flex items-center gap-2 text-[12px]">
                        <input
                            type="checkbox"
                            checked={w3.topNOn}
                            onChange={(e) => setTopN(e.target.checked)}
                            className="accent-brand"
                        />
                        <Sigma className="size-3.5 text-muted-foreground" />
                        Top N (n premières lignes)
                    </label>
                    {w3.topNOn && (
                        <div className="mt-2 grid gap-1.5">
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number"
                                    min={1}
                                    value={w3.topNCount}
                                    onChange={(e) =>
                                        patch({
                                            topNCount: Math.max(
                                                1,
                                                Math.floor(
                                                    Number(e.target.value) ||
                                                        1,
                                                ),
                                            ),
                                        })
                                    }
                                    className="w-20 rounded border border-border bg-background px-2 py-1 text-[11px]"
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    lignes ordonnées par
                                </span>
                                <select
                                    value={w3.topNOrder}
                                    onChange={(e) =>
                                        patch({
                                            topNOrder: e.target.value,
                                        })
                                    }
                                    className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-[11px]"
                                >
                                    <option value="" disabled>
                                        Colonne…
                                    </option>
                                    {toColumns.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => patch({ topNDir: 'desc' })}
                                    className={cn(
                                        'rounded border px-2 py-1 text-[11px] transition-colors',
                                        w3.topNDir === 'desc'
                                            ? 'border-brand bg-brand/15 text-brand'
                                            : 'border-border hover:bg-accent',
                                    )}
                                >
                                    DESC (plus grandes)
                                </button>
                                <button
                                    onClick={() => patch({ topNDir: 'asc' })}
                                    className={cn(
                                        'rounded border px-2 py-1 text-[11px] transition-colors',
                                        w3.topNDir === 'asc'
                                            ? 'border-brand bg-brand/15 text-brand'
                                            : 'border-border hover:bg-accent',
                                    )}
                                >
                                    ASC (plus petites)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Texte concaténé (W3-5) ── */}
            {kind === 'list' && !compose && (
                <div className="rounded-lg border border-border p-3">
                    <label className="flex items-center gap-2 text-[12px]">
                        <input
                            type="checkbox"
                            checked={w3.concatOn}
                            onChange={(e) => setConcat(e.target.checked)}
                            className="accent-brand"
                        />
                        <List className="size-3.5 text-muted-foreground" />
                        Concaténer en texte
                    </label>
                    {w3.concatOn && (
                        <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <input
                                    value={w3.concatSep}
                                    onChange={(e) =>
                                        patch({
                                            concatSep: e.target.value,
                                        })
                                    }
                                    className="rounded border border-border bg-background px-2 py-1 text-[11px]"
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    séparateur
                                </span>
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                                CONCATENATEX(to, to[{column}], "
                                {w3.concatSep.replace(/"/g, '""')}")
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modèle SI (W3-6) ── */}
            {kind === 'number' && !compose && (
                <div className="rounded-lg border border-border p-3">
                    <label className="flex items-center gap-2 text-[12px]">
                        <input
                            type="checkbox"
                            checked={w3.ifOn}
                            onChange={(e) => setIf(e.target.checked)}
                            className="accent-brand"
                        />
                        <Hash className="size-3.5 text-muted-foreground" />
                        Modèle SI (IF)
                    </label>
                    {w3.ifOn && (
                        <div className="mt-2 space-y-1.5">
                            <select
                                value={w3.ifColumn}
                                onChange={(e) =>
                                    patch({ ifColumn: e.target.value })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-[11px]"
                            >
                                <option value="" disabled>
                                    Colonne de branche…
                                </option>
                                {toColumns.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={w3.ifOp}
                                onChange={(e) =>
                                    patch({
                                        ifOp: e.target
                                            .value as ValueCondition['op'],
                                    })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                            >
                                {OP_KEYS.map((op) => (
                                    <option key={op} value={op}>
                                        {COND_LABELS[op]}
                                    </option>
                                ))}
                            </select>
                            {ifListOp ? (
                                <input
                                    value={w3.ifValues.join(', ')}
                                    onChange={(e) =>
                                        patch({
                                            ifValues: e.target.value
                                                .split(',')
                                                .map((v) => v.trim())
                                                .filter((v) => v !== ''),
                                        })
                                    }
                                    placeholder="valeur1, valeur2, …"
                                    className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-[11px]"
                                />
                            ) : (
                                <input
                                    value={w3.ifValue}
                                    onChange={(e) =>
                                        patch({ ifValue: e.target.value })
                                    }
                                    placeholder="valeur comparée"
                                    className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-[11px]"
                                />
                            )}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground">
                                    alors
                                </span>
                                <input
                                    type="number"
                                    value={w3.ifThen}
                                    onChange={(e) =>
                                        patch({
                                            ifThen: Number(
                                                e.target.value,
                                            ) || 0,
                                        })
                                    }
                                    className="w-24 rounded border border-border bg-background px-2 py-1 text-[11px]"
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    sinon
                                </span>
                                <input
                                    type="number"
                                    value={w3.ifElse}
                                    onChange={(e) =>
                                        patch({
                                            ifElse: Number(
                                                e.target.value,
                                            ) || 0,
                                        })
                                    }
                                    className="w-24 rounded border border-border bg-background px-2 py-1 text-[11px]"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ResultStep({
    toDef,
    toColumns,
    kind,
    setKind,
    agg,
    setAgg,
    column,
    setColumn,
    condOn,
    setCondOn,
    condRows,
    setCondRows,
    condCombine,
    setCondCombine,
    periodOn,
    setPeriodOn,
    periodWindow,
    setPeriodWindow,
    periodDateRef,
    setPeriodDateRef,
    tables,
    fromTable,
    dax,
    w3,
    patchW3,
}: {
    toDef: TableDef | undefined;
    toColumns: string[];
    kind: WizardSpec['kind'];
    setKind: (k: WizardSpec['kind']) => void;
    agg: NumericAgg;
    setAgg: (a: NumericAgg) => void;
    column: string;
    setColumn: (c: string) => void;
    condOn: boolean;
    setCondOn: (b: boolean) => void;
    condRows: ValueCondition[];
    setCondRows: Dispatch<SetStateAction<ValueCondition[]>>;
    condCombine: 'and' | 'or';
    setCondCombine: (c: 'and' | 'or') => void;
    periodOn: boolean;
    setPeriodOn: (b: boolean) => void;
    periodWindow: PeriodWindow;
    setPeriodWindow: (w: PeriodWindow) => void;
    periodDateRef: string;
    setPeriodDateRef: (v: string) => void;
    tables: TableDef[];
    fromTable: string;
    dax: string;
    w3: Wave3State;
    patchW3: (p: Partial<Wave3State>) => void;
}) {
    return (
        <div className="grid gap-4">
            <div>
                <div className="mb-1.5 text-[12px] font-semibold">
                    Type de résultat
                </div>
                <div className="flex flex-wrap gap-1">
                    {(['number', 'countrows', 'list'] as const).map((k) => (
                        <button
                            key={k}
                            onClick={() => setKind(k)}
                            className={cn(
                                'rounded-lg border px-3 py-1.5 text-[12px] transition-colors',
                                kind === k
                                    ? 'border-brand bg-brand/15 font-medium'
                                    : 'border-border hover:bg-accent',
                            )}
                        >
                            {KIND_LABELS[k]}
                        </button>
                    ))}
                </div>
            </div>

            <>
                {kind === 'number' && (
                    <div>
                        <div className="mb-1.5 text-[12px] font-semibold">
                            Agrégation
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {AGG_KEYS.map((a) => (
                                <button
                                    key={a}
                                    onClick={() => setAgg(a)}
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                                        agg === a
                                            ? 'border-brand bg-brand/15'
                                            : 'border-border hover:bg-accent',
                                    )}
                                >
                                    {AGG_LABELS[a]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {kind !== 'countrows' && (
                    <div>
                        <div className="mb-1.5 text-[12px] font-semibold">
                            Colonne de la table « {toDef?.name ?? ''} »
                        </div>
                        {toColumns.length ? (
                            <div className="flex max-h-40 flex-wrap gap-1 overflow-auto">
                                {toColumns.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setColumn(c)}
                                        className={cn(
                                            'rounded border px-2 py-1 font-mono text-[11px] transition-colors',
                                            column === c
                                                ? 'border-brand bg-brand/15'
                                                : 'border-border hover:bg-accent',
                                        )}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[11px] text-muted-foreground">
                                Aucune colonne disponible.
                            </p>
                        )}
                    </div>
                )}

                <Wave3Options
                    toColumns={toColumns}
                    column={column}
                    kind={kind}
                    w3={w3}
                    patch={patchW3}
                />

                <ConditionCard
                    condOn={condOn}
                    setCondOn={setCondOn}
                    condRows={condRows}
                    setCondRows={setCondRows}
                    condCombine={condCombine}
                    setCondCombine={setCondCombine}
                    tables={tables}
                    from={fromTable}
                    to={toDef?.name ?? ''}
                />

                {kind === 'number' && (
                    <PeriodCard
                        periodOn={periodOn}
                        setPeriodOn={setPeriodOn}
                        periodWindow={periodWindow}
                        setPeriodWindow={setPeriodWindow}
                        periodDateRef={periodDateRef}
                        setPeriodDateRef={setPeriodDateRef}
                        tables={tables}
                    />
                )}

                <div>
                    <div className="mb-1.5 text-[12px] font-semibold">
                        Formule générée
                    </div>
                    <pre className="overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                        {dax}
                    </pre>
                </div>
            </>
        </div>
    );
}

/* ───────────────────────── Step: Opérandes ─────────────────────────── */

function OperandEditor({
    label,
    tables,
    measures,
    value,
    onChange,
    onCreateSimple,
    tableOnly = false,
}: {
    label: string;
    tables: TableDef[];
    measures: Field[];
    value: OperandDraft;
    onChange: (d: OperandDraft) => void;
    onCreateSimple: () => void;
    tableOnly?: boolean;
}) {
    const patch = (p: Partial<OperandDraft>) => onChange({ ...value, ...p });
    const operandFields = tables.find((t) => t.name === value.table)?.fields;
    const selectedField = (operandFields ?? []).find(
        (f) => f.name === value.column,
    );
    const isNumeric = selectedField?.type === 'number';
    const numericFields = (operandFields ?? [])
        .filter((f) => f.type === 'number')
        .map((f) => f.name);
    const otherFields = (operandFields ?? [])
        .filter((f) => f.type !== 'number')
        .map((f) => f.name);
    const numOnlyRemark =
        value.kind === 'column' &&
        (value.agg === 'sum' || value.agg === 'avg') &&
        !isNumeric;

    const summary = tableOnly
        ? value.table || 'Choisissez une table'
        : value.kind === 'column'
          ? value.table && value.column
              ? `${AGG_LABELS[value.agg]} de ${value.table}[${value.column}]`
              : 'Choisissez une table et une colonne'
          : value.kind === 'measure'
            ? value.measure
                ? `Mesure [${value.measure}]`
                : 'Choisissez une mesure'
            : value.value
              ? `Constante ${value.value}`
              : 'Saisissez une constante';

    return (
        <div className="rounded-lg border border-border bg-panel p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
                <div className="text-[12px] font-semibold">
                    {tableOnly ? label : `Opérande ${label}`}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                    {summary}
                </div>
            </div>
            {!tableOnly && (
                <div className="mb-2 flex flex-wrap gap-1">
                    {(
                        [
                            { key: 'measure', label: 'Mesure' },
                            { key: 'column', label: 'Colonne' },
                            { key: 'number', label: 'Nombre' },
                        ] as const
                    ).map((k) => (
                        <button
                            key={k.key}
                            onClick={() => patch({ kind: k.key })}
                            className={cn(
                                'rounded border px-2.5 py-1 text-[11px] transition-colors',
                                value.kind === k.key
                                    ? 'border-brand bg-brand/15'
                                    : 'border-border hover:bg-accent',
                            )}
                        >
                            {k.label}
                        </button>
                    ))}
                </div>
            )}

            {value.kind === 'measure' && (
                <>
                    <select
                        value={value.measure}
                        onChange={(e) => patch({ measure: e.target.value })}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-[12px]"
                    >
                        <option value="">Mesure…</option>
                        {measures.map((m) => (
                            <option key={m.name} value={m.name}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                    {measures.length === 0 && (
                        <div className="mt-2 rounded border border-dashed border-border p-2 text-[11px] leading-relaxed text-muted-foreground">
                            Aucune mesure existante. Créez d'abord une mesure
                            simple — elle apparaîtra ici.
                            <button
                                type="button"
                                onClick={onCreateSimple}
                                className="mt-1.5 block rounded border border-brand/40 bg-brand/10 px-2 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand/20"
                            >
                                Créer une mesure simple
                            </button>
                        </div>
                    )}
                </>
            )}

            {value.kind === 'number' && (
                <input
                    type="number"
                    step="any"
                    value={value.value}
                    onChange={(e) => patch({ value: e.target.value })}
                    placeholder="ex : 1,5"
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-[12px] placeholder:text-muted-foreground/50"
                />
            )}

            {value.kind === 'column' && (
                <div className="grid gap-2">
                    <select
                        value={value.table}
                        onChange={(e) => {
                            const t = e.target.value;
                            const def = tables.find((d) => d.name === t);
                            const col =
                                (
                                    def?.fields.find(
                                        (f) => f.type === 'number',
                                    ) ?? def?.fields[0]
                                )?.name ?? '';
                            patch({ table: t, column: col });
                        }}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-[12px]"
                    >
                        <option value="">Table…</option>
                        {tables.map((t) => (
                            <option key={t.name} value={t.name}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                    {!tableOnly && (
                        <>
                            <select
                                value={value.column}
                                onChange={(e) => {
                                    const c = e.target.value;
                                    const f = (operandFields ?? []).find(
                                        (x) => x.name === c,
                                    );
                                    const nonNum =
                                        f != null && f.type !== 'number';
                                    patch(
                                        nonNum &&
                                            (value.agg === 'sum' ||
                                                value.agg === 'avg')
                                            ? { column: c, agg: 'count' }
                                            : { column: c },
                                    );
                                }}
                                className="w-full rounded border border-border bg-background px-2 py-1.5 text-[12px]"
                            >
                                <option value="">Colonne…</option>
                                {numericFields.length > 0 && (
                                    <optgroup label="Colonnes numériques">
                                        {numericFields.map((f) => (
                                            <option key={f} value={f}>
                                                {f}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                {otherFields.length > 0 && (
                                    <optgroup label="Autres colonnes">
                                        {otherFields.map((f) => (
                                            <option key={f} value={f}>
                                                {f}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            <div className="flex flex-wrap gap-1">
                                {AGG_KEYS.map((a) => {
                                    const blocked =
                                        (a === 'sum' || a === 'avg') &&
                                        !isNumeric;
                                    return (
                                        <button
                                            key={a}
                                            onClick={() => patch({ agg: a })}
                                            disabled={blocked}
                                            title={
                                                blocked
                                                    ? 'Somme et Moyenne exigent une colonne numérique.'
                                                    : undefined
                                            }
                                            className={cn(
                                                'rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                                                value.agg === a
                                                    ? 'border-brand bg-brand/15'
                                                    : 'border-border hover:bg-accent',
                                                blocked &&
                                                    'cursor-not-allowed opacity-40',
                                            )}
                                        >
                                            {AGG_LABELS[a]}
                                        </button>
                                    );
                                })}
                            </div>
                            {numOnlyRemark && (
                                <p className="text-[10px] leading-snug text-muted-foreground">
                                    Somme et Moyenne exigent une colonne
                                    numérique — agrégation réglée sur Nombre
                                    (non vides).
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function LinkedStep({
    tables,
    measures,
    opA,
    setOpA,
    opB,
    setOpB,
    linkedStyle,
    chooseLinkedStyle,
    composeOp,
    setComposeOp,
    scaleHundreds,
    setScaleHundreds,
    divZero,
    setDivZero,
    paths,
    activeVariant,
    setActiveVariant,
    hops,
    setHops,
    proposals,
    allowWeak,
    setAllowWeak,
    hasWeakHop,
    kind,
    setKind,
    agg,
    setAgg,
    column,
    setColumn,
    toDef,
    toColumns,
    rankBy,
    setRankBy,
    value,
    error,
    dax,
    onCreateSimple,
    condOn,
    setCondOn,
    condRows,
    setCondRows,
    condCombine,
    setCondCombine,
    periodOn,
    setPeriodOn,
    periodWindow,
    setPeriodWindow,
    periodDateRef,
    setPeriodDateRef,
    w3,
    patchW3,
}: {
    tables: TableDef[];
    measures: Field[];
    opA: OperandDraft;
    setOpA: (d: OperandDraft) => void;
    opB: OperandDraft;
    setOpB: (d: OperandDraft) => void;
    linkedStyle: 'compose' | 'related' | null;
    chooseLinkedStyle: (s: 'compose' | 'related') => void;
    composeOp: CompositeSpec['op'];
    setComposeOp: (op: CompositeSpec['op']) => void;
    scaleHundreds: boolean;
    setScaleHundreds: (b: boolean) => void;
    divZero: DivZeroDefault;
    setDivZero: (d: DivZeroDefault) => void;
    paths: PathHop[][];
    activeVariant: number;
    setActiveVariant: (i: number) => void;
    hops: PathHop[];
    setHops: (h: PathHop[]) => void;
    proposals: ProposedPath[];
    allowWeak: boolean;
    setAllowWeak: (b: boolean) => void;
    hasWeakHop: boolean;
    kind: WizardSpec['kind'];
    setKind: (k: WizardSpec['kind']) => void;
    agg: NumericAgg;
    setAgg: (a: NumericAgg) => void;
    column: string;
    setColumn: (c: string) => void;
    toDef: TableDef | undefined;
    toColumns: string[];
    rankBy: ProposalRankBy;
    setRankBy: (r: ProposalRankBy) => void;
    value: number | null;
    error: string | null;
    dax: string;
    onCreateSimple: () => void;
    condOn: boolean;
    setCondOn: (b: boolean) => void;
    condRows: ValueCondition[];
    setCondRows: Dispatch<SetStateAction<ValueCondition[]>>;
    condCombine: 'and' | 'or';
    setCondCombine: (c: 'and' | 'or') => void;
    periodOn: boolean;
    setPeriodOn: (b: boolean) => void;
    periodWindow: PeriodWindow;
    setPeriodWindow: (w: PeriodWindow) => void;
    periodDateRef: string;
    setPeriodDateRef: (v: string) => void;
    w3: Wave3State;
    patchW3: (p: Partial<Wave3State>) => void;
}) {
    const style = linkedStyle ?? 'compose';

    return (
        <div className="space-y-4">
            <div className="inline-flex rounded-lg border border-border p-0.5">
                <button
                    onClick={() => chooseLinkedStyle('compose')}
                    className={cn(
                        'rounded-md px-3 py-1 text-[12px] font-medium transition-colors',
                        style === 'compose'
                            ? 'bg-brand text-brand-foreground'
                            : 'text-muted-foreground hover:bg-accent',
                    )}
                >
                    Composer A • B
                </button>
                <button
                    onClick={() => chooseLinkedStyle('related')}
                    className={cn(
                        'rounded-md px-3 py-1 text-[12px] font-medium transition-colors',
                        style === 'related'
                            ? 'bg-brand text-brand-foreground'
                            : 'text-muted-foreground hover:bg-accent',
                    )}
                >
                    Valeurs liées
                </button>
            </div>

            {style === 'compose' && (
                <>
                    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
                        <OperandEditor
                            label="A"
                            tables={tables}
                            measures={measures}
                            value={opA}
                            onChange={setOpA}
                            onCreateSimple={onCreateSimple}
                        />
                        <div className="flex items-center justify-center">
                            <div className="flex flex-col gap-1.5">
                                {COMPOSE_OPS.map((o) => (
                                    <button
                                        key={o.key}
                                        onClick={() => setComposeOp(o.key)}
                                        className={cn(
                                            'flex size-9 items-center justify-center rounded border text-[14px] transition-colors',
                                            composeOp === o.key
                                                ? 'border-brand bg-brand/15 text-brand'
                                                : 'border-border hover:bg-accent',
                                        )}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <OperandEditor
                            label="B"
                            tables={tables}
                            measures={measures}
                            value={opB}
                            onChange={setOpB}
                            onCreateSimple={onCreateSimple}
                        />
                    </div>

                    {opA.kind === 'column' &&
                        opB.kind === 'column' &&
                        opA.table &&
                        opB.table &&
                        opA.table !== opB.table && (
                            <PathStep
                                tables={tables}
                                proposals={proposals}
                                paths={paths}
                                activeVariant={activeVariant}
                                setActiveVariant={setActiveVariant}
                                rankBy={rankBy}
                                setRankBy={setRankBy}
                                hops={hops}
                                setHops={setHops}
                                hasWeakHop={hasWeakHop}
                                allowWeak={allowWeak}
                                setAllowWeak={setAllowWeak}
                                collapsible
                            />
                        )}

                    <div className="rounded-lg border border-border p-3">
                        <label className="flex items-center gap-2 text-[12px]">
                            <input
                                type="checkbox"
                                checked={scaleHundreds}
                                onChange={(e) =>
                                    setScaleHundreds(e.target.checked)
                                }
                                className="accent-brand"
                            />
                            Résultat en pourcentage (multiplié par 100)
                        </label>
                    </div>

                    {composeOp === '/' && (
                        <div className="rounded-lg border border-border p-3">
                            <div className="mb-1.5 text-[12px] font-semibold">
                                Si le dénominateur est 0
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {DIV_ZERO_OPTIONS.map((o) => (
                                    <button
                                        key={o.key}
                                        onClick={() => setDivZero(o.key)}
                                        className={cn(
                                            'rounded border px-2 py-1 text-[11px] transition-colors',
                                            divZero === o.key
                                                ? 'border-brand bg-brand/15 text-brand'
                                                : 'border-border hover:bg-accent',
                                        )}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                                {DIV_ZERO_DAX[divZero]}
                            </div>
                        </div>
                    )}

                    <ConditionCard
                        condOn={condOn}
                        setCondOn={setCondOn}
                        condRows={condRows}
                        setCondRows={setCondRows}
                        condCombine={condCombine}
                        setCondCombine={setCondCombine}
                        tables={tables}
                        from={
                            opA.kind === 'column' && opA.table
                                ? opA.table
                                : toDef?.name ?? ''
                        }
                        to={toDef?.name ?? ''}
                    />

                    <PeriodCard
                        periodOn={periodOn}
                        setPeriodOn={setPeriodOn}
                        periodWindow={periodWindow}
                        setPeriodWindow={setPeriodWindow}
                        periodDateRef={periodDateRef}
                        setPeriodDateRef={setPeriodDateRef}
                        tables={tables}
                    />

                    <Wave3Options
                        toColumns={toColumns}
                        column={column}
                        kind="number"
                        compose
                        w3={w3}
                        patch={patchW3}
                    />

                    <div className="rounded-lg border border-border p-3">
                        <div className="mb-1 text-[11px] font-semibold">DAX</div>
                        <pre className="overflow-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                            {dax}
                        </pre>
                    </div>

                    <div className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-2">
                        <div className="text-[12px] font-semibold text-brand">
                            Résultat en direct
                        </div>
                        {value !== null && !error ? (
                            <div className="mt-1 font-mono text-[16px] font-bold">
                                {value}
                            </div>
                        ) : (
                            <div className="mt-1 text-[12px] text-muted-foreground">
                                {error ? (
                                    <>
                                        Impossible de calculer :{' '}
                                        <span className="font-mono text-[11px] text-red-600">
                                            {error}
                                        </span>
                                    </>
                                ) : (
                                    'Complétez les deux opérandes pour voir le résultat.'
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {style === 'related' && (
                <>
                    <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-[12px] leading-relaxed">
                        <span className="font-semibold text-brand">
                            Valeurs liées
                        </span>{' '}
                        — choisissez la <b>table de départ</b> (A) et la{' '}
                        <b>table d'arrivée</b> (B) à relier, puis le chemin de
                        relation ci-dessous. La mesure se lira sur la table
                        d'arrivée.
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <OperandEditor
                            label="Table de départ"
                            tables={tables}
                            measures={measures}
                            value={opA}
                            onChange={setOpA}
                            onCreateSimple={onCreateSimple}
                            tableOnly
                        />
                        <OperandEditor
                            label="Table d'arrivée"
                            tables={tables}
                            measures={measures}
                            value={opB}
                            onChange={setOpB}
                            onCreateSimple={onCreateSimple}
                            tableOnly
                        />
                    </div>
                    {opA.table !== '' &&
                        opB.table !== '' &&
                        opA.table === opB.table && (
                            <div className="rounded border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-700">
                                Les deux tables sont identiques — choisissez
                                deux tables différentes à relier.
                            </div>
                        )}

                    <PathStep
                        tables={tables}
                        proposals={proposals}
                        paths={paths}
                        activeVariant={activeVariant}
                        setActiveVariant={setActiveVariant}
                        rankBy={rankBy}
                        setRankBy={setRankBy}
                        hops={hops}
                        setHops={setHops}
                        hasWeakHop={hasWeakHop}
                        allowWeak={allowWeak}
                        setAllowWeak={setAllowWeak}
                        collapsible
                    />

                    <ResultAxisSelect
                        toDef={toDef}
                        columns={toColumns}
                        kind={kind}
                        setKind={setKind}
                        agg={agg}
                        setAgg={setAgg}
                        column={column}
                        setColumn={setColumn}
                    />

                    <Wave3Options
                        toColumns={toColumns}
                        column={column}
                        kind={kind}
                        w3={w3}
                        patch={patchW3}
                    />

                    <div>
                        <div className="mb-1.5 text-[12px] font-semibold">
                            Formule générée
                        </div>
                        <pre className="overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                            {dax}
                        </pre>
                    </div>

                    <div className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-2">
                        <div className="text-[12px] font-semibold text-brand">
                            Résultat en direct
                        </div>
                        {value !== null && !error ? (
                            <div className="mt-1 font-mono text-[16px] font-bold">
                                {value}
                            </div>
                        ) : (
                            <div className="mt-1 text-[12px] text-muted-foreground">
                                {error ? (
                                    <>
                                        Impossible de calculer :{' '}
                                        <span className="font-mono text-[11px] text-red-600">
                                            {error}
                                        </span>
                                    </>
                                ) : (
                                    'Choisissez une liaison vérifiée entre A et B pour voir le résultat.'
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/* ──────────────────────── Step: Enregistrer ─────────────────────────── */

function SaveStep({
    name,
    setName,
    dax,
    preview,
    error,
}: {
    name: string;
    setName: (n: string) => void;
    dax: string;
    preview: number | string[] | null;
    error: string | null;
}) {
    return (
        <div className="space-y-3">
            <label className="block text-[12px] font-semibold">
                Nom de la mesure
                <input
                    value={name}
                    autoFocus
                    onChange={(e) => setName(e.target.value)}
                    placeholder="p. ex. Style Codes"
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground/50 focus:border-brand"
                />
            </label>
            <div>
                <div className="mb-1.5 text-[12px] font-semibold">DAX</div>
                <pre className="overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
                    <code>{dax}</code>
                </pre>
            </div>
            <div className="rounded-lg border border-brand/30 bg-brand/5 p-3">
                <div className="mb-1 text-[11px] font-semibold text-brand">
                    Aperçu en direct
                </div>
                <div className="font-mono text-[14px]">
                    {Array.isArray(preview) ? (
                        preview.length ? (
                            <span className="flex flex-wrap gap-1">
                                {preview.slice(0, 12).map((v) => (
                                    <span
                                        key={v}
                                        className="rounded bg-background px-2 py-0.5 text-[12px]"
                                    >
                                        {v}
                                    </span>
                                ))}
                                {preview.length > 12 &&
                                    `… (+${preview.length - 12})`}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">
                                Aucune valeur
                            </span>
                        )
                    ) : preview === null ? (
                        <span className="text-muted-foreground">
                            {error
                                ? `Impossible de calculer : ${error}`
                                : 'Choisissez une mesure valide'}
                        </span>
                    ) : (
                        String(preview)
                    )}
                </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
                La mesure sera partagée dans la bibliothèque de mesures et
                restera valide même sans relation enregistrée.
            </p>
        </div>
    );
}

/* ─────────────────────── Variante générée ───────────────────────────── */

function VariantCard({
    index,
    hops,
    active,
    hasWeakHop,
    hasData,
    onClick,
}: {
    index: number;
    hops: PathHop[];
    active: boolean;
    hasWeakHop: boolean;
    hasData: boolean;
    onClick: () => void;
}) {
    const nodes = hops.length ? [hops[0]!.from, ...hops.map((h) => h.to)] : [];
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition-colors',
                active
                    ? 'border-brand bg-brand/10'
                    : 'border-border hover:bg-accent',
            )}
        >
            <span
                className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold',
                    active
                        ? 'bg-brand text-brand-foreground'
                        : 'bg-foreground/10',
                )}
            >
                {index + 1}
            </span>
            {nodes.length === 0 ? (
                <span className="text-muted-foreground">(vide)</span>
            ) : (
                <span className="flex min-w-0 items-center gap-1 font-mono text-[11px]">
                    {nodes.map((n, i) => (
                        <span
                            key={`${n}-${i}`}
                            className="flex items-center gap-1"
                        >
                            {i > 0 && (
                                <ArrowRight className="size-3 text-muted-foreground" />
                            )}
                            <span
                                className={cn(
                                    'rounded px-1.5 py-0.5',
                                    i === 0
                                        ? 'text-muted-foreground'
                                        : hasWeakHop &&
                                            !isReliableHop(hops[i - 1]!)
                                          ? 'bg-red-50 text-red-700'
                                          : 'bg-brand/10 text-brand',
                                )}
                            >
                                {n}
                            </span>
                        </span>
                    ))}
                </span>
            )}
            <span
                className={cn(
                    'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    hasData
                        ? hasWeakHop
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-600'
                        : hasWeakHop
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-700',
                )}
            >
                {hasData
                    ? hasWeakHop
                        ? 'produit des données'
                        : 'données ✓'
                    : '0 résultat'}
            </span>
        </button>
    );
}

/* ─────────────────────── Visuel du chemin ───────────────────────────── */

function PathVisualizer({
    hops,
    firstFail,
}: {
    hops: PathHop[];
    firstFail: number;
}) {
    if (hops.length === 0) return null;
    const nodes = [hops[0]!.from, ...hops.map((h) => h.to)];
    const contiguous = hops.every(
        (h, i) => i === 0 || h.from === hops[i - 1]!.to,
    );
    return (
        <div className="flex flex-wrap items-center gap-2">
            {nodes.map((n, i) => (
                <motion.div
                    key={`${n}-${i}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2"
                >
                    {i > 0 && (
                        <div
                            className={cn(
                                'flex flex-col items-center text-[10px]',
                                i - 1 === firstFail
                                    ? 'text-red-700'
                                    : isReliableHop(hops[i - 1]!)
                                      ? 'text-muted-foreground'
                                      : 'text-amber-600',
                            )}
                        >
                            <ArrowRight
                                className={cn(
                                    'size-4',
                                    i - 1 === firstFail
                                        ? 'text-red-600'
                                        : isReliableHop(hops[i - 1]!)
                                          ? 'text-brand'
                                          : 'text-amber-500',
                                )}
                            />
                            <span className="font-mono">
                                {hops[i - 1]!.fromCol}↔{hops[i - 1]!.toCol}
                            </span>
                        </div>
                    )}
                    <span
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-[12px] font-medium',
                            i - 1 === firstFail
                                ? 'border-red-400 bg-red-50 text-red-700'
                                : i > 0 && !isReliableHop(hops[i - 1]!)
                                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                                  : 'border-brand/40 bg-brand/10',
                        )}
                    >
                        {n}
                    </span>
                </motion.div>
            ))}
            {contiguous && firstFail >= 0 && (
                <span className="w-full text-[11px] font-semibold text-red-600">
                    ⚠️ L'arrêt {firstFail + 1} ne renvoie aucune ligne : la
                    mesure produira 0 / vide ici.
                </span>
            )}
            {!contiguous && (
                <span className="text-[11px] font-semibold text-red-600">
                    (chaîne interrompue : les tables ne se suivent pas)
                </span>
            )}
        </div>
    );
}

/* ─────────────────────── Builder de liaison ─────────────────────────── */

function JoinBuilder({
    tables,
    onPick,
}: {
    tables: TableDef[];
    onPick: (from: string, to: string, fromCol: string, toCol: string) => void;
}) {
    const [a, setA] = useState('');
    const [b, setB] = useState('');
    const [cands, setCands] = useState<JoinCandidate[]>([]);

    const evaluate = (ta: string, tb: string) => {
        const defA = tables.find((t) => t.name === ta);
        const defB = tables.find((t) => t.name === tb);
        if (!defA || !defB) {
            setCands([]);
            return;
        }
        setCands(joinCandidates(defA, defB));
    };

    return (
        <div className="rounded-lg border border-dashed border-brand/40 bg-brand/5 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-brand">
                <GitMerge className="size-3.5" />
                Ajouter une liaison
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
                <select
                    value={a}
                    onChange={(e) => {
                        const na = e.target.value;
                        setA(na);
                        if (b && na) evaluate(na, b);
                    }}
                    className="rounded border border-border bg-background px-2 py-1 text-[11px]"
                >
                    <option value="">Table A</option>
                    {tables.map((t) => (
                        <option key={t.name} value={t.name}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <span className="text-muted-foreground">↔</span>
                <select
                    value={b}
                    onChange={(e) => {
                        const nb = e.target.value;
                        setB(nb);
                        if (a && nb) evaluate(a, nb);
                    }}
                    className="rounded border border-border bg-background px-2 py-1 text-[11px]"
                >
                    <option value="">Table B</option>
                    {tables.map((t) => (
                        <option key={t.name} value={t.name}>
                            {t.name}
                        </option>
                    ))}
                </select>
            </div>
            {cands.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {cands.map((c) => (
                        <button
                            key={`${c.aCol}-${c.bCol}`}
                            onClick={() => onPick(c.a, c.b, c.aCol, c.bCol)}
                            className="flex flex-wrap items-center rounded border border-brand/40 bg-card px-2 py-1 font-mono text-[11px] transition-colors hover:bg-brand/10"
                        >
                            {c.aCol} ↔ {c.bCol}
                            <span className="ml-1 text-muted-foreground">
                                {Math.round(c.confidence * 100)}%
                            </span>
                            <HopBadge c={c} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}