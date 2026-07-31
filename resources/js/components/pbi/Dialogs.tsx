import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    SALES,
    MEASURES,
    TABLES,
    formatNumber,
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
    const [tab, setTab] = useState('Home');
    const [table, setTable] = useState('Sales');
    const [steps, setSteps] = useState<Step[]>([
        { label: 'Source' },
        { label: 'Navigation' },
        { label: 'Changed Type' },
    ]);
    const [hidden, setHidden] = useState<string[]>([]);
    const [sortCol, setSortCol] = useState<string | null>(null);

    const def = TABLES.find((t) => t.name === table) ?? TABLES[0]!;
    const columns = def.fields
        .map((f) => f.name)
        .filter((c) => !hidden.includes(c));

    const rows: Row[] = useMemo(() => {
        const data = [...SALES].slice(0, 400);
        if (sortCol)
            data.sort((a, b) =>
                String(a[sortCol]).localeCompare(String(b[sortCol])),
            );
        return data.slice(0, 200);
    }, [sortCol]);

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
                run: () => toast.info('let Source = Sales in Source'),
            },
            {
                label: 'Query dependencies',
                run: () => toast.info('Sales → Date, Product, Region'),
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
                        {TABLES.map((t) => (
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
                    </div>
                    <div className="max-h-[45vh] overflow-auto">
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

export function DaxDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [expr, setExpr] = useState('New Measure = SUM ( Sales[Sales] )');
    return (
        <Modal open={open} onClose={onClose} title="DAX formula bar">
            <div className="space-y-3 p-4">
                <textarea
                    value={expr}
                    onChange={(e) => setExpr(e.target.value)}
                    spellCheck={false}
                    className="h-28 w-full rounded border border-border bg-background p-2 font-mono text-[12px]"
                />
                <div className="text-[11px] text-muted-foreground">
                    Existing measures:
                    <ul className="mt-1 space-y-0.5 font-mono">
                        {MEASURES.map((m) => (
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
                        onClick={() => {
                            toast.success('Measure validated', {
                                description: expr.split('=')[0]?.trim(),
                            });
                            onClose();
                        }}
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
    const { setState, activePageId } = usePbi();
    const [q, setQ] = useState('total sales by category');

    const run = () => {
        const text = q.toLowerCase();
        const by = text.includes('country')
            ? 'Country'
            : text.includes('month')
              ? 'Month'
              : text.includes('region')
                ? 'Region'
                : text.includes('year')
                  ? 'Year'
                  : 'Category';
        const measure = text.includes('profit')
            ? 'Total Profit'
            : text.includes('quantity')
              ? 'Quantity'
              : 'Total Sales';
        const type: 'donut' | 'line' | 'column' =
            text.includes('share') || text.includes('pie')
                ? 'donut'
                : text.includes('trend') || text.includes('month')
                  ? 'line'
                  : 'column';

        const visual = mkVisual(type, 0, 0, 6, 4, {
            title: `${measure} by ${by}`,
            axis: [wf(by)],
            values: [wf(measure)],
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
                    placeholder="e.g. total profit by country"
                />
                <div className="flex flex-wrap gap-1 text-[11px]">
                    {[
                        'total sales by month',
                        'total profit by country',
                        'sales share by category',
                        'quantity by region',
                    ].map((s) => (
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
