import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    BRACKET_MATCH_CLASS,
    applySuggestion,
    bracketMatch,
    completeDax,
    daxCharClasses,
    daxSignature,
    type DaxSignature,
    type DaxSuggestion,
} from '@/lib/pbi/dax';
import { deriveMeasureSpec } from '@/lib/pbi/measureWizard';
import {
    validateMeasureExpression,
    type Field,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { Modal } from './modal';

const KIND_LABEL: Record<DaxSuggestion['kind'], string> = {
    function: 'fx',
    table: '▦',
    column: 'abc',
    measure: 'Σ',
};

function FormulaOverlay({
    expr,
    cursor,
    preRef,
}: {
    expr: string;
    cursor: number;
    preRef: React.RefObject<HTMLPreElement | null>;
}) {
    const chars = useMemo(() => {
        const classes = daxCharClasses(expr);
        const match = bracketMatch(expr, cursor);
        if (match) {
            for (const idx of [match.open, match.close])
                classes[idx] =
                    `${classes[idx] ?? ''} ${BRACKET_MATCH_CLASS}`.trim();
        }
        return classes;
    }, [expr, cursor]);

    const spans: { text: string; className: string }[] = [];
    for (let i = 0; i < expr.length; i += 1) {
        const last = spans[spans.length - 1];
        const cls = chars[i] ?? '';
        if (last && last.className === cls) last.text += expr[i]!;
        else spans.push({ text: expr[i]!, className: cls });
    }

    return (
        <pre
            ref={preRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden border border-transparent p-2 font-mono text-[12px] leading-[1.4] break-words whitespace-pre-wrap"
        >
            {spans.map((s, i) => (
                <span key={i} className={s.className || undefined}>
                    {s.text}
                </span>
            ))}
            {expr.endsWith('\n') && <span>{'\u200b'}</span>}
        </pre>
    );
}

/* Excel-style function-arguments hint, e.g. IF(logical, then, else). */
function SignatureHint({ signature }: { signature: DaxSignature }) {
    const parts: { text: string; active: boolean }[] = [];
    const re = /<([^>]+)>/g;
    let last = 0;
    let i = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(signature.signature)) !== null) {
        if (m.index > last)
            parts.push({
                text: signature.signature.slice(last, m.index),
                active: false,
            });
        parts.push({ text: m[1]!, active: i === signature.activeArg });
        last = re.lastIndex;
        i += 1;
    }
    if (last < signature.signature.length)
        parts.push({ text: signature.signature.slice(last), active: false });

    return (
        <div className="absolute right-0 bottom-full left-0 z-10 mb-1 overflow-hidden rounded border border-border bg-panel px-2 py-1 shadow-lg">
            <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="shrink-0 rounded bg-brand/15 px-1.5 py-0.5 font-semibold text-brand">
                    {signature.name}
                </span>
                <span className="truncate">
                    {parts.map((part, idx) => (
                        <span
                            key={idx}
                            className={
                                part.active
                                    ? 'font-bold text-brand underline decoration-brand/60'
                                    : ''
                            }
                        >
                            {part.text}
                        </span>
                    ))}
                </span>
            </div>
        </div>
    );
}

export function DaxDialog({
    onClose,
    edit,
    createCategory,
}: {
    onClose: () => void;
    edit?: Field | null;
    createCategory?: string | null;
}) {
    const { tables, addMeasure, updateMeasure, state } = usePbi();
    const taRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const editing = !!edit;
    const [expr, setExpr] = useState(() => {
        if (edit?.expression) {
            const formula = edit.expression.replace(/^\s*[^=]+=\s*/, '');
            return `${edit.name} = ${formula}`;
        }
        return 'Nouvelle mesure = ';
    });
    const [cursor, setCursor] = useState(() => {
        if (edit?.expression) {
            const formula = edit.expression.replace(/^\s*[^=]+=\s*/, '');
            return `${edit.name} = ${formula}`.length;
        }
        return 'Nouvelle mesure = '.length;
    });
    const [category, setCategory] = useState(
        edit?.category ?? createCategory ?? '',
    );
    const [description, setDescription] = useState(edit?.description ?? '');
    const [active, setActive] = useState(0);
    const [visible, setVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => {
            taRef.current?.focus();
            taRef.current?.setSelectionRange(cursor, cursor);
        });
        // Focus once on mount; the parent remounts this dialog on each open.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the highlight layer scrolled in lockstep with the textarea.
    useEffect(() => {
        if (!taRef.current || !preRef.current) return;
        preRef.current.scrollTop = taRef.current.scrollTop;
        preRef.current.scrollLeft = taRef.current.scrollLeft;
    });

    const onFormulaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (!preRef.current) return;
        preRef.current.scrollTop = e.currentTarget.scrollTop;
        preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    };

    const measures = useMemo(
        () => state.measures ?? [],
        [state.measures],
    );

    const completion = useMemo(
        () => completeDax(expr, cursor, tables, measures),
        [expr, cursor, tables, measures],
    );

    const signature = useMemo(() => daxSignature(expr, cursor), [expr, cursor]);

    const suggestions = completion.suggestions;
    const show = visible && suggestions.length > 0;
    const index = Math.max(0, Math.min(active, suggestions.length - 1));

    const groups = useMemo(() => {
        const fn = suggestions.filter((s) => s.kind === 'function');
        const tb = suggestions.filter((s) => s.kind === 'table');
        const rest = suggestions.filter(
            (s) => s.kind === 'column' || s.kind === 'measure',
        );
        const cols: { title: string; items: DaxSuggestion[] }[] = [];
        if (fn.length) cols.push({ title: 'Fonctions', items: fn });
        if (tb.length) cols.push({ title: 'Jeux de données', items: tb });
        if (rest.length)
            cols.push({ title: 'Colonnes et mesures', items: rest });
        return cols;
    }, [suggestions]);

    const flatIndex = useMemo(() => {
        const map = new Map<DaxSuggestion, number>();
        suggestions.forEach((s, i) => map.set(s, i));
        return map;
    }, [suggestions]);

    const apply = (s: DaxSuggestion) => {
        const { text: next, cursor: nextCursor } = applySuggestion(
            expr,
            cursor,
            completion.from,
            s.insert,
            s.cursorAdjust ?? 0,
        );
        setExpr(next);
        setCursor(nextCursor);
        setActive(0);
        requestAnimationFrame(() => {
            taRef.current?.focus();
            taRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!show) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => (a + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            apply(suggestions[index]!);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setVisible(false);
        }
    };

    const validation = useMemo(() => {
        const eq = expr.indexOf('=');
        const name = (eq >= 0 ? expr.slice(0, eq) : expr).trim();
        const formula = (eq >= 0 ? expr.slice(eq + 1) : expr).trim();
        if (!name) return 'Saisissez un nom de mesure avant le signe =';
        if (!formula) return 'Saisissez une formule DAX après le signe =';
        if (eq < 0) return 'Ajoutez un signe = après le nom de la mesure';
        const columns = tables.flatMap((t) => t.fields.map((f) => f.name));
        const result = validateMeasureExpression(
            expr,
            columns,
            measures.map((m) => m.name),
        );
        return result.ok ? null : result.error;
    }, [expr, tables, measures]);

    // W1-17: `%` in DAX is the modulo operator, never a percentage — surface it.
    const moduloWarning = useMemo(() => {
        const eq = expr.indexOf('=');
        const formula = (eq >= 0 ? expr.slice(eq + 1) : expr);
        return /%/.test(formula)
            ? '« % » en DAX est l’opérateur modulo (reste de division), pas un pourcentage. Pour un ratio utilisez DIVIDE(…) × 100.'
            : null;
    }, [expr]);

    const commit = async () => {
        if (saving) return;
        const eq = expr.indexOf('=');
        const name = (eq >= 0 ? expr.slice(0, eq) : expr).trim();
        const formula = (eq >= 0 ? expr.slice(eq + 1) : expr).trim();
        if (!name) {
            toast.error('Saisissez un nom de mesure avant le signe =');
            return;
        }
        if (!formula) {
            toast.error('Saisissez une formule DAX après le signe =');
            return;
        }
        if (
            measures.some(
                (m) =>
                    m.name === name &&
                    (edit == null || String(m.id) !== String(edit.id)),
            )
        ) {
            toast.error(`La mesure « ${name} » existe déjà`);
            return;
        }
        if (validation) {
            toast.error(validation);
            return;
        }
        setSaving(true);
        try {
            const full = `${name} = ${formula}`;
            const spec = deriveMeasureSpec(formula);
            const config = spec ? JSON.stringify(spec) : undefined;
            if (edit) {
                await updateMeasure(
                    edit.id!,
                    name,
                    full,
                    category,
                    description,
                    config,
                );
                toast.success('Mesure mise à jour', {
                    description: `${name} = ${formula}`,
                });
            } else {
                await addMeasure(name, full, category, description, config);
                toast.success('Mesure créée', {
                    description: `${name} = ${formula}`,
                });
            }
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

    return (
        <Modal
            open
            onClose={onClose}
            title={editing ? 'Modifier la mesure' : 'Nouvelle mesure'}
            wide
        >
            <div className="space-y-3 p-4">
                {!editing && (
                    <div className="flex flex-wrap gap-1 text-[11px]">
                        <span className="py-0.5 text-muted-foreground">
                            Démarrage rapide :
                        </span>
                        {[
                            'SUM(',
                            'AVERAGE(',
                            'COUNTROWS(',
                            'DISTINCTCOUNT(',
                            'IF(',
                        ].map((snippet) => (
                            <button
                                key={snippet}
                                onClick={() => {
                                    setExpr(`Nouvelle mesure = ${snippet}`);
                                    setCursor(
                                        `Nouvelle mesure = ${snippet}`.length -
                                            1,
                                    );
                                    setVisible(true);
                                    requestAnimationFrame(() => {
                                        taRef.current?.focus();
                                        taRef.current?.setSelectionRange(
                                            `Nouvelle mesure = ${snippet}`
                                                .length - 1,
                                            `Nouvelle mesure = ${snippet}`
                                                .length - 1,
                                        );
                                    });
                                }}
                                className="rounded-full border border-border px-2 py-0.5 font-mono hover:bg-accent"
                            >
                                {snippet}
                            </button>
                        ))}
                    </div>
                )}
                <div className="relative">
                    {signature && <SignatureHint signature={signature} />}
                    <FormulaOverlay
                        expr={expr}
                        cursor={cursor}
                        preRef={preRef}
                    />
                    <textarea
                        ref={taRef}
                        value={expr}
                        onChange={(e) => {
                            setExpr(e.target.value);
                            setCursor(
                                e.target.selectionStart ??
                                    e.target.value.length,
                            );
                            setVisible(true);
                        }}
                        onKeyDown={onKeyDown}
                        onKeyUp={(e) =>
                            setCursor(
                                e.currentTarget.selectionStart ??
                                    e.currentTarget.value.length,
                            )
                        }
                        onSelect={(e) =>
                            setCursor(
                                e.currentTarget.selectionStart ??
                                    e.currentTarget.value.length,
                            )
                        }
                        onScroll={onFormulaScroll}
                        onBlur={() => setVisible(false)}
                        onFocus={() => setVisible(true)}
                        spellCheck={false}
                        className="h-28 w-full resize-none rounded border border-border bg-background p-2 font-mono text-[12px] leading-[1.4] text-transparent caret-foreground selection:bg-brand/40"
                    />
                    {validation && (
                        <div className="mt-1 text-[11px] text-red-500">
                            {validation}
                        </div>
                    )}
                    {!validation && moduloWarning && (
                        <div className="mt-1 rounded border border-amber-300/60 bg-amber-300/10 px-2 py-1 text-[11px] text-amber-700">
                            {moduloWarning}
                        </div>
                    )}
                    {show && (
                        <div className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded border border-border bg-card shadow-xl">
                            <div className="flex">
                                {groups.map((g) => (
                                    <div
                                        key={g.title}
                                        className="min-w-0 flex-1 border-r border-border last:border-r-0"
                                    >
                                        <div className="border-b border-border bg-muted px-2 py-1 text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            {g.title}
                                        </div>
                                        <div className="max-h-56 overflow-auto py-0.5">
                                            {g.items.map((s) => (
                                                <button
                                                    key={`${s.kind}-${s.insert}`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        apply(s);
                                                    }}
                                                    onMouseEnter={() =>
                                                        setActive(
                                                            flatIndex.get(s) ??
                                                                0,
                                                        )
                                                    }
                                                    className={cn(
                                                        'flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] hover:bg-accent',
                                                        flatIndex.get(s) ===
                                                            index &&
                                                            'bg-accent',
                                                    )}
                                                >
                                                    <span className="w-6 shrink-0 text-center font-mono text-muted-foreground">
                                                        {KIND_LABEL[s.kind]}
                                                    </span>
                                                    <span className="shrink-0 font-mono font-medium">
                                                        {s.label}
                                                    </span>
                                                    <span className="ml-auto shrink-0 truncate text-muted-foreground">
                                                        {s.detail}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <label className="block text-[11px] text-muted-foreground">
                        Dossier (catégorie)
                        <input
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Finance, Opérations…"
                            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-brand"
                        />
                    </label>
                    <label className="block text-[11px] text-muted-foreground">
                        Description
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Facultatif"
                            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-brand"
                        />
                    </label>
                </div>
                <div className="text-[11px] text-muted-foreground">
                    Mesures existantes :
                    <ul className="mt-1 max-h-24 space-y-0.5 overflow-auto font-mono">
                        {measures.map((m) => (
                            <li key={m.name}>{m.expression}</li>
                        ))}
                    </ul>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded border border-border px-3 py-1 text-[12px]"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={commit}
                        disabled={saving}
                        className="rounded bg-brand px-3 py-1 text-[12px] font-medium text-brand-foreground disabled:opacity-50"
                    >
                        {editing ? 'Enregistrer les modifications' : 'Valider'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}