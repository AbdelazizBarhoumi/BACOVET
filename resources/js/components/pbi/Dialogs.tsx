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
import { MEASURES, formatNumber, type Row } from '@/lib/pbi/model';
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
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
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
        </div>
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
    const [tab, setTab] = useState('Home');
    const [table, setTable] = useState('');
    const [steps, setSteps] = useState<Step[]>([
        { label: 'Source' },
        { label: 'Navigation' },
        { label: 'Changed Type' },
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
        toast.success(`Applied step: ${label}`);
    };

    const RIBBON: Record<string, { label: string; run: () => void }[]> = {
        Home: [
            {
                label: 'Refresh preview',
                run: () => addStep('Refreshed Preview'),
            },
            {
                label: 'Choose columns',
                run: () => addStep('Removed Other Columns'),
            },
            {
                label: 'Remove columns',
                run: () => {
                    const last = columns[columns.length - 1];
                    if (last) {
                        setHidden((h) => [...h, last]);
                        addStep(`Removed Columns (${last})`);
                    }
                },
            },
            { label: 'Keep rows', run: () => addStep('Kept First Rows') },
            { label: 'Merge queries', run: () => addStep('Merged Queries') },
            { label: 'Append queries', run: () => addStep('Appended Query') },
        ],
        Transform: [
            { label: 'Group by', run: () => addStep('Grouped Rows') },
            {
                label: 'Use first row as headers',
                run: () => addStep('Promoted Headers'),
            },
            { label: 'Transpose', run: () => addStep('Transposed Table') },
            { label: 'Pivot column', run: () => addStep('Pivoted Column') },
            {
                label: 'Unpivot columns',
                run: () => addStep('Unpivoted Columns'),
            },
            { label: 'Replace values', run: () => addStep('Replaced Value') },
            {
                label: 'Split column',
                run: () => addStep('Split Column by Delimiter'),
            },
        ],
        'Add Column': [
            { label: 'Custom column', run: () => addStep('Added Custom') },
            {
                label: 'Conditional column',
                run: () => addStep('Added Conditional Column'),
            },
            { label: 'Index column', run: () => addStep('Added Index') },
            {
                label: 'Duplicate column',
                run: () => addStep('Duplicated Column'),
            },
            { label: 'Extract year', run: () => addStep('Inserted Year') },
        ],
        View: [
            {
                label: 'Formula bar',
                run: () => toast.info('Formula bar toggled'),
            },
            {
                label: 'Advanced editor',
                run: () =>
                    toast.info(
                        `let Source = ${def?.name ?? 'Query'} in Source`,
                    ),
            },
            {
                label: 'Query dependencies',
                run: () =>
                    toast.info(
                        tables.map((t) => t.name).join(' → ') || 'No queries',
                    ),
            },
        ],
        Tools: [
            {
                label: 'Query diagnostics',
                run: () => toast.info('Diagnostics session started'),
            },
            { label: 'Options', run: () => toast.info('Query options') },
        ],
    };

    return (
        <Modal open={open} onClose={onClose} title="Power Query Editor" wide>
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
                            Queries
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
                                No datasets loaded.
                            </p>
                        )}
                    </div>
                    <div className="max-h-[45vh] overflow-auto">
                        {!def ? (
                            <p className="p-3 text-[11px] text-muted-foreground">
                                No data to preview.
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
                            Applied steps
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
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            toast.success('Changes applied to the model');
                            onClose();
                        }}
                        className="rounded bg-brand px-3 py-1 text-[12px] font-medium text-brand-foreground"
                    >
                        Close &amp; Apply
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

/* Highlighted layer behind the transparent formula textarea: Power BI-style
 * coloring (functions blue, tables cyan, numbers green, strings orange) plus
 * a highlighted background on the bracket pair adjacent to the caret. */
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
                classes[idx] = `${classes[idx] ?? ''} ${BRACKET_MATCH_CLASS}`.trim();
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
            className="pointer-events-none absolute inset-0 overflow-hidden border border-transparent p-2 font-mono text-[12px] leading-[1.4] whitespace-pre-wrap break-words"
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
            parts.push({ text: signature.signature.slice(last, m.index), active: false });
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

export function DaxDialog({ onClose }: { onClose: () => void }) {
    const { tables, addMeasure, state } = usePbi();
    const taRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const [expr, setExpr] = useState('New Measure = ');
    const [cursor, setCursor] = useState('New Measure = '.length);
    const [active, setActive] = useState(0);
    const [visible, setVisible] = useState(false);

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

    const signature = useMemo(
        () => daxSignature(expr, cursor),
        [expr, cursor],
    );

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
        if (fn.length) cols.push({ title: 'Functions', items: fn });
        if (tb.length) cols.push({ title: 'Datasets', items: tb });
        if (rest.length) cols.push({ title: 'Columns & Measures', items: rest });
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
            setActive(
                (a) => (a - 1 + suggestions.length) % suggestions.length,
            );
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            apply(suggestions[index]!);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setVisible(false);
        }
    };

    const commit = () => {
        const eq = expr.indexOf('=');
        const name = (eq >= 0 ? expr.slice(0, eq) : expr).trim();
        const formula = (eq >= 0 ? expr.slice(eq + 1) : expr).trim();
        if (!name) {
            toast.error('Enter a measure name before the = sign');
            return;
        }
        if (!formula) {
            toast.error('Enter a DAX formula after the = sign');
            return;
        }
        if (measures.some((m) => m.name === name)) {
            toast.error(`Measure "${name}" already exists`);
            return;
        }
        addMeasure(name, expr.trim());
        toast.success('Measure created', {
            description: `${name} = ${formula}`,
        });
        onClose();
    };

    return (
        <Modal open onClose={onClose} title="New measure" wide>
            <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-1 text-[11px]">
                    <span className="py-0.5 text-muted-foreground">
                        Quick start:
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
                                    setExpr(`New Measure = ${snippet}`);
                                    setCursor(`New Measure = ${snippet}`.length - 1);
                                    setVisible(true);
                                    requestAnimationFrame(() => {
                                        taRef.current?.focus();
                                        taRef.current?.setSelectionRange(
                                            `New Measure = ${snippet}`.length -
                                                1,
                                            `New Measure = ${snippet}`.length -
                                                1,
                                        );
                                    });
                                }}
                                className="rounded-full border border-border px-2 py-0.5 font-mono hover:bg-accent"
                            >
                                {snippet}
                            </button>
                        ),
                    )}
                </div>
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
                                e.target.selectionStart ?? e.target.value.length,
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
                        className="text-transparent caret-foreground selection:bg-brand/40 h-28 w-full resize-none rounded border border-border bg-background p-2 font-mono text-[12px] leading-[1.4]"
                    />
                    {show && (
                        <div className="absolute right-0 left-0 top-full z-10 mt-1 overflow-hidden rounded border border-border bg-card shadow-xl">
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
                <div className="text-[11px] text-muted-foreground">
                    Existing measures:
                    <ul className="mt-1 space-y-0.5 font-mono">
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
                        Cancel
                    </button>
                    <button
                        onClick={commit}
                        className="rounded bg-brand px-3 py-1 text-[12px] font-medium text-brand-foreground"
                    >
                        Commit
                    </button>
                </div>
            </div>
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
        <Modal open={open} onClose={onClose} title="Performance analyzer">
            <div className="p-4 text-[12px]">
                <table className="w-full text-left">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="py-1">Visual</th>
                            <th>DAX query</th>
                            <th>Render</th>
                            <th>Other</th>
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
                  `${suggestVal} by ${suggestBy}`,
                  `sum of ${suggestVal} by ${suggestBy}`,
                  `average of ${suggestVal} by ${suggestBy}`,
                  `count of ${suggestBy}`,
              ]
            : [];

    const run = () => {
        if (!primary || !suggestBy || !suggestVal) {
            toast.error('No datasets loaded');
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
            title: `${measure} by ${by}`,
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
        toast.success('Q&A visual created', {
            description: `${measure} by ${by}`,
        });
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Q&A — ask a question about your data"
        >
            <div className="space-y-3 p-4">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-[13px]"
                    placeholder={
                        suggestBy && suggestVal
                            ? `e.g. ${suggestVal} by ${suggestBy}`
                            : 'No datasets loaded'
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
                        Create visual
                    </button>
                </div>
            </div>
        </Modal>
    );
}
