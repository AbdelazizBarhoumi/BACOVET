import { ChevronDown, ChevronRight, History, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LightDropdown, LightDropdownItem } from "@/components/LightDropdown";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { fetchAuditLogs, type AuditLogEntry, type PaginatedAuditLogs } from "@/services/dataMappingApi";

const PAGE_SIZES = [10, 25, 50, 100] as const;

const FIELD_LABELS: Record<string, string> = {
    kpi: "KPI",
    name: "Nom",
    variable: "Variable",
    endpoint: "Endpoint",
    variable_type: "Type",
    variable_key: "Clé JSON",
    is_filtered: "Filtre",
    filter_key: "Clé filtre",
    filter_value: "Valeur filtre",
    has_function: "Fonction",
    fn: "Aggrégation",
    modules: "Modules",
    formula: "Formule",
    highlight_color: "Couleur",
    cible_operator: "Opérateur cible",
    cible_value: "Valeur cible",
    cible_is_percentage: "Pourcentage",
    refresh_frequency: "Fréquence",
    user_id: "Utilisateur",
};

const ACTION_COLORS: Record<string, string> = {
    created: "text-green-500",
    updated: "text-blue-500",
    deleted: "text-red-500",
};

const ACTION_LABELS: Record<string, string> = {
    created: "Créé",
    updated: "Modifié",
    deleted: "Supprimé",
};

function formatValue(val: string | null, field: string): string {
    if (val === null || val === "") return "—";

    if (field === "is_filtered" || field === "has_function" || field === "cible_is_percentage") {
        return val === "1" || val === "true" ? "Oui" : "Non";
    }

    if (field === "modules") {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed.join(", ") || "—";
        } catch { /* fall through */ }
    }

    if (field === "formula") {
        try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
                return parsed.items
                    .map((item: { type: string; label?: string; op?: string; value?: number }) => {
                        if (item.type === "variable") return item.label ?? "?";
                        if (item.type === "operator") return item.op ?? "?";
                        if (item.type === "number") return String(item.value ?? "?");
                        return "?";
                    })
                    .join(" ");
            }
        } catch { /* fall through */ }
    }

    if (val.length > 80) return val.slice(0, 80) + "…";
    return val;
}

interface Props {
    refreshKey: number;
}

export default function DataMappingAuditLog({ refreshKey }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [data, setData] = useState<PaginatedAuditLogs | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [filterAction, setFilterAction] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchAuditLogs({
                page,
                per_page: perPage,
                action: filterAction && filterAction !== "__all__" ? filterAction : undefined,
            });
            setData(result);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [page, perPage, filterAction]);

    useEffect(() => {
        if (expanded) load();
    }, [expanded, load, refreshKey]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [filterAction, perPage]);

    const total = data?.total ?? 0;
    const lastPage = data?.last_page ?? 1;

    return (
        <div className="border-t border-border">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-secondary/50 transition-colors cursor-pointer"
            >
                {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <History className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
                    Journal des modifications
                </span>
                {total > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground/70 ml-1">
                        ({total})
                    </span>
                )}
            </button>

            {expanded && (
                <div className="px-4 pb-4">
                    {/* Filters */}
                    <div className="flex items-center gap-3 mb-3">
                        <LightDropdown
                            value={filterAction || undefined}
                            onValueChange={(v) => setFilterAction(v === "__all__" ? "" : v)}
                            className="h-7 min-w-[140px] text-[11px] font-mono"
                            placeholder="Toutes les actions"
                        >
                            <LightDropdownItem value="__all__">Toutes les actions</LightDropdownItem>
                            <LightDropdownItem value="created">Créé</LightDropdownItem>
                            <LightDropdownItem value="updated">Modifié</LightDropdownItem>
                            <LightDropdownItem value="deleted">Supprimé</LightDropdownItem>
                        </LightDropdown>

                        <LightDropdown
                            value={String(perPage)}
                            onValueChange={(v) => setPerPage(Number(v))}
                            className="h-7 min-w-[90px] text-[11px] font-mono"
                        >
                            {PAGE_SIZES.map((s) => (
                                <LightDropdownItem key={s} value={String(s)}>
                                    {s} / page
                                </LightDropdownItem>
                            ))}
                        </LightDropdown>

                        <div className="ml-auto text-[10px] font-mono text-muted-foreground">
                            {loading ? (
                                <span className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
                                </span>
                            ) : (
                                `${total} enregistrement${total !== 1 ? "s" : ""}`
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border border-border rounded-md overflow-auto max-h-[400px]">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                    <th className="px-2 py-1.5 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase w-12">#</th>
                                    <th className="px-2 py-1.5 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase w-28">Date</th>
                                    <th className="px-2 py-1.5 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase w-28">Utilisateur</th>
                                    <th className="px-2 py-1.5 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase w-20">KPI</th>
                                    <th className="px-2 py-1.5 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase w-20">Action</th>
                                    <th className="px-2 py-1.5 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase w-28">Champ</th>
                                    <th className="px-2 py-1.5 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Avant → Après</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loading && data?.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-2 py-8 text-center text-muted-foreground italic">
                                            Aucun enregistrement.
                                        </td>
                                    </tr>
                                )}
                                {data?.data.map((entry, i) => {
                                    const rowNum = (page - 1) * perPage + i + 1;
                                    const color = ACTION_COLORS[entry.action] ?? "text-muted-foreground";
                                    const date = new Date(entry.created_at);
                                    const dateStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
                                    const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

                                    return (
                                        <tr
                                            key={entry.id}
                                            className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                                        >
                                            <td className="px-2 py-1.5 font-mono text-muted-foreground">{rowNum}</td>
                                            <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                                                <span className="text-muted-foreground">{dateStr}</span>{" "}
                                                <span className="text-foreground/70">{timeStr}</span>
                                            </td>
                                            <td className="px-2 py-1.5 font-mono truncate max-w-[100px]">
                                                {entry.user?.name ?? "Système"}
                                            </td>
                                            <td className="px-2 py-1.5 font-mono text-foreground/80">
                                                {entry.kpi}
                                            </td>
                                            <td className={`px-2 py-1.5 font-mono font-bold ${color}`}>
                                                {ACTION_LABELS[entry.action] ?? entry.action}
                                            </td>
                                            <td className="px-2 py-1.5 font-mono text-foreground/70">
                                                {entry.action === "created" || entry.action === "deleted"
                                                    ? "—"
                                                    : (FIELD_LABELS[entry.field] ?? entry.field)}
                                            </td>
                                            <td className="px-2 py-1.5 font-mono">
                                                {entry.action === "created" ? (
                                                    <span className="text-green-500/80">{formatValue(entry.new_value, entry.field)}</span>
                                                ) : entry.action === "deleted" ? (
                                                    <span className="text-red-500/80 line-through">{formatValue(entry.old_value, entry.field)}</span>
                                                ) : (
                                                    <span>
                                                        <span className="text-red-500/70 line-through">{formatValue(entry.old_value, entry.field)}</span>
                                                        <span className="text-muted-foreground mx-1">→</span>
                                                        <span className="text-green-500/80">{formatValue(entry.new_value, entry.field)}</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {lastPage > 1 && (
                        <div className="mt-3">
                            <Pagination>
                                <PaginationContent className="gap-1">
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (page > 1) setPage(page - 1);
                                            }}
                                            className={page <= 1 ? "pointer-events-none opacity-40 h-7 text-[11px]" : "h-7 text-[11px]"}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: Math.min(lastPage, 7) }, (_, i) => {
                                        let pageNum: number;
                                        if (lastPage <= 7) {
                                            pageNum = i + 1;
                                        } else if (page <= 4) {
                                            pageNum = i + 1;
                                        } else if (page >= lastPage - 3) {
                                            pageNum = lastPage - 6 + i;
                                        } else {
                                            pageNum = page - 3 + i;
                                        }
                                        return (
                                            <PaginationItem key={pageNum}>
                                                <PaginationLink
                                                    href="#"
                                                    isActive={pageNum === page}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setPage(pageNum);
                                                    }}
                                                    className="h-7 w-7 text-[11px]"
                                                >
                                                    {pageNum}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    })}
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (page < lastPage) setPage(page + 1);
                                            }}
                                            className={page >= lastPage ? "pointer-events-none opacity-40 h-7 text-[11px]" : "h-7 text-[11px]"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
