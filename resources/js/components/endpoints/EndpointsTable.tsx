import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronRight as ChevronRightIcon,
    Copy,
    Eye,
    KeyRound,
    Pencil,
    RefreshCw,
    Server,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { extractRoot, isDefaultRoot, UNKNOWN_ROOT } from '@/lib/endpoint-roots';
import { cn } from '@/lib/utils';
import type {
    EndpointParameterView,
    EndpointSummary,
} from '@/services/endpointManagerApi';
import { RetryBadge } from './RetryBadge';
import { StatusBadge } from './StatusBadge';

const SOURCE_STYLES: Record<string, string> = {
    SDT: 'bg-sky-500/15 text-sky-500 border-sky-500/40',
    QCM: 'bg-violet-500/15 text-violet-500 border-violet-500/40',
    DIVATEX: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40',
    OTHER: 'bg-muted text-muted-foreground border-border',
};

function MethodBadge({ method }: { method: string }) {
    const isGet = method.toUpperCase() === 'GET';
    return (
        <span
            className={cn(
                'inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider',
                isGet
                    ? 'border-sky-500/40 bg-sky-500/15 text-sky-500'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-500',
            )}
        >
            {method.toUpperCase()}
        </span>
    );
}

function SourceBadge({ source }: { source: string }) {
    const style = SOURCE_STYLES[source] ?? SOURCE_STYLES.OTHER;
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase',
                style,
            )}
        >
            {source}
        </span>
    );
}

export function EndpointRow({
    item,
    refreshingId,
    showRoot,
    defaultRoot,
    onView,
    onEdit,
    onDuplicate,
    onDelete,
    onRefreshOne,
    onToggle,
    togglingId,
    onParameterChange,
    paramBusyId,
}: {
    item: EndpointSummary;
    refreshingId: string | null;
    showRoot: boolean;
    defaultRoot: string;
    onView: (item: EndpointSummary) => void;
    onEdit: (item: EndpointSummary) => void;
    onDuplicate: (item: EndpointSummary) => void;
    onDelete: (item: EndpointSummary) => void;
    onRefreshOne: (item: EndpointSummary) => void;
    onToggle: (item: EndpointSummary, disabled: boolean) => void;
    togglingId?: string | null;
    onParameterChange?: (
        item: EndpointSummary,
        parameter: EndpointParameterView,
        value: string,
    ) => void;
    paramBusyId?: string | null;
}) {
    const root = extractRoot(item.endpoint);
    const disabled = Boolean(item.disabled);
    const rootDisabled = Boolean(item.root_disabled);
    const parameters = item.parameters ?? [];
    const paramBusy = paramBusyId === item.id;

    return (
        <tr
            className={cn(
                'border-b border-border/50 hover:bg-muted/30',
                disabled && 'opacity-60',
            )}
        >
            <td className="max-w-[240px] px-3 py-2 text-xs font-semibold">
                <span className="block truncate" title={item.name}>
                    {item.name}
                </span>
                {disabled && (
                    <span className="mt-0.5 inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Désactivé
                    </span>
                )}
            </td>
            <td className="px-3">
                <MethodBadge method={item.method} />
            </td>
            <td className="max-w-[260px] px-3">
                <span
                    className="block truncate text-xs text-muted-foreground"
                    title={item.endpoint}
                >
                    {item.slug || item.endpoint}
                </span>
            </td>
            {showRoot && (
                <td className="max-w-[180px] px-3">
                    {(() => {
                        if (isDefaultRoot(root, defaultRoot)) {
                            return (
                                <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                                    Par défaut
                                </span>
                            );
                        }
                        return root ? (
                            <span
                                className="block truncate text-xs text-muted-foreground"
                                title={root}
                            >
                                {root}
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground/50">
                                —
                            </span>
                        );
                    })()}
                </td>
            )}
            <td className="px-3">
                <SourceBadge source={item.source} />
            </td>
            <td className="px-3">
                {parameters.length === 0 ? (
                    <span className="text-xs text-muted-foreground/50">—</span>
                ) : (
                    <div className="flex min-w-[150px] flex-col gap-1">
                        {parameters.map((parameter) => {
                            const options = parameter.values.includes(
                                parameter.selected,
                            )
                                ? parameter.values
                                : [...parameter.values, parameter.selected];
                            return (
                                <div
                                    key={parameter.name}
                                    className="flex items-center gap-1.5"
                                >
                                    <span className="shrink-0 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        {parameter.name}
                                    </span>
                                    <Select
                                        value={parameter.selected}
                                        disabled={
                                            paramBusy ||
                                            disabled ||
                                            rootDisabled
                                        }
                                        onValueChange={(value) =>
                                            onParameterChange?.(
                                                item,
                                                parameter,
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            className="h-6 w-[110px] px-2 font-mono text-[10px]"
                                            title="Changer la valeur du paramètre puis rafraîchir"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.map((value) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                    className="font-mono text-xs"
                                                >
                                                    {value}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            );
                        })}
                    </div>
                )}
            </td>
            <td className="px-3">
                <div className="flex items-center gap-1.5">
                    <StatusBadge status={item.status} />
                    {item.retry_pending && (
                        <RetryBadge attempts={item.consecutive_failures ?? 1} />
                    )}
                </div>
            </td>
            <td className="px-3 text-right text-xs tabular-nums">
                {item.row_count}
            </td>
            <td className="px-3">
                <div className="flex items-center justify-center">
                    <Switch
                        checked={!disabled}
                        disabled={togglingId === item.id || rootDisabled}
                        onCheckedChange={(checked) => onToggle(item, !checked)}
                        title={
                            rootDisabled
                                ? 'Racine désactivée — réactivez la racine pour activer ses endpoints'
                                : disabled
                                  ? 'Réactiver cet endpoint'
                                  : 'Désactiver cet endpoint'
                        }
                    />
                </div>
            </td>
            <td className="px-3 text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title={
                            disabled
                                ? 'Endpoint désactivé — réactiver pour rafraîchir'
                                : 'Rafraîchir cet endpoint maintenant'
                        }
                        disabled={refreshingId === item.id || disabled}
                        onClick={() => onRefreshOne(item)}
                    >
                        <RefreshCw
                            className={cn(
                                'h-3 w-3',
                                refreshingId === item.id && 'animate-spin',
                            )}
                        />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="Voir les détails"
                        onClick={() => onView(item)}
                    >
                        <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="Modifier"
                        onClick={() => onEdit(item)}
                    >
                        <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="Dupliquer"
                        onClick={() => onDuplicate(item)}
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:text-destructive"
                        title="Supprimer"
                        onClick={() => onDelete(item)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

function TableHead({ showRoot }: { showRoot: boolean }) {
    return (
        <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            <th className="px-3 py-2 text-left">Nom</th>
            <th className="px-3 py-2 text-left">Méthode</th>
            <th className="px-3 py-2 text-left">Endpoint</th>
            {showRoot && <th className="px-3 py-2 text-left">Racine</th>}
            <th className="px-3 py-2 text-left">Source</th>
            <th className="px-3 py-2 text-left">Paramètres</th>
            <th className="px-3 py-2 text-left">Statut</th>
            <th className="px-3 py-2 text-right">Lignes</th>
            <th className="px-3 py-2 text-center">Actif</th>
            <th className="px-3 py-2 text-right">Actions</th>
        </tr>
    );
}

function Pagination({
    page,
    perPage,
    total,
    onPageChange,
}: {
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = total === 0 ? 0 : (page - 1) * perPage + 1;
    const to = Math.min(total, page * perPage);

    return (
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            <span>
                Affichage de {from}–{to} sur {total} endpoints
            </span>
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="h-3 w-3" />
                </Button>
                <span>
                    {page} / {totalPages}
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    <ChevronRight className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

export function EndpointsTable({
    items,
    loading,
    onView,
    onEdit,
    onDuplicate,
    onDelete,
    onRefreshOne,
    onToggle,
    togglingId,
    refreshingId,
    page,
    perPage,
    total,
    onPageChange,
    defaultRoot,
    onParameterChange,
    paramBusyId,
}: {
    items: EndpointSummary[];
    loading: boolean;
    onView: (item: EndpointSummary) => void;
    onEdit: (item: EndpointSummary) => void;
    onDuplicate: (item: EndpointSummary) => void;
    onDelete: (item: EndpointSummary) => void;
    onRefreshOne: (item: EndpointSummary) => void;
    onToggle: (item: EndpointSummary, disabled: boolean) => void;
    togglingId?: string | null;
    refreshingId: string | null;
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
    defaultRoot: string;
    onParameterChange?: (
        item: EndpointSummary,
        parameter: EndpointParameterView,
        value: string,
    ) => void;
    paramBusyId?: string | null;
}) {
    return (
        <div>
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 py-2">
                            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                            <div className="h-7 w-24 animate-pulse rounded bg-muted" />
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                    Aucun endpoint ne correspond aux filtres actuels.
                </div>
            ) : (
                <div className="max-h-[560px] overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                            <TableHead showRoot />
                        </thead>
                        <tbody className="font-mono">
                            {items.map((item) => (
                                <EndpointRow
                                    key={item.id}
                                    item={item}
                                    refreshingId={refreshingId}
                                    showRoot
                                    defaultRoot={defaultRoot}
                                    onView={onView}
                                    onEdit={onEdit}
                                    onDuplicate={onDuplicate}
                                    onDelete={onDelete}
                                    onRefreshOne={onRefreshOne}
                                    onToggle={onToggle}
                                    togglingId={togglingId}
                                    onParameterChange={onParameterChange}
                                    paramBusyId={paramBusyId}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination
                page={page}
                perPage={perPage}
                total={total}
                onPageChange={onPageChange}
            />
        </div>
    );
}

/**
 * Folder-style grouped display keyed by the endpoint root.
 */
export function GroupedEndpointsTable({
    items,
    loading,
    onView,
    onEdit,
    onDuplicate,
    onDelete,
    onRefreshOne,
    onToggle,
    onToggleRoot,
    togglingRoot,
    disabledRoots = [],
    togglingId,
    refreshingId,
    page,
    perPage,
    total,
    onPageChange,
    defaultRoot,
    onOpenKeys,
    onParameterChange,
    paramBusyId,
}: {
    items: EndpointSummary[];
    loading: boolean;
    onView: (item: EndpointSummary) => void;
    onEdit: (item: EndpointSummary) => void;
    onDuplicate: (item: EndpointSummary) => void;
    onDelete: (item: EndpointSummary) => void;
    onRefreshOne: (item: EndpointSummary) => void;
    onToggle: (item: EndpointSummary, disabled: boolean) => void;
    onToggleRoot?: (root: string, disabled: boolean) => void;
    togglingRoot?: string | null;
    disabledRoots?: string[];
    togglingId?: string | null;
    refreshingId: string | null;
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
    defaultRoot: string;
    onOpenKeys?: (root: string) => void;
    onParameterChange?: (
        item: EndpointSummary,
        parameter: EndpointParameterView,
        value: string,
    ) => void;
    paramBusyId?: string | null;
}) {
    const groups = useMemo(() => {
        const folders = new Map<string, EndpointSummary[]>();
        for (const item of items) {
            const key = extractRoot(item.endpoint) || UNKNOWN_ROOT;
            const list = folders.get(key) ?? [];
            list.push(item);
            folders.set(key, list);
        }
        return [...folders.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [items]);

    const disabledRootSet = new Set(disabledRoots);
    const [open, setOpen] = useState<Record<string, boolean>>({});

    const toggle = (key: string) => {
        setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div>
            {loading ? (
                <div className="space-y-2 py-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-10 animate-pulse rounded border bg-muted/40"
                        />
                    ))}
                </div>
            ) : groups.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                    Aucun endpoint ne correspond aux filtres actuels.
                </div>
            ) : (
                <div className="max-h-[560px] overflow-auto">
                    {groups.map(([key, list]) => {
                        const isOpen = open[key] ?? true;
                        const rootDisabled =
                            key !== UNKNOWN_ROOT && disabledRootSet.has(key);
                        return (
                            <div
                                key={key}
                                className="border-b border-border/40"
                            >
                                <button
                                    type="button"
                                    onClick={() => toggle(key)}
                                    className={cn(
                                        'flex w-full items-center gap-2 border-b border-border/40 bg-muted/30 px-3 py-2 text-left hover:bg-muted/50',
                                        rootDisabled && 'opacity-60',
                                    )}
                                >
                                    {isOpen ? (
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    ) : (
                                        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    )}
                                    <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="truncate font-mono text-[11px] font-semibold">
                                        {key}
                                    </span>
                                    {key !== UNKNOWN_ROOT && (
                                        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                                            {isDefaultRoot(key, defaultRoot)
                                                ? 'Par défaut'
                                                : key}
                                        </span>
                                    )}
                                    {rootDisabled && (
                                        <span className="shrink-0 rounded bg-destructive/10 px-1 font-mono text-[9px] font-bold tracking-wider text-destructive uppercase">
                                            Off
                                        </span>
                                    )}
                                    <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                        {list.length}
                                    </span>
                                    {key !== UNKNOWN_ROOT && onToggleRoot && (
                                        <Switch
                                            checked={!rootDisabled}
                                            disabled={togglingRoot === key}
                                            onCheckedChange={(checked) =>
                                                onToggleRoot(key, !checked)
                                            }
                                            title={
                                                rootDisabled
                                                    ? 'Réactiver toute la racine'
                                                    : 'Désactiver toute la racine'
                                            }
                                        />
                                    )}
                                    {key !== UNKNOWN_ROOT && onOpenKeys && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            title="Gérer la clé API de cette racine"
                                            className="ml-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground ring-1 ring-border/60 hover:bg-foreground/10 hover:text-warning"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenKeys(key);
                                            }}
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === 'Enter' ||
                                                    e.key === ' '
                                                ) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onOpenKeys(key);
                                                }
                                            }}
                                        >
                                            <KeyRound className="h-3 w-3" />
                                        </span>
                                    )}
                                </button>
                                {isOpen && (
                                    <table className="w-full text-sm">
                                        <thead className="bg-background">
                                            <TableHead showRoot={false} />
                                        </thead>
                                        <tbody className="font-mono">
                                            {list.map((item) => (
                                                <EndpointRow
                                                    key={item.id}
                                                    item={item}
                                                    refreshingId={refreshingId}
                                                    showRoot={false}
                                                    defaultRoot={defaultRoot}
                                                    onView={onView}
                                                    onEdit={onEdit}
                                                    onDuplicate={onDuplicate}
                                                    onDelete={onDelete}
                                                    onRefreshOne={onRefreshOne}
                                                    onToggle={onToggle}
                                                    togglingId={togglingId}
                                                    onParameterChange={
                                                        onParameterChange
                                                    }
                                                    paramBusyId={paramBusyId}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <Pagination
                page={page}
                perPage={perPage}
                total={total}
                onPageChange={onPageChange}
            />
        </div>
    );
}
