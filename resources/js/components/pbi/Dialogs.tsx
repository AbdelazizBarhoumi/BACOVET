import {
    AlertTriangle,
    Folder,
    Pencil,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { MeasureWizardDialog } from '@/components/pbi/MeasureWizardDialog';
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
    MEASURES,
    formatNumber,
    measureError,
    validateMeasureExpression,
    type Field,
    type Row,
} from '@/lib/pbi/model';
import { mkVisual, usePbi, wf } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';

function Modal({
    open,
    onClose,
    title,
    wide,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    wide?: boolean;
    children: React.ReactNode;
}) {
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4">
            <div
                className={cn(
                    'flex max-h-[85vh] w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl',
                    wide ? 'max-w-5xl' : 'max-w-lg',
                )}
            >
                <div className="flex items-center justify-between border-b border-border bg-panel px-4 py-2">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        ×
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">{children}</div>
            </div>
        </div>,
        document.body,
    );
}

/* ------------------------ Power Query Editor ------------------------ */

type Step = { label: string };

export function PowerQueryDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { tables } = usePbi();
    const [tab, setTab] = useState('Accueil');
    const [table, setTable] = useState('');
    const [steps, setSteps] = useState<Step[]>([
        { label: 'Source' },
        { label: 'Navigation' },
        { label: 'Type modifié' },
    ]);
    const [hidden, setHidden] = useState<string[]>([]);
    const [sortCol, setSortCol] = useState<string | null>(null);

    const def = tables.find((t) => t.name === table) ?? tables[0];
    const columns = (def?.fields ?? [])
        .map((f) => f.name)
        .filter((c) => !hidden.includes(c));

    const rows: Row[] = (() => {
        if (!def) return [];
        const data = [...def.rows].slice(0, 400);
        if (sortCol)
            data.sort((a, b) =>
                String(a[sortCol]).localeCompare(String(b[sortCol])),
            );
        return data.slice(0, 200);
    })();

    const addStep = (label: string) => {
        setSteps((s) => [...s, { label }]);
        toast.success(`Étape appliquée : ${label}`);
    };

    const RIBBON: Record<string, { label: string; run: () => void }[]> = {
        Accueil: [
            {
                label: 'Actualiser l’aperçu',
                run: () => addStep('Aperçu actualisé'),
            },
            {
                label: 'Choisir les colonnes',
                run: () => addStep('Autres colonnes supprimées'),
            },
            {
                label: 'Supprimer les colonnes',
                run: () => {
                    const last = columns[columns.length - 1];
                    if (last) {
                        setHidden((h) => [...h, last]);
                        addStep(`Colonnes supprimées (${last})`);
                    }
                },
            },
            {
                label: 'Conserver les lignes',
                run: () => addStep('Premières lignes conservées'),
            },
            {
                label: 'Fusionner les requêtes',
                run: () => addStep('Requêtes fusionnées'),
            },
            {
                label: 'Ajouter des requêtes',
                run: () => addStep('Requête ajoutée'),
            },
        ],
        Transformer: [
            { label: 'Grouper par', run: () => addStep('Lignes groupées') },
            {
                label: 'Utiliser la 1re ligne comme en-têtes',
                run: () => addStep('En-têtes promus'),
            },
            { label: 'Transposer', run: () => addStep('Tableau transposé') },
            {
                label: 'Faire pivoter la colonne',
                run: () => addStep('Colonne pivotée'),
            },
            {
                label: 'Dépivoter les colonnes',
                run: () => addStep('Colonnes dépivotées'),
            },
            {
                label: 'Remplacer les valeurs',
                run: () => addStep('Valeur remplacée'),
            },
            {
                label: 'Fractionner la colonne',
                run: () => addStep('Colonne fractionnée par délimiteur'),
            },
        ],
        'Ajouter une colonne': [
            {
                label: 'Colonne personnalisée',
                run: () => addStep('Colonne personnalisée ajoutée'),
            },
            {
                label: 'Colonne conditionnelle',
                run: () => addStep('Colonne conditionnelle ajoutée'),
            },
            { label: 'Colonne d’index', run: () => addStep('Index ajouté') },
            {
                label: 'Dupliquer la colonne',
                run: () => addStep('Colonne dupliquée'),
            },
            { label: 'Extraire l’année', run: () => addStep('Année insérée') },
        ],
        Affichage: [
            {
                label: 'Barre de formule',
                run: () => toast.info('Barre de formule activée/désactivée'),
            },
            {
                label: 'Éditeur avancé',
                run: () =>
                    toast.info(
                        `let Source = ${def?.name ?? 'Requête'} in Source`,
                    ),
            },
            {
                label: 'Dépendances des requêtes',
                run: () =>
                    toast.info(
                        tables.map((t) => t.name).join(' → ') ||
                            'Aucune requête',
                    ),
            },
        ],
        Outils: [
            {
                label: 'Diagnostics de requête',
                run: () => toast.info('Session de diagnostics démarrée'),
            },
            { label: 'Options', run: () => toast.info('Options de requête') },
        ],
    };

    return (
        <Modal open={open} onClose={onClose} title="Éditeur Power Query" wide>
            <div className="flex flex-col">
                <div className="flex border-b border-border bg-panel px-2 text-[12px]">
                    {Object.keys(RIBBON).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                'px-3 py-1.5',
                                tab === t
                                    ? 'border-b-2 border-brand font-semibold'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1 border-b border-border bg-ribbon p-2">
                    {(RIBBON[tab] ?? []).map((b) => (
                        <button
                            key={b.label}
                            onClick={b.run}
                            className="rounded border border-border bg-card px-2 py-1 text-[11px] hover:bg-accent"
                        >
                            {b.label}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-[150px_1fr_210px]">
                    <div className="border-r border-border p-2">
                        <div className="mb-1 text-[11px] font-semibold">
                            Requêtes
                        </div>
                        {tables.map((t) => (
                            <button
                                key={t.name}
                                onClick={() => setTable(t.name)}
                                className={cn(
                                    'block w-full truncate rounded px-2 py-1 text-left text-[11px] hover:bg-accent',
                                    table === t.name && 'bg-accent font-medium',
                                )}
                            >
                                {t.name}
                            </button>
                        ))}
                        {!tables.length && (
                            <p className="text-[11px] text-muted-foreground">
                                Aucun jeu de données chargé.
                            </p>
                        )}
                    </div>
                    <div className="max-h-[45vh] overflow-auto">
                        {!def ? (
                            <p className="p-3 text-[11px] text-muted-foreground">
                                Aucune donnée à prévisualiser.
                            </p>
                        ) : (
                            <table className="w-full border-collapse text-[11px]">
                                <thead className="sticky top-0 bg-muted">
                                    <tr>
                                        {columns.map((c) => (
                                            <th
                                                key={c}
                                                onClick={() => setSortCol(c)}
                                                className="cursor-pointer border-r border-b border-border px-2 py-1 text-left font-semibold whitespace-nowrap hover:bg-accent"
                                            >
                                                {c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} className="hover:bg-accent">
                                            {columns.map((c) => (
                                                <td
                                                    key={c}
                                                    className="border-r border-b border-border px-2 py-[3px] whitespace-nowrap"
                                                >
                                                    {typeof r[c] === 'number'
                                                        ? formatNumber(
                                                              Number(r[c]),
                                                              false,
                                                          )
                                                        : String(r[c] ?? '')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="border-l border-border p-2">
                        <div className="mb-1 text-[11px] font-semibold">
                            Étapes appliquées
                        </div>
                        {steps.map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between rounded px-2 py-1 text-[11px] hover:bg-accent"
                            >
                                <span className="truncate">{s.label}</span>
                                {i > 2 && (
                                    <button
                                        onClick={() =>
                                            setSteps((x) =>
                                                x.filter((_, j) => j !== i),
                                            )
                                        }
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-border bg-panel px-3 py-2">
                    <button
                        onClick={onClose}
                        className="rounded border border-border px-3 py-1 text-[12px]"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => {
                            toast.success('Modifications appliquées au modèle');
                            onClose();
                        }}
                        className="rounded bg-brand px-3 py-1 text-[12px] font-medium text-brand-foreground"
                    >
                        Fermer et appliquer
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ------------------------------ DAX ------------------------------ */

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
        () => [...MEASURES, ...(state.measures ?? [])],
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
                            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-brand"
                        />
                    </label>
                    <label className="block text-[11px] text-muted-foreground">
                        Description
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Facultatif"
                            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-brand"
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

/* ------------------------- Measure management ------------------------- */

export function ManageMeasuresDialog({ onClose }: { onClose: () => void }) {
    const { measures, removeMeasure } = usePbi();
    const [createOpen, setCreateOpen] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Field | null>(null);
    const [confirm, setConfirm] = useState<Field | null>(null);
    const [busy, setBusy] = useState(false);

    const items = useMemo(
        () => [
            ...MEASURES.filter((m) => !measures.some((c) => c.name === m.name)),
            ...measures,
        ],
        [measures],
    );

    const folders = useMemo(() => {
        const map = new Map<string, Field[]>();
        for (const m of items) {
            const key = m.category?.trim() || 'Sans catégorie';
            const arr = map.get(key) ?? [];
            arr.push(m);
            map.set(key, arr);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [items]);

    const del = async (m: Field) => {
        if (busy || m.id == null) return;
        setBusy(true);
        try {
            await removeMeasure(m.id);
            toast.success(`Mesure « ${m.name} » supprimée`);
            setConfirm(null);
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : 'Échec de la suppression de la mesure',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open onClose={onClose} title="Gérer les mesures" wide>
            <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                        Bibliothèque de mesures partagée — utilisable sur chaque
                        page.
                    </span>
                    <div className="flex overflow-hidden rounded border border-border">
                        <button
                            onClick={() => setWizardOpen(true)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-brand hover:bg-brand/10"
                            title="Créer avec l'assistant guidé"
                        >
                            <Sparkles className="size-3.5" /> Assistant
                        </button>
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="border-l border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent"
                            title="Saisir directement la formule DAX"
                        >
                            DAX
                        </button>
                    </div>
                </div>
                {folders.map(([folder, list]) => (
                    <div key={folder} className="mb-3">
                        <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            <Folder className="size-3.5" />
                            {folder}
                            <span className="text-muted-foreground/60">
                                ({list.length})
                            </span>
                        </div>
                        <ul className="mt-1 space-y-1">
                            {list.map((m) => {
                                const error = measureError(m.name);
                                const builtin = MEASURES.some(
                                    (b) => b.name === m.name,
                                );
                                return (
                                    <li
                                        key={m.name}
                                        className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate font-mono text-[12px] font-semibold">
                                                    {m.name}
                                                </span>
                                                {builtin && (
                                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                                        Intégrée
                                                    </span>
                                                )}
                                                {error && (
                                                    <span
                                                        className="inline-flex min-w-0 shrink-0 items-center gap-1 truncate text-[10px] text-red-500"
                                                        title={error}
                                                    >
                                                        <AlertTriangle className="size-3 shrink-0" />
                                                        {error}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="truncate font-mono text-[11px] text-muted-foreground">
                                                {m.expression}
                                            </div>
                                            {m.description && (
                                                <div className="truncate text-[11px] text-muted-foreground/70">
                                                    {m.description}
                                                </div>
                                            )}
                                        </div>
                                        {!builtin && (
                                            <>
                                                <button
                                                    onClick={() =>
                                                        setEditTarget(m)
                                                    }
                                                    title="Modifier la mesure"
                                                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setConfirm(m)
                                                    }
                                                    title="Supprimer la mesure"
                                                    className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
                {!items.length && (
                    <p className="py-6 text-center text-[12px] text-muted-foreground">
                        Aucune mesure pour l’instant — créez-en une avec «
                        DAX ».
                    </p>
                )}
            </div>
            {createOpen && <DaxDialog onClose={() => setCreateOpen(false)} />}
            {wizardOpen && (
                <MeasureWizardDialog onClose={() => setWizardOpen(false)} />
            )}
            {editTarget && (
                <DaxDialog
                    key={`edit-${editTarget.id ?? editTarget.name}`}
                    edit={editTarget}
                    onClose={() => setEditTarget(null)}
                />
            )}
            {confirm && (
                <Modal
                    open
                    onClose={() => setConfirm(null)}
                    title="Supprimer la mesure"
                >
                    <div className="p-4 text-[12px]">
                        <p>
                            Supprimer{' '}
                            <strong className="font-mono">
                                {confirm.name}
                            </strong>
                            ? Les visuels qui l’utilisent cesseront de se
                            résoudre tant qu’ils ne seront pas reliés à un autre
                            champ.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setConfirm(null)}
                                className="rounded border border-border px-3 py-1 text-[12px]"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => del(confirm)}
                                disabled={busy}
                                className="rounded bg-red-600 px-3 py-1 text-[12px] font-medium text-white disabled:opacity-50"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </Modal>
    );
}

/* ----------------------- Performance analyzer ----------------------- */
export function PerformanceDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { page } = usePbi();
    return (
        <Modal open={open} onClose={onClose} title="Analyseur de performances">
            <div className="p-4 text-[12px]">
                <table className="w-full text-left">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="py-1">Visuel</th>
                            <th>Requête DAX</th>
                            <th>Rendu</th>
                            <th>Autre</th>
                        </tr>
                    </thead>
                    <tbody>
                        {page.visuals.map((v, i) => (
                            <tr key={v.id} className="border-t border-border">
                                <td className="py-1">{v.title || v.type}</td>
                                <td>{12 + ((i * 7) % 40)} ms</td>
                                <td>{20 + ((i * 11) % 60)} ms</td>
                                <td>{3 + (i % 9)} ms</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
}

/* ------------------------------- Q&A ------------------------------- */

export function QnaDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { setState, activePageId, tables } = usePbi();
    const [q, setQ] = useState('');

    const primary = tables[0];
    const textCols = (primary?.fields ?? []).filter(
        (f) => f.type === 'text' || f.type === 'date',
    );
    const numCols = (primary?.fields ?? []).filter((f) => f.type === 'number');
    const suggestBy = textCols[0]?.name;
    const suggestVal = numCols[0]?.name;
    const suggestions =
        suggestBy && suggestVal
            ? [
                  `${suggestVal} par ${suggestBy}`,
                  `somme de ${suggestVal} par ${suggestBy}`,
                  `moyenne de ${suggestVal} par ${suggestBy}`,
                  `nombre de ${suggestBy}`,
              ]
            : [];

    const run = () => {
        if (!primary || !suggestBy || !suggestVal) {
            toast.error('Aucun jeu de données chargé');
            return;
        }
        const text = q.toLowerCase();
        const by =
            textCols.find((f) => text.includes(f.name.toLowerCase()))?.name ??
            suggestBy;
        const measure =
            numCols.find((f) => text.includes(f.name.toLowerCase()))?.name ??
            suggestVal;
        const type: 'donut' | 'line' | 'column' =
            text.includes('share') || text.includes('pie')
                ? 'donut'
                : text.includes('trend') || text.includes('month')
                  ? 'line'
                  : 'column';

        const visual = mkVisual(type, 0, 0, 6, 4, {
            title: `${measure} par ${by}`,
            axis: [wf(by, primary.name)],
            values: [wf(measure, primary.name)],
        });
        setState((s) => ({
            ...s,
            pages: s.pages.map((p) =>
                p.id === activePageId
                    ? { ...p, visuals: [...p.visuals, visual] }
                    : p,
            ),
            selectedId: visual.id,
        }));
        toast.success('Visuel Q&A créé', {
            description: `${measure} par ${by}`,
        });
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Q&A — posez une question sur vos données"
        >
            <div className="space-y-3 p-4">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-[13px]"
                    placeholder={
                        suggestBy && suggestVal
                            ? `p. ex. ${suggestVal} par ${suggestBy}`
                            : 'Aucun jeu de données chargé'
                    }
                />
                <div className="flex flex-wrap gap-1 text-[11px]">
                    {suggestions.map((s) => (
                        <button
                            key={s}
                            onClick={() => setQ(s)}
                            className="rounded-full border border-border px-2 py-0.5 hover:bg-accent"
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={run}
                        className="rounded bg-brand px-3 py-1 text-[12px] font-medium text-brand-foreground"
                    >
                        Créer le visuel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
