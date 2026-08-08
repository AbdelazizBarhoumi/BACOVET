import { motion } from 'framer-motion';
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    GitMerge,
    Save,
    Sparkles,
    Table2,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
    AGG_LABELS,
    COND_LABELS,
    KIND_LABELS,
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
    type JoinCandidate,
    type MeasureKind,
    type NumericAgg,
    type PathHop,
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

type StepKey = 'start' | 'path' | 'result' | 'composition' | 'save';

const STEP_LABELS: Record<StepKey, string> = {
    start: 'Départ',
    path: 'Chemin',
    result: 'Résultat',
    composition: 'Composition',
    save: 'Enregistrer',
};

/** Step order without composition (result → save directly). */
const SIMPLE_STEPS: StepKey[] = ['start', 'path', 'result', 'save'];
/**
 * Step order when composing A • B. Composition is an entry mode chosen on the
 * Départ step: no endpoints are required, so Chemin and Résultat are skipped.
 */
const COMPOSE_STEPS: StepKey[] = ['start', 'composition', 'save'];

const COMPOSE_OPS: { key: CompositeSpec['op']; label: string }[] = [
    { key: '/', label: '÷' },
    { key: '*', label: '×' },
    { key: '-', label: '−' },
    { key: '+', label: '+' },
];

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
    /** existing measure reference when kind === 'measure' */
    measure: string;
    /** source table when kind === 'column' */
    table: string;
    column: string;
    agg: NumericAgg;
    /** literal when kind === 'number' */
    value: string;
};

const OP_KEYS = Object.keys(COND_LABELS) as ValueCondition['op'][];
const AGG_KEYS = Object.keys(AGG_LABELS) as NumericAgg[];
const EMPTY_HOPS: PathHop[] = [];

export function MeasureWizardDialog({
    onClose,
    createCategory,
}: {
    onClose: () => void;
    createCategory?: string | null;
}) {
    const { tables, addMeasure, sharedJoins, measures } = usePbi();
    const [step, setStep] = useState<StepKey>('start');

    const [fromTable, setFromTable] = useState(tables[0]?.name ?? '');
    const [toTable, setToTable] = useState('');
    const [paths, setPaths] = useState<PathHop[][]>([]);
    const [activeVariant, setActiveVariant] = useState(0);
    const [kind, setKind] = useState<MeasureKind>('number');
    const [agg, setAgg] = useState<NumericAgg>('sum');
    const [column, setColumn] = useState('');
    const [condOn, setCondOn] = useState(false);
    const [condCol, setCondCol] = useState('');
    const [condOp, setCondOp] = useState<ValueCondition['op']>('gt');
    const [condVal, setCondVal] = useState('');
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [allowWeak, setAllowWeak] = useState(false);
    const [rankBy, setRankBy] = useState<ProposalRankBy>('shortest');

    // Composition (A • B) — chosen as an entry mode on the Départ step. When
    // on, the flow becomes Départ → Composition → Enregistrer (no endpoints).
    const [composeOn, setComposeOn] = useState(false);
    const [composeOp, setComposeOp] = useState<CompositeSpec['op']>('/');
    const [scaleHundreds, setScaleHundreds] = useState(true);
    const [opA, setOpA] = useState<OperandDraft>(() => ({
        kind: 'column',
        measure: '',
        table: fromTable,
        column: firstFieldOf(tables, fromTable),
        agg: 'sum',
        value: '',
    }));
    const [opB, setOpB] = useState<OperandDraft>(() => ({
        kind: 'column',
        measure: '',
        table: toTable || fromTable,
        column: firstFieldOf(tables, toTable || fromTable),
        agg: 'sum',
        value: '',
    }));

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

    const steps = composeOn ? COMPOSE_STEPS : SIMPLE_STEPS;
    const stepIndex = steps.findIndex((s) => s === step);

    // --- Composition operands -------------------------------------------------
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
    const composeReady = composeA !== null && composeB !== null;

    const toggleCompose = (on: boolean) => {
        setComposeOn(on);
        // The step lists differ by mode, so never leave the user on a step
        // that no longer exists: switching on jumps to the composition step,
        // switching off drops back to Départ.
        if (on && step !== 'composition') setStep('composition');
        if (!on && step === 'composition') setStep('start');
        if (on) {
            setOpA((d) =>
                d.kind === 'column' && d.table && d.column
                    ? d
                    : {
                          ...d,
                          kind: 'column',
                          table: fromTable,
                          column: firstFieldOf(tables, fromTable),
                      },
            );
            setOpB((d) =>
                d.kind === 'column' && d.table && d.column
                    ? d
                    : {
                          ...d,
                          kind: 'column',
                          table: toTable || fromTable,
                          column: firstFieldOf(tables, toTable || fromTable),
                      },
            );
        }
    };

    const stepBack = () => {
        if (stepIndex === 0) onClose();
        else setStep(steps[stepIndex - 1] ?? 'start');
    };

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
        () => proposePaths(tables, fromTable, toTable, manual, 5, rankBy),
        [tables, fromTable, toTable, manual, rankBy],
    );

    const toDef = tables.find((t) => t.name === toTable);
    const toColumns = (toDef?.fields ?? []).map((f) => f.name);

    const selectTarget = (name: string) => {
        setToTable(name);
        const def = tables.find((t) => t.name === name);
        const num = def?.fields?.find((f) => f.type === 'number');
        setColumn(num?.name ?? def?.fields?.[0]?.name ?? '');
        setCondCol('');
    };

    const spec: WizardSpec = useMemo(() => {
        const base = {
            from: fromTable,
            to: toTable || fromTable,
            hops,
            kind,
            column,
            agg,
            condition:
                condOn && condCol
                    ? { column: condCol, op: condOp, value: condVal }
                    : undefined,
        };
        if (composeOn && composeA && composeB) {
            return {
                ...base,
                kind: 'number',
                composition: {
                    a: composeA,
                    b: composeB,
                    op: composeOp,
                    scale: scaleHundreds,
                },
            };
        }
        return base;
    }, [
        fromTable,
        toTable,
        hops,
        kind,
        column,
        agg,
        condOn,
        condCol,
        condOp,
        condVal,
        composeOn,
        composeA,
        composeB,
        composeOp,
        scaleHundreds,
    ]);

    const dax = useMemo(
        () =>
            name.trim()
                ? measureExpression(name.trim(), spec)
                : buildMeasureDax(spec),
        [name, spec],
    );

    const previewState = useMemo(() => {
        const none = {
            value: null as number | string[] | null,
            error: null as string | null,
        };
        // Composition does not depend on the base from → to chain, so its
        // gate is the operand validity alone.
        if (
            !composeOn &&
            (toTable === '' || (toTable !== fromTable && hops.length === 0))
        )
            return none;
        const expr = measureExpression(name.trim() || 'Aperçu', spec);
        if (composeOn) {
            if (!composeA || !composeB) return none;
            const r = evaluateMeasure(expr, []);
            return {
                value: typeof r.value === 'number' ? r.value : null,
                error: r.error ?? null,
            };
        }
        if (kind === 'number' || kind === 'countrows') {
            const r = evaluateMeasure(expr, []);
            return {
                value: typeof r.value === 'number' ? r.value : null,
                error: r.error ?? null,
            };
        }
        // list: evaluate the VALUES(...) through the engine so the preview is
        // truthful (empty here means the chain genuinely matches nothing).
        try {
            const compiled = compileListMeasure(expr);
            if (!compiled) return none;
            const values = compiled([], {});
            return { value: Array.isArray(values) ? values : [], error: null };
        } catch {
            return none;
        }
    }, [
        spec,
        kind,
        toTable,
        fromTable,
        hops.length,
        name,
        composeOn,
        composeA,
        composeB,
    ]);
    const preview = previewState.value;
    const previewError = previewState.error;

    const caseBlockedNeedsHop = toTable !== '' && toTable !== fromTable;
    // Chemin is only valid when the route is fully reliable OR the user has
    // explicitly accepted an unverified link.
    const pathGate =
        !caseBlockedNeedsHop || hops.length === 0 || pathReliable || allowWeak;
    const canProceed =
        (stepIndex === 0 &&
            (composeOn || (fromTable !== '' && toTable !== ''))) ||
        (stepIndex === 1 && (composeOn ? composeReady : pathGate)) ||
        (stepIndex === 2 && (composeOn ? name.trim() !== '' : column !== '')) ||
        (stepIndex === 3 && name.trim() !== '');

    const changeRankBy = (r: ProposalRankBy) => {
        // Recompute ordering for the new ranking, then reseed the editable
        // variants from it (avoids the memo lagging one render behind).
        const reordered = proposePaths(
            tables,
            fromTable,
            toTable,
            manual,
            5,
            r,
        );
        setRankBy(r);
        setPaths(reordered.map((p) => p.hops));
        setActiveVariant(0);
    };

    const goNext = async () => {
        if (step === 'start') {
            if (composeOn) {
                // Composition is an entry mode: no endpoints needed.
                setStep('composition');
                return;
            }
            setPaths(proposals.map((p) => p.hops));
            setActiveVariant(0);
            setStep('path');
            return;
        }
        if (step === 'path') {
            if (hasWeakHop && !allowWeak) {
                toast.error(
                    'Une liaison n’est pas vérifiée sur les valeurs. Validez-la ou cochez « Autoriser une liaison non vérifiée ».',
                );
                return;
            }
            setStep('result');
            return;
        }
        if (step === 'result') {
            setStep(composeOn ? 'composition' : 'save');
            return;
        }
        if (step === 'composition') {
            if (!composeA || !composeB) {
                toast.error(
                    'Définissez deux opérandes valides pour composer la mesure.',
                );
                return;
            }
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
                        {step === 'start' && (
                            <StartStep
                                tables={tables}
                                fromTable={fromTable}
                                setFromTable={setFromTable}
                                toTable={toTable}
                                selectTarget={selectTarget}
                                composeOn={composeOn}
                                toggleCompose={toggleCompose}
                            />
                        )}
                        {step === 'path' && (
                            <PathStep
                                tables={tables}
                                proposals={proposals}
                                paths={paths}
                                activeVariant={activeVariant}
                                setActiveVariant={setActiveVariant}
                                rankBy={rankBy}
                                setRankBy={changeRankBy}
                                hops={hops}
                                setHops={setHops}
                                hasWeakHop={hasWeakHop}
                                allowWeak={allowWeak}
                                setAllowWeak={setAllowWeak}
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
                                condCol={condCol}
                                setCondCol={setCondCol}
                                condOp={condOp}
                                setCondOp={setCondOp}
                                condVal={condVal}
                                setCondVal={setCondVal}
                                composeOn={composeOn}
                                toggleCompose={toggleCompose}
                            />
                        )}
                        {step === 'composition' && (
                            <CompositionStep
                                tables={tables}
                                measures={measures}
                                opA={opA}
                                setOpA={setOpA}
                                opB={opB}
                                setOpB={setOpB}
                                composeOp={composeOp}
                                setComposeOp={setComposeOp}
                                scaleHundreds={scaleHundreds}
                                setScaleHundreds={setScaleHundreds}
                                dax={dax}
                                value={
                                    typeof preview === 'number' ? preview : null
                                }
                                error={previewError}
                                composeReady={composeReady}
                                onCreateSimple={() => toggleCompose(false)}
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

/* ───────────────────────── Step: Départ ─────────────────────────────── */

function StartStep({
    tables,
    fromTable,
    setFromTable,
    toTable,
    selectTarget,
    composeOn,
    toggleCompose,
}: {
    tables: TableDef[];
    fromTable: string;
    setFromTable: (t: string) => void;
    toTable: string;
    selectTarget: (t: string) => void;
    composeOn: boolean;
    toggleCompose: (on: boolean) => void;
}) {
    return (
        <div className="grid gap-4">
            <div>
                <div className="mb-1.5 text-[12px] font-semibold">
                    Mode de calcul
                </div>
                <div className="flex flex-wrap gap-1">
                    <button
                        onClick={() => toggleCompose(false)}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-[12px] transition-colors',
                            !composeOn
                                ? 'border-brand bg-brand/15 font-medium'
                                : 'border-border hover:bg-accent',
                        )}
                    >
                        Une valeur simple
                    </button>
                    <button
                        onClick={() => toggleCompose(true)}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-[12px] transition-colors',
                            composeOn
                                ? 'border-brand bg-brand/15 font-medium'
                                : 'border-border hover:bg-accent',
                        )}
                    >
                        Composition A • B
                    </button>
                </div>
            </div>

            {composeOn ? (
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-[12px] leading-relaxed">
                    <span className="font-semibold text-brand">
                        Composition A • B
                    </span>{' '}
                    : aucune table n’est requise. Vous choisissez vos deux
                    opérandes (mesure, colonne agrégée ou nombre) à l’étape
                    suivante, puis l’opération et le format.
                </div>
            ) : (
                <>
                    <div>
                        <div className="mb-1.5 text-[12px] font-semibold">
                            Table de départ
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {tables.map((t) => (
                                <button
                                    key={t.name}
                                    onClick={() => setFromTable(t.name)}
                                    className={cn(
                                        'rounded-lg border px-3 py-1.5 text-[12px] transition-colors',
                                        fromTable === t.name
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
                    <div>
                        <div className="mb-1.5 text-[12px] font-semibold">
                            Table cible
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {tables.map((t) => (
                                <button
                                    key={t.name}
                                    disabled={t.name === fromTable}
                                    onClick={() => selectTarget(t.name)}
                                    className={cn(
                                        'rounded-lg border px-3 py-1.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                                        toTable === t.name
                                            ? 'border-brand bg-brand/15 font-medium'
                                            : 'border-border hover:bg-accent',
                                    )}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
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
}) {
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
                <div className="text-[12px] font-semibold">
                    Chemin de relation
                </div>
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
                        mesure produira 0 / vide tant que ce lien n’est pas
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
        </div>
    );
}

/* ───────────────────────── Step: Résultat ───────────────────────────── */

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
    condCol,
    setCondCol,
    condOp,
    setCondOp,
    condVal,
    setCondVal,
    composeOn,
    toggleCompose,
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
    condCol: string;
    setCondCol: (c: string) => void;
    condOp: ValueCondition['op'];
    setCondOp: (o: ValueCondition['op']) => void;
    condVal: string;
    setCondVal: (v: string) => void;
    composeOn: boolean;
    toggleCompose: (on: boolean) => void;
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

            <div>
                <div className="mb-1.5 text-[12px] font-semibold">
                    Mode de calcul
                </div>
                <div className="flex flex-wrap gap-1">
                    <button
                        onClick={() => toggleCompose(false)}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-[12px] transition-colors',
                            !composeOn
                                ? 'border-brand bg-brand/15 font-medium'
                                : 'border-border hover:bg-accent',
                        )}
                    >
                        Une valeur simple
                    </button>
                    <button
                        onClick={() => toggleCompose(true)}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-[12px] transition-colors',
                            composeOn
                                ? 'border-brand bg-brand/15 font-medium'
                                : 'border-border hover:bg-accent',
                        )}
                    >
                        Composition A • B
                    </button>
                </div>
            </div>

            {!composeOn ? (
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
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <select
                                    value={condCol}
                                    onChange={(e) => setCondCol(e.target.value)}
                                    className="rounded border border-border bg-background px-2 py-1 text-[11px]"
                                >
                                    <option value="">Colonne</option>
                                    {(toDef?.fields ?? []).map((f) => (
                                        <option key={f.name} value={f.name}>
                                            {f.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={condOp}
                                    onChange={(e) =>
                                        setCondOp(
                                            e.target
                                                .value as ValueCondition['op'],
                                        )
                                    }
                                    className="rounded border border-border bg-background px-2 py-1 text-[11px]"
                                >
                                    {OP_KEYS.map((op) => (
                                        <option key={op} value={op}>
                                            {COND_LABELS[op]}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    value={condVal}
                                    onChange={(e) => setCondVal(e.target.value)}
                                    placeholder="valeur"
                                    className="w-28 rounded border border-border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/50"
                                />
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-[12px] leading-relaxed">
                    <span className="font-semibold text-brand">
                        Composition A • B
                    </span>{' '}
                    : la mesure est construite à partir de deux opérandes (une
                    mesure existante, une colonne agrégée ou un nombre). Passez
                    à l’étape suivante pour choisir l’opération et régler le
                    format.
                </div>
            )}
        </div>
    );
}

/* ───────────────────────── Step: Composition ────────────────────────── */

function OperandEditor({
    label,
    tables,
    measures,
    value,
    onChange,
    onCreateSimple,
}: {
    label: string;
    tables: TableDef[];
    measures: Field[];
    value: OperandDraft;
    onChange: (d: OperandDraft) => void;
    onCreateSimple: () => void;
}) {
    const patch = (p: Partial<OperandDraft>) => onChange({ ...value, ...p });
    const operandFields = tables.find((t) => t.name === value.table)?.fields;
    return (
        <div className="rounded-lg border border-border bg-panel p-3">
            <div className="mb-2 text-[12px] font-semibold">
                Opérande {label}
            </div>
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
                            Aucune mesure existante. Créez d’abord une mesure
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
                    <select
                        value={value.column}
                        onChange={(e) => patch({ column: e.target.value })}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-[12px]"
                    >
                        <option value="">Colonne…</option>
                        {(operandFields ?? []).map((f) => (
                            <option key={f.name} value={f.name}>
                                {f.name}
                            </option>
                        ))}
                    </select>
                    <div className="flex flex-wrap gap-1">
                        {AGG_KEYS.map((a) => (
                            <button
                                key={a}
                                onClick={() => patch({ agg: a })}
                                className={cn(
                                    'rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                                    value.agg === a
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
        </div>
    );
}

function CompositionStep({
    tables,
    measures,
    opA,
    setOpA,
    opB,
    setOpB,
    composeOp,
    setComposeOp,
    scaleHundreds,
    setScaleHundreds,
    dax,
    value,
    composeReady,
    error,
    onCreateSimple,
}: {
    tables: TableDef[];
    measures: Field[];
    opA: OperandDraft;
    setOpA: (d: OperandDraft) => void;
    opB: OperandDraft;
    setOpB: (d: OperandDraft) => void;
    composeOp: CompositeSpec['op'];
    setComposeOp: (op: CompositeSpec['op']) => void;
    scaleHundreds: boolean;
    setScaleHundreds: (b: boolean) => void;
    dax: string;
    value: number | null;
    composeReady: boolean;
    error: string | null;
    onCreateSimple: () => void;
}) {
    const operandLabel = (d: OperandDraft): string => {
        switch (d.kind) {
            case 'measure':
                return d.measure ? `[${d.measure}]` : '—';
            case 'number':
                return d.value === '' ? '…' : d.value;
            case 'column':
                return d.table && d.column
                    ? `${AGG_LABELS[d.agg]}(${d.table}[${d.column}])`
                    : '—';
        }
    };
    return (
        <div className="space-y-4">
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

            <div className="rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-[12px]">
                    <input
                        type="checkbox"
                        checked={scaleHundreds}
                        onChange={(e) => setScaleHundreds(e.target.checked)}
                        className="accent-brand"
                    />
                    Résultat en pourcentage (multiplié par 100)
                </label>
            </div>

            <div className="rounded-lg border border-border bg-muted p-3">
                <div className="mb-1 text-[11px] font-semibold">Formule</div>
                <div className="font-mono text-[13px] leading-relaxed">
                    <span className="text-foreground">{operandLabel(opA)}</span>{' '}
                    <span className="font-bold text-brand">{composeOp}</span>{' '}
                    <span className="text-foreground">{operandLabel(opB)}</span>
                    {scaleHundreds && (
                        <span className="text-muted-foreground"> × 100</span>
                    )}
                </div>
            </div>

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
                {composeReady && value !== null && !error ? (
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
                        ) : composeReady ? (
                            'Aucune valeur calculable pour ces opérandes.'
                        ) : (
                            'Complétez les deux opérandes pour voir le résultat.'
                        )}
                    </div>
                )}
            </div>
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
                                : 'Choisissez un chemin valide'}
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
