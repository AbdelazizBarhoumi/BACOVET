import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Loader2, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UserOption = { id: number; name: string; matricule?: string };
type PageOption = { id: number; slug: string; name: string };

type ActivityRow = {
  id: number;
  user: { id: number; name: string; matricule?: string } | null;
  page_id: number | null;
  page_slug: string | null;
  page_name: string | null;
  widget_id: string | null;
  widget_type: string | null;
  kpi_code: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

type ActivityResponse = {
  data: ActivityRow[];
  current_page: number;
  last_page: number;
  total: number;
};

const WIDGET_TYPES = ["kpi", "gauge", "sparkline", "line", "bar", "pareto", "donut", "pie", "radar", "area", "combo", "table", "table-grid", "text", "divider"];

const ACTION_LABELS: Record<string, string> = {
  "page.create": "Page créée",
  "page.update": "Page modifiée",
  "page.delete": "Page supprimée",
  "page.duplicate": "Page dupliquée",
  "page.view": "Page consultée",
  "widget.add": "Widget ajouté",
  "widget.move": "Widget déplacé",
  "widget.resize": "Widget redimensionné",
  "widget.config": "Widget configuré",
  "widget.type_change": "Type changé",
  "widget.delete": "Widget supprimé",
  "widget.duplicate": "Widget dupliqué",
  "widget.lock": "Widget verrouillé",
  "widget.unlock": "Widget déverrouillé",
  "widget.z_front": "Widget au 1er plan",
  "widget.z_back": "Widget à l'arrière-plan",
  "layout.save": "Layout sauvegardé",
  "layout.reset": "Layout réinitialisé",
  "layout.export": "Layout exporté",
  "layout.import": "Layout importé",
  "undo": "Annulation",
  "redo": "Rétablissement",
  "table.cell.edit": "Cellule modifiée",
  "table.row.add": "Ligne ajoutée",
  "table.col.add": "Colonne ajoutée",
  "table.row.delete": "Ligne supprimée",
  "table.col.delete": "Colonne supprimée",
  "table.row.move": "Ligne déplacée",
  "table.col.move": "Colonne déplacée",
  "table.merge": "Cellules fusionnées",
  "table.unmerge": "Cellules séparées",
  "table.resize": "Tableau redimensionné",
  "table.copy": "Copie de cellules",
  "table.paste": "Collage de cellules",
  "table.cut": "Couper des cellules",
  "kpi.refresh": "Données KPI actualisées",
  "kpi.detail_view": "Détail KPI consulté",
  "group.create": "Groupe créé",
  "group.update": "Groupe modifié",
  "group.delete": "Groupe supprimé",
  "group.assign_page": "Page assignée",
  "group.reorder_pages": "Pages réordonnées",
  "group.reorder_groups": "Groupes réordonnés",
  "mode.edit": "Passage en édition",
  "mode.view": "Passage en vue",
};

const ACTIONS = Object.keys(ACTION_LABELS).sort();

function actionColor(action: string): string {
  if (action.startsWith("page.delete") || action.startsWith("widget.delete")) return "destructive";
  if (action.startsWith("page.create") || action.startsWith("widget.add") || action.startsWith("layout.save")) return "default";
  if (action.startsWith("page.view") || action.startsWith("kpi.")) return "secondary";
  if (action.startsWith("group.")) return "outline";
  return "outline";
}

function formatDetail(detail: Record<string, unknown> | null): string {
  if (!detail || Object.keys(detail).length === 0) return "";
  const parts = Object.entries(detail).map(([k, v]) => {
    const str = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `${k}=${str.length > 80 ? str.slice(0, 80) + "…" : str}`;
  });
  return parts.join(" · ");
}

export default function V3TracePage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [pages, setPages] = useState<PageOption[]>([]);

  const [filters, setFilters] = useState({
    user_id: "none",
    page_id: "none",
    action: "none",
    widget_type: "none",
    from: "",
    to: "",
    q: "",
  });
  const [live, setLive] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (targetPage: number, appliedFilters = filters, quiet = false) => {
    if (!quiet) setLoading(true);
    const params = new URLSearchParams({ per_page: "50", page: String(targetPage) });
    if (appliedFilters.user_id !== "none") params.set("user_id", appliedFilters.user_id);
    if (appliedFilters.page_id !== "none") params.set("page_id", appliedFilters.page_id);
    if (appliedFilters.action !== "none") params.set("action", appliedFilters.action);
    if (appliedFilters.widget_type !== "none") params.set("widget_type", appliedFilters.widget_type);
    if (appliedFilters.from) params.set("from", appliedFilters.from);
    if (appliedFilters.to) params.set("to", appliedFilters.to);
    if (appliedFilters.q) params.set("q", appliedFilters.q);
    try {
      const res = await fetch(`/api/builder-activity?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const data: ActivityResponse = await res.json();
      setRows(data.data);
      setPage(data.current_page);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch {
      if (!quiet) toast.error("Erreur lors du chargement de la traçabilité");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load(1, filters, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live) return;
    timerRef.current = setInterval(() => load(page, filters, true), 10_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [live, page, filters, load]);

  useEffect(() => {
    fetch("/admin/users", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: UserOption[]) => setUsers(list))
      .catch(() => {});
    fetch("/api/builder-pages", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: PageOption[]) => setPages(list))
      .catch(() => {});
  }, []);

  const apply = () => load(1, filters, false);
  const reset = () => {
    setFilters({ user_id: "none", page_id: "none", action: "none", widget_type: "none", from: "", to: "", q: "" });
    load(1, { user_id: "none", page_id: "none", action: "none", widget_type: "none", from: "", to: "", q: "" }, false);
  };

  const setFilter = (key: keyof typeof filters, value: string) => setFilters((p) => ({ ...p, [key]: value }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head title="Traçabilité V3 — BACOVET" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Traçabilité — Pages Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Qui a touché quoi, sur quelle page, quel widget/KPI et quand.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setLive((v) => !v)} className="h-8 text-xs uppercase tracking-wider">
              <RefreshCw className={`h-3 w-3 mr-1 ${live ? "text-primary" : ""}`} />
              {live ? "Live" : "Pause"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => load(page, filters, false)} className="h-8 text-xs uppercase tracking-wider" disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Actualiser
            </Button>
            <Link href="/v3">
              <Button size="sm" variant="ghost" className="h-8 text-xs uppercase tracking-wider">
                <ArrowLeft className="h-3 w-3 mr-1" /> Pages
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 mb-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <div className="col-span-2 xl:col-span-1">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Utilisateur</Label>
            <Select value={filters.user_id} onValueChange={(v) => setFilter("user_id", v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tous</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 xl:col-span-1">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Page</Label>
            <Select value={filters.page_id} onValueChange={(v) => setFilter("page_id", v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Toutes</SelectItem>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 xl:col-span-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Action</Label>
            <Select value={filters.action} onValueChange={(v) => setFilter("action", v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">Toutes</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 xl:col-span-1">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Widget</Label>
            <Select value={filters.widget_type} onValueChange={(v) => setFilter("widget_type", v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tous</SelectItem>
                {WIDGET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Du</Label>
            <Input type="datetime-local" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Au</Label>
            <Input type="datetime-local" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="col-span-2 xl:col-span-1">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Recherche</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={filters.q} onChange={(e) => setFilter("q", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && apply()}
                placeholder="page, KPI, user…" className="h-8 text-xs pl-7" />
            </div>
          </div>
          <div className="col-span-2 xl:col-span-1 flex items-end gap-1.5">
            <Button size="sm" className="h-8 text-xs uppercase tracking-wider flex-1" onClick={apply} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
              Filtrer
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={reset} title="Réinitialiser">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {total} événement(s) — page {page}/{lastPage || 1}
            </div>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap w-44">Heure</TableHead>
                  <TableHead className="whitespace-nowrap">Utilisateur</TableHead>
                  <TableHead className="whitespace-nowrap">Action</TableHead>
                  <TableHead className="whitespace-nowrap">Page</TableHead>
                  <TableHead className="whitespace-nowrap">Widget</TableHead>
                  <TableHead className="whitespace-nowrap">KPI</TableHead>
                  <TableHead>Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                      Aucun événement enregistré.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-medium">
                      {r.user ? r.user.name : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={actionColor(r.action) as "default" | "destructive" | "secondary" | "outline"} className="text-[10px] font-medium">
                        {ACTION_LABELS[r.action] ?? r.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.page_name ? (
                        <span>
                          {r.page_name}
                          {r.page_slug && <span className="ml-1 font-mono text-[10px] text-muted-foreground">/p/{r.page_slug}</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.widget_type ? (
                        <span className="font-mono text-[11px]">{r.widget_type}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.kpi_code ? <span className="font-mono text-[10px] text-primary">{r.kpi_code}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-[11px] text-muted-foreground" title={formatDetail(r.detail)}>
                      {formatDetail(r.detail) || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-border">
            <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={page <= 1 || loading} onClick={() => load(page - 1, filters, false)}>
              Précédent
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={page >= lastPage || loading} onClick={() => load(page + 1, filters, false)}>
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
