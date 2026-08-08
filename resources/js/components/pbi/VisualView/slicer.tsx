import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import type { RelativePreset } from '@/lib/pbi/filters';
import {
    distinctValues,
    type Row,
    type Visual,
} from '@/lib/pbi/model';
import { slicerKey, usePbi, type SlicerDateMode } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { EmptyVisual } from './shared';

export function SlicerVisual({ visual, rows }: { visual: Visual; rows: Row[] }) {
    const {
        slicerSelections,
        slicerDateRanges,
        toggleSlicer,
        setSlicerSelection,
        setSlicerDateRange,
        clearSlicer,
    } = usePbi();
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const col = visual.axis[0]?.name;
    const selection = slicerSelections[visual.id] ?? [];
    if (!col) return <EmptyVisual label="Segmenteur" />;
    const allValues = distinctValues(col, rows);
    const values = allValues.filter((v) =>
        v.toLowerCase().includes(q.toLowerCase()),
    );
    const isOn = (v: string) =>
        selection.includes(slicerKey(visual.axis[0]?.table, col, v));
    const selectedValue = allValues.find(isOn) ?? null;

    if (visual.type === 'dropdownSlicer')
        return (
            <div className="flex h-full flex-col justify-center p-1">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button
                            className="flex w-full items-center gap-1.5 rounded border border-border bg-background px-2 py-1.5 text-left text-[11px] hover:bg-accent"
                            onClick={() => setOpen((o) => !o)}
                        >
                            <span className="min-w-0 flex-1 truncate">
                                {selectedValue ?? 'Tous'}
                            </span>
                            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        className="flex max-h-64 w-60 flex-col p-0"
                    >
                        <div className="flex items-center gap-1 border-b border-border p-1.5">
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Rechercher"
                                className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-1 text-[11px] placeholder:text-muted-foreground/50 focus:outline-none"
                            />
                            {selectedValue && (
                                <button
                                    onClick={() =>
                                        setSlicerSelection(visual.id, col, null)
                                    }
                                    aria-label="Effacer le segment"
                                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto p-1">
                            {values.map((v) => (
                                <button
                                    key={v}
                                    onClick={() => {
                                        setSlicerSelection(visual.id, col, v);
                                        setQ('');
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'block w-full truncate rounded px-1.5 py-1 text-left text-[11px] hover:bg-accent',
                                        isOn(v) && 'bg-brand/15 font-medium',
                                    )}
                                >
                                    {v}
                                </button>
                            ))}
                            {!values.length && (
                                <div className="px-1.5 py-1 text-[10px] text-muted-foreground">
                                    Aucune valeur
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        );

    if (visual.type === 'inputSlicer')
        return (
            <div className="flex h-full flex-col gap-2 p-1">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={`Tapez pour filtrer ${col}…`}
                    className="rounded border border-border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/50"
                />
                <div className="flex-1 overflow-auto">
                    {values.map((v) => (
                        <button
                            key={v}
                            onClick={() => toggleSlicer(visual.id, col, v)}
                            className={cn(
                                'block w-full truncate rounded px-2 py-0.5 text-left text-[11px] hover:bg-accent',
                                isOn(v) && 'bg-brand/15 font-medium',
                            )}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>
        );

    if (visual.type === 'dateSlicer') {
        const range = slicerDateRanges[visual.id] ?? {};
        const mode: SlicerDateMode = range.mode ?? 'between';
        const dateVals = allValues.filter((v) => /^\d{4}-\d{2}-\d{2}/.test(v));
        const minIso = dateVals[0];
        const maxIso = dateVals[dateVals.length - 1];
        const minMs = minIso ? new Date(`${minIso}T00:00:00`).getTime() : 0;
        const maxMs = maxIso ? new Date(`${maxIso}T00:00:00`).getTime() : 0;
        const hasDomain = !!minIso && !!maxIso && minMs < maxMs;
        const msToIso = (ms: number) => {
            const d = new Date(ms);
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${d.getFullYear()}-${m}-${day}`;
        };
        const STEP = 86_400_000;
        const MODES: { value: SlicerDateMode; label: string }[] = [
            { value: 'between', label: 'Entre' },
            { value: 'before', label: 'Avant' },
            { value: 'after', label: 'Après' },
            { value: 'relative', label: 'Relative' },
        ];
        const RELATIVE_PRESETS: { key: RelativePreset; label: string }[] = [
            { key: 'today', label: 'Aujourd’hui' },
            { key: 'yesterday', label: 'Hier' },
            { key: 'last7days', label: '7 derniers jours' },
            { key: 'last30days', label: '30 derniers jours' },
            { key: 'last90days', label: '90 derniers jours' },
            { key: 'thisMonth', label: 'Ce mois-ci' },
            { key: 'lastMonth', label: 'Le mois dernier' },
            { key: 'thisYear', label: 'Cette année' },
            { key: 'lastYear', label: 'L’année dernière' },
            { key: 'ytd', label: 'YTD' },
        ];
        const set = (patch: Partial<typeof range>) =>
            setSlicerDateRange(visual.id, { ...range, ...patch });

        let body: React.ReactNode;
        if (mode === 'relative') {
            body = (
                <div className="flex flex-wrap gap-1">
                    {RELATIVE_PRESETS.map((p) => {
                        const active = range.relative === p.key;
                        return (
                            <button
                                key={p.key}
                                onClick={() =>
                                    set({
                                        mode: 'relative',
                                        relative: p.key,
                                        from: undefined,
                                        to: undefined,
                                    })
                                }
                                className={cn(
                                    'rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                                    active
                                        ? 'border-brand bg-brand text-brand-foreground'
                                        : 'border-border hover:bg-accent',
                                )}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            );
        } else if (mode === 'before') {
            body = (
                <>
                    {hasDomain && (
                        <Slider
                            min={minMs}
                            max={maxMs}
                            step={STEP}
                            value={[
                                range.to
                                    ? new Date(`${range.to}T00:00:00`).getTime()
                                    : maxMs,
                            ]}
                            onValueChange={([v]) =>
                                set({
                                    mode: 'before',
                                    to: msToIso(v),
                                    from: undefined,
                                })
                            }
                        />
                    )}
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Au</span>
                        <input
                            type="date"
                            value={range.to ?? ''}
                            onChange={(e) =>
                                set({
                                    mode: 'before',
                                    to: e.target.value || undefined,
                                    from: undefined,
                                })
                            }
                            className="rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                </>
            );
        } else if (mode === 'after') {
            body = (
                <>
                    {hasDomain && (
                        <Slider
                            min={minMs}
                            max={maxMs}
                            step={STEP}
                            value={[
                                range.from
                                    ? new Date(
                                          `${range.from}T00:00:00`,
                                      ).getTime()
                                    : minMs,
                            ]}
                            onValueChange={([v]) =>
                                set({
                                    mode: 'after',
                                    from: msToIso(v),
                                    to: undefined,
                                })
                            }
                        />
                    )}
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Du</span>
                        <input
                            type="date"
                            value={range.from ?? ''}
                            onChange={(e) =>
                                set({
                                    mode: 'after',
                                    from: e.target.value || undefined,
                                    to: undefined,
                                })
                            }
                            className="rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                </>
            );
        } else {
            body = (
                <>
                    {hasDomain && (
                        <Slider
                            min={minMs}
                            max={maxMs}
                            step={STEP}
                            value={[
                                range.from
                                    ? new Date(
                                          `${range.from}T00:00:00`,
                                      ).getTime()
                                    : minMs,
                                range.to
                                    ? new Date(`${range.to}T00:00:00`).getTime()
                                    : maxMs,
                            ]}
                            onValueChange={([a, b]) =>
                                set({
                                    mode: 'between',
                                    from: msToIso(a),
                                    to: msToIso(b),
                                })
                            }
                        />
                    )}
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Du</span>
                        <input
                            type="date"
                            value={range.from ?? ''}
                            onChange={(e) =>
                                set({
                                    mode: 'between',
                                    from: e.target.value || undefined,
                                })
                            }
                            className="rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Au</span>
                        <input
                            type="date"
                            value={range.to ?? ''}
                            onChange={(e) =>
                                set({
                                    mode: 'between',
                                    to: e.target.value || undefined,
                                })
                            }
                            className="rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                </>
            );
        }

        return (
            <div className="flex h-full flex-col justify-center gap-2 p-2 text-[11px]">
                <div className="flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                        {MODES.map((m) => (
                            <button
                                key={m.value}
                                onClick={() => set({ mode: m.value })}
                                className={cn(
                                    'rounded px-1.5 py-0.5 text-[9px] transition-colors',
                                    mode === m.value
                                        ? 'bg-brand text-brand-foreground'
                                        : 'bg-accent/50 text-muted-foreground hover:bg-accent',
                                )}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setSlicerDateRange(visual.id, {})}
                        className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                        Effacer
                    </button>
                </div>
                {body}
            </div>
        );
    }

    if (visual.type === 'buttonSlicer')
        return (
            <div className="flex h-full flex-wrap content-start gap-1 overflow-auto p-1">
                {values.map((v) => (
                    <button
                        key={v}
                        onClick={() => toggleSlicer(visual.id, col, v)}
                        className={cn(
                            'rounded border px-2 py-1 text-[10px] transition-colors',
                            isOn(v)
                                ? 'border-brand bg-brand text-brand-foreground'
                                : 'border-border hover:bg-accent',
                        )}
                    >
                        {v}
                    </button>
                ))}
            </div>
        );

    return (
        <div className="flex h-full flex-col">
            <button
                onClick={() => clearSlicer(visual.id)}
                className="self-end text-[10px] text-muted-foreground hover:text-foreground"
            >
                Effacer
            </button>
            <div className="mt-1 flex-1 overflow-auto pr-1">
                {values.map((v) => (
                    <label
                        key={v}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-accent"
                    >
                        <input
                            type="checkbox"
                            checked={isOn(v)}
                            onChange={() => toggleSlicer(visual.id, col, v)}
                            className="size-3 accent-[var(--brand)]"
                        />
                        <span className="truncate">{v}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}