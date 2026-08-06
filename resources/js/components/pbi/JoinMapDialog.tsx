import { ChevronDown, Download, Eye, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { datasetToCsv, type ExportDataset } from '@/lib/pbi/exportData';
import {
    distinctValuesForTableColumn,
    isCustomFilter,
    type ReportFilter,
} from '@/lib/pbi/filters';
import { buildRelationMap } from '@/lib/pbi/relations';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';

export function JoinMapDialog({
    filter,
    onClose,
}: {
    filter: ReportFilter;
    onClose: () => void;
}) {
    const { tables, tableRows, graph } = usePbi();

    const sourceColumns = useMemo(() => {
        if (!isCustomFilter(filter)) {
            return filter.table && filter.column
                ? [{ table: filter.table, column: filter.column }]
                : [];
        }
        return (filter.columns ?? [])
            .filter((c) => c.table && c.column)
            .map((c) => ({ table: c.table!, column: c.column! }));
    }, [filter]);

    const [source, setSource] = useState(sourceColumns[0] ?? null);
    useEffect(() => {
        setSource(sourceColumns[0] ?? null);
    }, [sourceColumns]);

    const options = useMemo(
        () =>
            source
                ? distinctValuesForTableColumn(
                      tables,
                      source.table,
                      source.column,
                  )
                : [],
        [tables, source],
    );

    const initialValue = useMemo(() => {
        if (!source) return '';
        if (isCustomFilter(filter)) {
            const col = (filter.columns ?? []).find(
                (c) => c.table === source.table && c.column === source.column,
            );
            return col?.values?.[0] ?? '';
        }
        return filter.values[0] ?? '';
    }, [filter, source]);

    const [value, setValue] = useState(initialValue);
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const map = useMemo(() => {
        if (!source || !value) return null;
        return buildRelationMap(tables, tableRows, graph, {
            table: source.table,
            column: source.column,
            value,
        });
    }, [tables, tableRows, graph, source, value]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const renderedRecords = useMemo(
        () => [...(map?.nodes ?? [])].sort((a, b) => a.level - b.level),
        [map?.nodes],
    );

    const populatedNodes = useMemo(
        () =>
            renderedRecords.filter(
                (n) => (map?.records[n.table]?.length ?? 0) > 0,
            ),
        [renderedRecords, map?.records],
    );

    const emptyNodes = useMemo(
        () =>
            renderedRecords.filter(
                (n) => (map?.records[n.table]?.length ?? 0) === 0,
            ),
        [renderedRecords, map?.records],
    );

    const [searchByTable, setSearchByTable] = useState<Record<string, string>>(
        {},
    );

    const downloadCsv = (table: string, rows: Record<string, unknown>[]) => {
        const cols = rows[0] ? Object.keys(rows[0]) : [];
        const ds: ExportDataset = {
            title: table,
            columns: cols,
            rows: rows.map((r) => cols.map((c) => String(r[c] ?? ''))),
        };
        const blob = new Blob([datasetToCsv(ds)], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relations-${table}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border bg-panel px-4 py-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <Eye className="size-4 text-muted-foreground" />
                        Carte des relations
                        {source && (
                            <span className="font-mono text-xs text-muted-foreground">
                                {source.table}.{source.column}
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Fermer"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background/60 px-4 py-2 text-[11px]">
                    {sourceColumns.length > 1 && (
                        <label className="flex items-center gap-1">
                            <span className="text-muted-foreground">Clé</span>
                            <select
                                value={
                                    source
                                        ? `${source.table}\u0000${source.column}`
                                        : ''
                                }
                                onChange={(e) => {
                                    const [table, column] =
                                        e.target.value.split('\u0000');
                                    setSource({ table, column });
                                }}
                                className="rounded border border-border bg-background px-1 py-0.5"
                            >
                                {sourceColumns.map((c) => (
                                    <option
                                        key={`${c.table}\u0000${c.column}`}
                                        value={`${c.table}\u0000${c.column}`}
                                    >
                                        {c.table}.{c.column}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="flex items-center gap-1">
                        <span className="text-muted-foreground">Valeur</span>
                        {options.length > 8 ? (
                            <span className="relative">
                                <select
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    className="max-w-[300px] rounded border border-border bg-background px-1 py-0.5"
                                >
                                    {options.map((v) => (
                                        <option key={v} value={v}>
                                            {v}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute top-1/2 right-1 size-3 -translate-y-1/2 text-muted-foreground" />
                            </span>
                        ) : (
                            <span className="flex flex-wrap gap-1">
                                {options.map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setValue(v)}
                                        className={cn(
                                            'rounded border px-1.5 py-0.5',
                                            value === v
                                                ? 'border-brand bg-brand/10 text-foreground'
                                                : 'border-border bg-background text-muted-foreground hover:bg-accent',
                                        )}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </span>
                        )}
                    </label>
                    {map && (
                        <span className="ml-auto text-muted-foreground">
                            {map.nodes.length} table(s) ·{map.links.length}{' '}
                            relation(s)
                        </span>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    {!map ? (
                        <p className="p-6 text-center text-[12px] text-muted-foreground">
                            Sélectionnez une valeur pour explorer les relations.
                        </p>
                    ) : map.nodes.length === 0 ? (
                        <p className="p-6 text-center text-[12px] text-muted-foreground">
                            Aucune donnée pour cette clé.
                        </p>
                    ) : (
                        <>
                            <div className="border-t border-border px-4 py-3">
                                <h3 className="mb-2 text-[11px] font-semibold text-muted-foreground">
                                    Enregistrements liés
                                </h3>
                                <div className="space-y-3">
                                    {populatedNodes.map((node) => {
                                        const allRows =
                                            map.records[node.table] ?? [];
                                        const query = (
                                            searchByTable[node.table] ?? ''
                                        )
                                            .trim()
                                            .toLowerCase();
                                        const rows = query
                                            ? allRows.filter((r) =>
                                                  Object.values(r).some((v) =>
                                                      String(v ?? '')
                                                          .toLowerCase()
                                                          .includes(query),
                                                  ),
                                              )
                                            : allRows;
                                        const cols = rows[0]
                                            ? Object.keys(rows[0])
                                            : [];
                                        const joinSet = new Set(
                                            node.joinColumns,
                                        );
                                        return (
                                            <div
                                                key={node.table}
                                                className="rounded border border-border/70 bg-background/40"
                                            >
                                                <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-medium">
                                                    <span className="min-w-0">
                                                        {node.table}
                                                        <span className="ml-2 text-muted-foreground">
                                                            (saut {node.level})
                                                        </span>
                                                        {node.parent && (
                                                            <span className="ml-2 text-muted-foreground">
                                                                via{' '}
                                                                <span className="font-mono">
                                                                    {
                                                                        node
                                                                            .parent
                                                                            .columns
                                                                    }
                                                                </span>
                                                            </span>
                                                        )}
                                                    </span>
                                                    {node.edgeKind && (
                                                        <span
                                                            className={cn(
                                                                'shrink-0 rounded px-1 py-0.5 text-[9px]',
                                                                node.edgeKind ===
                                                                    'shared'
                                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                                    : 'bg-amber-500/10 text-amber-600',
                                                            )}
                                                            title={
                                                                node.edgeKind ===
                                                                'shared'
                                                                    ? 'Jointure confirmée par le schéma'
                                                                    : `Jointure inférée par chevauchement (confiance ${Math.round((node.edgeConfidence ?? 0) * 100)} %)`
                                                            }
                                                        >
                                                            {node.edgeKind ===
                                                            'shared'
                                                                ? 'Confirmé'
                                                                : `Inféré · ${Math.round((node.edgeConfidence ?? 0) * 100)} %`}
                                                        </span>
                                                    )}
                                                    <span className="ml-auto shrink-0 text-muted-foreground">
                                                        {allRows.length.toLocaleString()}{' '}
                                                        ligne(s)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 px-2 pb-1">
                                                    <Search className="size-3 text-muted-foreground" />
                                                    <input
                                                        value={
                                                            searchByTable[
                                                                node.table
                                                            ] ?? ''
                                                        }
                                                        onChange={(e) =>
                                                            setSearchByTable(
                                                                (s) => ({
                                                                    ...s,
                                                                    [node.table]:
                                                                        e.target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        placeholder="Filtrer…"
                                                        className="w-40 rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                                                    />
                                                    <button
                                                        onClick={() =>
                                                            downloadCsv(
                                                                node.table,
                                                                allRows,
                                                            )
                                                        }
                                                        title={`Exporter ${node.table} en CSV`}
                                                        className="ml-auto flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                                                    >
                                                        <Download className="size-3" />
                                                        CSV
                                                    </button>
                                                </div>
                                                <div className="max-h-44 overflow-auto">
                                                    <table className="w-full text-[10px]">
                                                        <thead className="sticky top-0 bg-panel">
                                                            <tr>
                                                                {cols.map(
                                                                    (c) => (
                                                                        <th
                                                                            key={
                                                                                c
                                                                            }
                                                                            className={cn(
                                                                                'border-b border-border px-2 py-1 text-left font-medium',
                                                                                joinSet.has(
                                                                                    c,
                                                                                )
                                                                                    ? 'text-brand'
                                                                                    : 'text-muted-foreground',
                                                                            )}
                                                                        >
                                                                            {c}
                                                                            {joinSet.has(
                                                                                c,
                                                                            ) && (
                                                                                <span className="ml-1 text-[8px] uppercase opacity-70">
                                                                                    clé
                                                                                </span>
                                                                            )}
                                                                        </th>
                                                                    ),
                                                                )}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {rows
                                                                .slice(0, 50)
                                                                .map((r, i) => (
                                                                    <tr
                                                                        key={i}
                                                                        className="border-b border-border/50"
                                                                    >
                                                                        {cols.map(
                                                                            (
                                                                                c,
                                                                            ) => (
                                                                                <td
                                                                                    key={
                                                                                        c
                                                                                    }
                                                                                    className={cn(
                                                                                        'px-2 py-0.5',
                                                                                        joinSet.has(
                                                                                            c,
                                                                                        ) &&
                                                                                            'font-medium text-brand',
                                                                                    )}
                                                                                >
                                                                                    {String(
                                                                                        r[
                                                                                            c
                                                                                        ] ??
                                                                                            '',
                                                                                    )}
                                                                                </td>
                                                                            ),
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {emptyNodes.length > 0 && (
                                        <div className="rounded border border-border/70 bg-background/40">
                                            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-medium">
                                                <span>Aucune donnée</span>
                                                <span className="text-muted-foreground">
                                                    {emptyNodes.length} table(s)
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 px-2 pb-2">
                                                {emptyNodes.map((node) => (
                                                    <span
                                                        key={node.table}
                                                        className={cn(
                                                            'rounded border px-1.5 py-0.5 text-[10px]',
                                                            node.emptyReason ===
                                                                'chain_break'
                                                                ? 'border-destructive/30 bg-destructive/5 text-destructive'
                                                                : 'border-border/60 text-muted-foreground',
                                                        )}
                                                        title={
                                                            node.emptyDetail ??
                                                            ''
                                                        }
                                                    >
                                                        {node.table}
                                                        <span className="ml-1 opacity-80">
                                                            (
                                                            {node.emptyDetail ??
                                                                `saut ${node.level}`}
                                                            )
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
