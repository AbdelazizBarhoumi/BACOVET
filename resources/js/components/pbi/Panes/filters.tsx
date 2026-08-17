import {
    Eye,
    Filter,
    Pencil,
    Plus,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    applyFilter,
    customFilterColumnsForTable,
    customFilterPooledValues,
    customFilterSelectedValues,
    isCustomFilter,
    relativeDateRange,
    type FilterType,
    type RelativePreset,
    type ReportFilter,
} from '@/lib/pbi/filters';
import { distinctValues } from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { JoinMapDialog } from '../JoinMapDialog';
import { PaneHeader } from './shared';

export function FiltersPane({ onCollapse }: { onCollapse?: () => void }) {
    const {
        filters,
        addFilter,
        addCustomFilter,
        toggleFilterValue,
        setFilterValues,
        removeFilter,
        setFilterScope,
        setFilterType,
        setFilterQuery,
        setFilterRange,
        setFilterRelative,
        setFilterTopN,
        setCustomFilterColumns,
        setCustomFilterLabel,
        toggleCustomFilterPooledValue,
        setCustomFilterPooledValue,
        tables,
        tableRows,
        measures,
        graph,
        state,
        parameters,
        setParameterValue,
        removeParameter,
    } = usePbi();
    const columns = tables.flatMap((t) =>
        t.fields
            .filter((f) => f.type !== 'number' && f.type !== 'boolean')
            .map((f) => ({ name: f.name, table: t.name })),
    );
    const numericColumns = useMemo(
        () => [
            ...tables.flatMap((t) =>
                t.fields
                    .filter((f) => f.type === 'number')
                    .map((f) => ({ name: f.name, table: t.name })),
            ),
            ...(measures ?? []).map((m) => ({ name: m.name, table: m.table })),
        ],
        [tables, measures],
    );

    const [dragOver, setDragOver] = useState(false);
    const [customOpen, setCustomOpen] = useState(false);
    const [customLabel, setCustomLabel] = useState('');
    const [customColumns, setCustomColumns] = useState<
        { table: string; column: string }[]
    >([]);
    const [customSearchQuery, setCustomSearchQuery] = useState('');
    const [editingCustom, setEditingCustom] = useState<string | null>(null);
    const [mapFor, setMapFor] = useState<ReportFilter | null>(null);

    const filteredCustomTables = useMemo(() => {
        const q = customSearchQuery.trim().toLowerCase();
        return tables
            .map((t) => ({
                ...t,
                fields: t.fields.filter(
                    (field) =>
                        field.type !== 'boolean' &&
                        (!q ||
                            [
                                field.name,
                                t.name,
                                `${t.name}.${field.name}`,
                            ].some((value) => value.toLowerCase().includes(q))),
                ),
            }))
            .filter((t) => t.fields.length > 0);
    }, [tables, customSearchQuery]);

    const [newFilterQuery, setNewFilterQuery] = useState('');
    const [showFilterList, setShowFilterList] = useState(false);
    const filteredColumns = useMemo(() => {
        const q = newFilterQuery.trim().toLowerCase();
        if (!q) return columns.slice(0, 200);
        return columns
            .filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    c.table.toLowerCase().includes(q) ||
                    `${c.table}.${c.name}`.toLowerCase().includes(q),
            )
            .slice(0, 200);
    }, [columns, newFilterQuery]);

    const rowsFor = (f: (typeof filters)[number]) =>
        (f.table && tableRows[f.table]) || [];

    const filterValues = (f: (typeof filters)[number]) =>
        distinctValues(f.column, rowsFor(f));

    const filterName = (f: (typeof filters)[number]) =>
        isCustomFilter(f) ? (f.label ?? f.column) : f.column;

    const pooledOptions = (f: (typeof filters)[number]) =>
        customFilterPooledValues(f, tables);

    const pooledSelected = (f: (typeof filters)[number]) =>
        customFilterSelectedValues(f);

    const pathExists = (from: string, to: string) => {
        if (from === to) return true;
        const seen = new Set<string>([from]);
        const queue = [from];
        while (queue.length) {
            const table = queue.shift()!;
            for (const edge of graph.edges) {
                const next =
                    edge.a === table
                        ? edge.b
                        : edge.b === table
                          ? edge.a
                          : null;
                if (!next || seen.has(next)) continue;
                if (next === to) return true;
                seen.add(next);
                queue.push(next);
            }
        }
        return false;
    };

    const disconnectedPair = (
        selected: { table: string; column: string }[],
    ) => {
        const tables = [...new Set(selected.map((column) => column.table))];
        if (tables.length < 2) return null;
        for (let i = 0; i < tables.length; i++) {
            for (let j = i + 1; j < tables.length; j++) {
                if (!pathExists(tables[i]!, tables[j]!)) {
                    return [tables[i]!, tables[j]!] as const;
                }
            }
        }
        return null;
    };

    const customTypes: { value: FilterType; label: string }[] = [
        { value: 'list', label: 'Liste' },
        { value: 'dropdown', label: 'Liste déroulante' },
        { value: 'search', label: 'Recherche' },
    ];

    const filterTypes: { value: FilterType; label: string }[] = [
        { value: 'list', label: 'Liste' },
        { value: 'dropdown', label: 'Liste déroulante' },
        { value: 'search', label: 'Recherche' },
        { value: 'dateRange', label: 'Période' },
        { value: 'relativeDate', label: 'Période relative' },
        { value: 'topN', label: 'N premiers' },
    ];

    const customDiagnostics = (f: (typeof filters)[number]) => {
        if (!isCustomFilter(f)) return null;
        let direct = 0;
        let propagated = 0;
        let affected = 0;
        for (const t of tables) {
            const applies = customFilterColumnsForTable(f, t).length > 0;
            if (!applies) continue;
            affected += 1;
            direct += applyFilter(t.rows, f, {
                table: t,
                activePageId: state.activePageId,
            }).length;
            propagated += tableRows[t.name]?.length ?? 0;
        }
        return { affected, direct, propagated };
    };

    const toggleCustomColumn = (table: string, column: string) => {
        setCustomColumns((cols) => {
            const exists = cols.some(
                (c) => c.table === table && c.column === column,
            );
            return exists
                ? cols.filter(
                      (c) => !(c.table === table && c.column === column),
                  )
                : [...cols, { table, column }];
        });
    };

    const createCustomFilter = () => {
        if (customColumns.length < 2) return;
        const disconnected = disconnectedPair(customColumns);
        if (disconnected) {
            toast.error(
                `Connexion introuvable entre ${disconnected[0]} et ${disconnected[1]}.`,
            );
            return;
        }
        if (editingCustom) {
            setCustomFilterColumns(editingCustom, customColumns);
            const newLabel = customLabel.trim() || editingCustom;
            if (newLabel !== editingCustom)
                setCustomFilterLabel(editingCustom, newLabel);
        } else {
            addCustomFilter(
                customLabel || 'Filtre personnalisé',
                customColumns,
                'report',
            );
        }
        setCustomOpen(false);
        setCustomLabel('');
        setCustomColumns([]);
        setCustomSearchQuery('');
        setEditingCustom(null);
    };

    const relativePresets: { value: RelativePreset; label: string }[] = [
        { value: 'today', label: "Aujourd'hui" },
        { value: 'yesterday', label: 'Hier' },
        { value: 'last7days', label: '7 derniers jours' },
        { value: 'last30days', label: '30 derniers jours' },
        { value: 'last90days', label: '90 derniers jours' },
        { value: 'thisMonth', label: 'Ce mois-ci' },
        { value: 'lastMonth', label: 'Le mois dernier' },
        { value: 'thisYear', label: 'Cette année' },
        { value: 'lastYear', label: "L'année dernière" },
        { value: 'ytd', label: 'Depuis le début de l’année' },
    ];

    const pageParameters = parameters.filter(
        (p) => p.pageId === state.activePageId,
    );

    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Filtres"
                right={<Filter className="size-3 text-muted-foreground" />}
                onCollapse={onCollapse}
            />
            <div
                className={cn(
                    'flex-1 overflow-auto px-3 pb-3',
                    dragOver && 'bg-brand/5 ring-2 ring-brand ring-inset',
                )}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
                }}
                onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node))
                        return;
                    setDragOver(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const raw = e.dataTransfer.getData('text/plain');
                    try {
                        const payload = JSON.parse(raw);
                        if (payload?.name && !payload.measure)
                            addFilter(payload.name, payload.table);
                    } catch {
                        // ignore non-field drops
                    }
                }}
            >
                <div className="pb-2">
                    <div className="relative">
                        <div className="flex items-center gap-1 rounded border border-border bg-background px-2">
                            <Search className="size-3 text-muted-foreground" />
                            <input
                                value={newFilterQuery}
                                onChange={(e) =>
                                    setNewFilterQuery(e.target.value)
                                }
                                onFocus={() => setShowFilterList(true)}
                                onBlur={() =>
                                    setTimeout(
                                        () => setShowFilterList(false),
                                        150,
                                    )
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const match = filteredColumns[0];
                                        if (match) {
                                            addFilter(match.name, match.table);
                                            setNewFilterQuery('');
                                            setShowFilterList(false);
                                        }
                                    }
                                }}
                                placeholder="Ajouter un champ de filtre…"
                                className="w-full bg-transparent py-1 text-[11px] outline-none placeholder:text-muted-foreground/50"
                            />
                            {newFilterQuery && (
                                <button
                                    onClick={() => setNewFilterQuery('')}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                                    aria-label="Effacer la recherche"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>
                        {showFilterList && filteredColumns.length > 0 && (
                            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border border-border bg-background">
                                {filteredColumns.map((c) => (
                                    <button
                                        key={`${c.table}::${c.name}`}
                                        onClick={() => {
                                            addFilter(c.name, c.table);
                                            setNewFilterQuery('');
                                            setShowFilterList(false);
                                        }}
                                        className="flex w-full items-center justify-between px-2 py-1 text-left text-[11px] hover:bg-accent"
                                    >
                                        <span className="truncate">
                                            {c.name}
                                        </span>
                                        <span className="ml-2 shrink-0 text-muted-foreground">
                                            {c.table}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setEditingCustom(null);
                            setCustomOpen((v) => !v);
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-accent"
                    >
                        <Plus className="size-3" /> Créer un filtre personnalisé
                    </button>
                    {customOpen && (
                        <div className="mt-2 rounded border border-border bg-background p-2">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[11px] font-medium">
                                    {editingCustom
                                        ? 'Modifier le filtre'
                                        : 'Créer un filtre personnalisé'}
                                </span>
                                <button
                                    onClick={() => {
                                        setCustomOpen(false);
                                        setEditingCustom(null);
                                        setCustomLabel('');
                                        setCustomColumns([]);
                                        setCustomSearchQuery('');
                                    }}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                                    aria-label="Fermer"
                                >
                                    <X className="size-3" />
                                </button>
                            </div>
                            <input
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                                placeholder="Nom du filtre"
                                className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/50"
                            />
                            <div className="mb-2 flex items-center gap-2">
                                <div className="flex flex-1 items-center gap-1 rounded border border-border bg-background px-2">
                                    <Search className="size-3 text-muted-foreground" />
                                    <input
                                        value={customSearchQuery}
                                        onChange={(e) =>
                                            setCustomSearchQuery(e.target.value)
                                        }
                                        placeholder="Rechercher des colonnes…"
                                        className="w-full bg-transparent py-1 text-[11px] outline-none placeholder:text-muted-foreground/50"
                                    />
                                </div>
                                {customSearchQuery && (
                                    <button
                                        onClick={() => setCustomSearchQuery('')}
                                        className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                                        aria-label="Effacer la recherche"
                                    >
                                        <X className="size-3" />
                                    </button>
                                )}
                            </div>
                            <div className="mb-2 max-h-40 overflow-auto rounded border border-border/70 p-1">
                                {filteredCustomTables.map((t) => (
                                    <div key={t.name} className="mb-1">
                                        <div className="px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                                            {t.name}
                                        </div>
                                        {t.fields
                                            .filter((f) => f.type !== 'boolean')
                                            .map((field) => {
                                                const checked =
                                                    customColumns.some(
                                                        (c) =>
                                                            c.table ===
                                                                t.name &&
                                                            c.column ===
                                                                field.name,
                                                    );
                                                return (
                                                    <label
                                                        key={`${t.name}::${field.name}`}
                                                        className="flex items-center gap-2 px-1 py-[1px] text-[11px]"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() =>
                                                                toggleCustomColumn(
                                                                    t.name,
                                                                    field.name,
                                                                )
                                                            }
                                                            className="size-3 accent-[var(--brand)]"
                                                        />
                                                        <span className="truncate">
                                                            {field.name}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={createCustomFilter}
                                disabled={customColumns.length < 2}
                                className="w-full rounded bg-brand px-2 py-1 text-[11px] text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {editingCustom
                                    ? `Modifier (${customColumns.length})`
                                    : `Ajouter (${customColumns.length})`}
                            </button>
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    {pageParameters.length > 0 && (
                        <div className="space-y-2 rounded border border-brand/30 bg-brand/[0.04] p-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                                <SlidersHorizontal className="size-3" />
                                Paramètres du rapport
                            </div>
                            {pageParameters.map((p) => (
                                <div
                                    key={p.id}
                                    className="rounded border border-border bg-background p-2"
                                >
                                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium">
                                        <span className="min-w-0 truncate">
                                            {p.name}
                                            <span className="block truncate text-[9px] font-normal text-muted-foreground">
                                                {p.root}
                                            </span>
                                        </span>
                                        <button
                                            onClick={() =>
                                                removeParameter(p.id)
                                            }
                                            title="Retirer le paramètre"
                                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </div>
                                    <div className="max-h-36 overflow-auto">
                                        {p.values.map((value) => (
                                            <label
                                                key={value}
                                                className="flex items-center gap-2 py-[1px] text-[11px]"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={p.value === value}
                                                    onChange={() =>
                                                        setParameterValue(
                                                            p.id,
                                                            p.value === value
                                                                ? null
                                                                : value,
                                                        )
                                                    }
                                                    className="size-3 accent-[var(--brand)]"
                                                />
                                                <span className="truncate font-mono">
                                                    {value}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="mt-1 text-[9px] text-muted-foreground">
                                        Tous les endpoints utilisant ce
                                        paramètre rechargent la valeur choisie.
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                    {!filters.length && (
                        <p className="text-[11px] text-muted-foreground">
                            Filtres sur toutes les pages. Glissez un champ ici
                            ou double-cliquez sur un champ du volet Données pour
                            l’ajouter.
                        </p>
                    )}
                    {filters.map((f) => {
                        const name = filterName(f);
                        const isCustom = isCustomFilter(f);
                        const options = filterValues(f);
                        const diagnostics = customDiagnostics(f);
                        const customSelectedCount = isCustom
                            ? pooledSelected(f).length
                            : 0;
                        return (
                            <div
                                key={`${isCustom ? 'custom' : (f.table ?? '')}::${name}`}
                                className="rounded border border-border bg-background p-2"
                            >
                                <div className="mb-1 flex items-center justify-between text-[11px] font-medium">
                                    <span className="min-w-0 truncate">
                                        {isCustom ? (
                                            <input
                                                value={name}
                                                onChange={(e) =>
                                                    setCustomFilterLabel(
                                                        name,
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full bg-transparent outline-none"
                                            />
                                        ) : (
                                            f.column
                                        )}
                                        <span className="text-muted-foreground">
                                            {' '}
                                            {f.type === 'search' && f.query
                                                ? `\u201C${f.query}\u201D `
                                                : f.type === 'topN'
                                                  ? `N premiers : ${f.topN}`
                                                  : f.type === 'relativeDate'
                                                    ? (relativePresets.find(
                                                          (p) =>
                                                              p.value ===
                                                              f.relative,
                                                      )?.label ??
                                                      'Période relative')
                                                    : f.type === 'dateRange'
                                                      ? `${f.from ?? '…'} → ${f.to ?? '…'}`
                                                      : isCustom
                                                        ? customSelectedCount
                                                            ? `${customSelectedCount} sélection(s)`
                                                            : '(Tous)'
                                                        : f.values.length
                                                          ? f.values.join(', ')
                                                          : '(Tous)'}
                                        </span>
                                    </span>
                                    <div className="flex shrink-0 items-center gap-0.5">
                                        {isCustom && (
                                            <button
                                                onClick={() => {
                                                    setCustomLabel(name);
                                                    setCustomColumns(
                                                        (f.columns ?? []).map(
                                                            ({
                                                                table,
                                                                column,
                                                            }) => ({
                                                                table,
                                                                column,
                                                            }),
                                                        ),
                                                    );
                                                    setCustomSearchQuery('');
                                                    setEditingCustom(name);
                                                    setCustomOpen(true);
                                                }}
                                                title="Modifier le filtre"
                                                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                            >
                                                <Pencil className="size-3" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setMapFor(f)}
                                            title="Voir la carte des relations"
                                            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                        >
                                            <Eye className="size-3" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                removeFilter(
                                                    isCustom ? name : f.column,
                                                    isCustom
                                                        ? undefined
                                                        : f.table,
                                                )
                                            }
                                            className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </div>
                                </div>
                                <select
                                    aria-label={`Type de filtre pour ${name}`}
                                    value={f.type}
                                    onChange={(e) =>
                                        setFilterType(
                                            isCustom ? name : f.column,
                                            isCustom ? undefined : f.table,
                                            e.target.value as FilterType,
                                        )
                                    }
                                    className="mb-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                                >
                                    {(isCustom ? customTypes : filterTypes).map(
                                        (t) => (
                                            <option
                                                key={t.value}
                                                value={t.value}
                                            >
                                                {t.label}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <select
                                    aria-label={`Portée du filtre pour ${name}`}
                                    value={f.scope}
                                    onChange={(e) =>
                                        setFilterScope(
                                            isCustom ? name : f.column,
                                            isCustom ? undefined : f.table,
                                            e.target.value as 'page' | 'report',
                                        )
                                    }
                                    className="mb-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                                >
                                    <option value="report">
                                        Toutes les pages
                                    </option>
                                    <option value="page">Page actuelle</option>
                                </select>

                                {f.type === 'search' && (
                                    <input
                                        type="text"
                                        value={f.query ?? ''}
                                        onChange={(e) =>
                                            setFilterQuery(
                                                isCustom ? name : f.column,
                                                isCustom ? undefined : f.table,
                                                e.target.value,
                                            )
                                        }
                                        placeholder={`Rechercher ${name}…`}
                                        className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/50"
                                    />
                                )}

                                {f.type === 'dateRange' && (
                                    <div className="flex items-center gap-1 text-[10px]">
                                        <input
                                            type="date"
                                            value={f.from ?? ''}
                                            onChange={(e) =>
                                                setFilterRange(
                                                    f.column,
                                                    f.table,
                                                    e.target.value || undefined,
                                                    f.to,
                                                )
                                            }
                                            className="w-full rounded border border-border bg-background px-1 py-0.5"
                                        />
                                        <span className="text-muted-foreground">
                                            →
                                        </span>
                                        <input
                                            type="date"
                                            value={f.to ?? ''}
                                            onChange={(e) =>
                                                setFilterRange(
                                                    f.column,
                                                    f.table,
                                                    f.from,
                                                    e.target.value || undefined,
                                                )
                                            }
                                            className="w-full rounded border border-border bg-background px-1 py-0.5"
                                        />
                                    </div>
                                )}

                                {f.type === 'relativeDate' && (
                                    <>
                                        <select
                                            value={f.relative ?? 'last7days'}
                                            onChange={(e) =>
                                                setFilterRelative(
                                                    f.column,
                                                    f.table,
                                                    e.target
                                                        .value as RelativePreset,
                                                )
                                            }
                                            className="mb-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                                        >
                                            {relativePresets.map((p) => (
                                                <option
                                                    key={p.value}
                                                    value={p.value}
                                                >
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-muted-foreground">
                                            {(() => {
                                                const r = relativeDateRange(
                                                    f.relative ?? 'last7days',
                                                );
                                                return `${r.from} → ${r.to}`;
                                            })()}
                                        </p>
                                    </>
                                )}

                                {f.type === 'topN' && (
                                    <div className="flex items-center gap-1 text-[10px]">
                                        <input
                                            type="number"
                                            min={1}
                                            value={f.topN ?? 10}
                                            onChange={(e) => {
                                                const n = Math.max(
                                                    1,
                                                    Number(e.target.value) ||
                                                        10,
                                                );
                                                setFilterTopN(
                                                    f.column,
                                                    f.table,
                                                    n,
                                                    f.topNBy ?? {
                                                        name:
                                                            numericColumns[0]
                                                                ?.name ?? '',
                                                        agg: 'sum',
                                                        table: numericColumns[0]
                                                            ?.table,
                                                    },
                                                );
                                            }}
                                            className="w-14 rounded border border-border bg-background px-1 py-0.5"
                                        />
                                        <select
                                            aria-label={`Mesure pour le N premiers de ${f.column}`}
                                            value={f.topNBy?.name ?? ''}
                                            onChange={(e) =>
                                                setFilterTopN(
                                                    f.column,
                                                    f.table,
                                                    f.topN ?? 10,
                                                    {
                                                        name: e.target.value,
                                                        agg: 'sum',
                                                        table: numericColumns.find(
                                                            (c) =>
                                                                c.name ===
                                                                e.target.value,
                                                        )?.table,
                                                    },
                                                )
                                            }
                                            className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-0.5"
                                        >
                                            {numericColumns.map((c) => (
                                                <option
                                                    key={c.name}
                                                    value={c.name}
                                                >
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(f.type === 'list' || f.type === 'dropdown') &&
                                    (isCustom ? (
                                        <div>
                                            <div className="mb-1 text-[10px] text-muted-foreground">
                                                Valeurs fusionnées (
                                                {pooledOptions(f).length})
                                            </div>
                                            {f.type === 'dropdown' ? (
                                                <select
                                                    aria-label={`Valeur de ${name}`}
                                                    value={
                                                        pooledSelected(f).length
                                                            ? pooledSelected(
                                                                  f,
                                                              )[0]
                                                            : '__all__'
                                                    }
                                                    onChange={(e) => {
                                                        const v =
                                                            e.target.value;
                                                        setCustomFilterPooledValue(
                                                            name,
                                                            v === '__all__'
                                                                ? null
                                                                : v,
                                                        );
                                                    }}
                                                    className="mb-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                                                >
                                                    <option value="__all__">
                                                        (Tous)
                                                    </option>
                                                    {pooledOptions(f).map(
                                                        (v) => (
                                                            <option
                                                                key={v}
                                                                value={v}
                                                            >
                                                                {v}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            ) : (
                                                <div className="max-h-36 overflow-auto">
                                                    {pooledOptions(f).map(
                                                        (v) => (
                                                            <label
                                                                key={`${name}::${v}`}
                                                                className="flex items-center gap-2 py-[1px] text-[11px]"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={pooledSelected(
                                                                        f,
                                                                    ).includes(
                                                                        v,
                                                                    )}
                                                                    onChange={() =>
                                                                        toggleCustomFilterPooledValue(
                                                                            name,
                                                                            v,
                                                                        )
                                                                    }
                                                                    className="size-3 accent-[var(--brand)]"
                                                                />
                                                                <span className="truncate">
                                                                    {v}
                                                                </span>
                                                            </label>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="max-h-36 overflow-auto">
                                            {f.type === 'dropdown' && (
                                                <select
                                                    aria-label={`Valeur de la liste déroulante pour ${name}`}
                                                    value={
                                                        f.values.length
                                                            ? f.values[0]
                                                            : '__all__'
                                                    }
                                                    onChange={(e) => {
                                                        const v =
                                                            e.target.value;
                                                        setFilterValues(
                                                            f.column,
                                                            f.table,
                                                            v === '__all__'
                                                                ? []
                                                                : [v],
                                                        );
                                                    }}
                                                    className="mb-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                                                >
                                                    <option value="__all__">
                                                        (Tous)
                                                    </option>
                                                    {options.map((v) => (
                                                        <option
                                                            key={v}
                                                            value={v}
                                                        >
                                                            {v}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                            {f.type === 'dropdown'
                                                ? null
                                                : options.map((v) => (
                                                      <label
                                                          key={v}
                                                          className="flex items-center gap-2 py-[1px] text-[11px]"
                                                      >
                                                          <input
                                                              type="checkbox"
                                                              checked={f.values.includes(
                                                                  v,
                                                              )}
                                                              onChange={() =>
                                                                  toggleFilterValue(
                                                                      f.column,
                                                                      v,
                                                                      f.table,
                                                                  )
                                                              }
                                                              className="size-3 accent-[var(--brand)]"
                                                          />
                                                          <span className="truncate">
                                                              {v}
                                                          </span>
                                                      </label>
                                                  ))}
                                        </div>
                                    ))}
                                {diagnostics && (
                                    <div className="mt-2 text-[10px] text-muted-foreground">
                                        {diagnostics.affected} endpoint(s) ·
                                        direct{' '}
                                        {diagnostics.direct.toLocaleString()} ·
                                        contexte{' '}
                                        {diagnostics.propagated.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {mapFor && (
                <JoinMapDialog
                    filter={mapFor}
                    onClose={() => setMapFor(null)}
                />
            )}
        </div>
    );
}
