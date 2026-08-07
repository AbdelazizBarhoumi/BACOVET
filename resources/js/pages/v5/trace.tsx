import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Loader2, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type UserOption = { id: number; name: string; role?: string };
type PageOption = { id: number; slug: string; name: string };

type ActivityRow = {
    id: number;
    user: { id: number; name: string; role?: string } | null;
    page_id: number | null;
    page_slug: string | null;
    page_name: string | null;
    widget_id: string | null;
    widget_type: string | null;
    kpi_code: string | null;
    action: string;
    detail: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
};

type ActivityResponse = {
    data: ActivityRow[];
    current_page: number;
    last_page: number;
    total: number;
};

const WIDGET_TYPES = [
    'text',
    'image',
    'button',
    'kpi',
    'gauge',
    'line',
    'bar',
    'column',
    'area',
    'combo',
    'donut',
    'pie',
    'table',
    'slicer',
    'shape',
];

const ACTION_LABELS: Record<string, string> = {
    'page.create': 'Page créée',
    'page.update': 'Page modifiée',
    'page.delete': 'Page supprimée',
    'page.duplicate': 'Page dupliquée',
    'page.view': 'Page consultée',
    'widget.add': 'Widget ajouté',
    'widget.delete': 'Widget supprimé',
    'widget.duplicate': 'Widget dupliqué',
    'layout.save': 'Layout sauvegardé',
    'layout.checkpoint': 'Brouillon sauvegardé',
    'layout.discard': 'Brouillon abandonné',
    'group.create': 'Groupe créé',
    'group.update': 'Groupe modifié',
    'group.delete': 'Groupe supprimé',
    'group.assign_page': 'Page assignée',
    'group.reorder_pages': 'Pages réordonnées',
    'group.reorder_groups': 'Groupes réordonnés',
    'measure.create': 'Mesure créée',
    'measure.update': 'Mesure modifiée',
    'measure.delete': 'Mesure supprimée',
};

const ACTIONS = Object.keys(ACTION_LABELS).sort();

function actionColor(
    action: string,
): 'default' | 'destructive' | 'secondary' | 'outline' {
    if (action.startsWith('page.delete') || action.startsWith('widget.delete'))
        return 'destructive';
    if (
        action.startsWith('page.create') ||
        action.startsWith('widget.add') ||
        action.startsWith('layout.save')
    )
        return 'default';
    if (
        action.startsWith('page.view') ||
        action.startsWith('watch') ||
        action.startsWith('group.')
    )
        return 'secondary';
    return 'outline';
}

function formatDetail(detail: Record<string, unknown> | null): string {
    if (!detail || Object.keys(detail).length === 0) return '';
    const parts = Object.entries(detail).map(([k, v]) => {
        const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `${k}=${str.length > 80 ? str.slice(0, 80) + '…' : str}`;
    });
    return parts.join(' · ');
}

export default function V5TracePage() {
    const [rows, setRows] = useState<ActivityRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [pages, setPages] = useState<PageOption[]>([]);

    const [filters, setFilters] = useState({
        user_id: 'none',
        page_id: 'none',
        action: 'none',
        widget_type: 'none',
        from: '',
        to: '',
        q: '',
    });
    const [live, setLive] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const load = useCallback(
        async (targetPage: number, appliedFilters = filters, quiet = false) => {
            if (!quiet) setLoading(true);
            const params = new URLSearchParams({
                per_page: '50',
                page: String(targetPage),
            });
            if (appliedFilters.user_id !== 'none')
                params.set('user_id', appliedFilters.user_id);
            if (appliedFilters.page_id !== 'none')
                params.set('page_id', appliedFilters.page_id);
            if (appliedFilters.action !== 'none')
                params.set('action', appliedFilters.action);
            if (appliedFilters.widget_type !== 'none')
                params.set('widget_type', appliedFilters.widget_type);
            if (appliedFilters.from) params.set('from', appliedFilters.from);
            if (appliedFilters.to) params.set('to', appliedFilters.to);
            if (appliedFilters.q) params.set('q', appliedFilters.q);
            try {
                const res = await fetch(`/api/v5-activity?${params}`, {
                    credentials: 'include',
                });
                if (res.status === 403) {
                    toast.error('Accès refusé : réservé aux superadmins.');
                    return;
                }
                if (!res.ok) throw new Error(String(res.status));
                const data: ActivityResponse = await res.json();
                setRows(data.data);
                setPage(data.current_page);
                setLastPage(data.last_page);
                setTotal(data.total);
            } catch {
                if (!quiet) toast.error('Erreur lors du chargement de la traçabilité');
            } finally {
                setLoading(false);
            }
        },
        [filters],
    );

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
        fetch('/api/v5-activity/users', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : []))
            .then((list: UserOption[]) => setUsers(list))
            .catch(() => {});
        fetch('/api/v5/builder-pages', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : []))
            .then((list: PageOption[]) => setPages(list))
            .catch(() => {});
    }, []);

    const apply = () => load(1, filters, false);
    const reset = () => {
        const empty = {
            user_id: 'none',
            page_id: 'none',
            action: 'none',
            widget_type: 'none',
            from: '',
            to: '',
            q: '',
        };
        setFilters(empty);
        load(1, empty, false);
    };

    const setFilter = (key: keyof typeof filters, value: string) =>
        setFilters((p) => ({ ...p, [key]: value }));

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Traçabilité V5 — BACOVET" />
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">
                            Traçabilité — Constructeur de pages
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Qui a touché quoi, sur quelle page, quel widget/KPI,
                            quand et depuis où.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLive((v) => !v)}
                            className="h-8 text-xs uppercase tracking-wider"
                        >
                            <RefreshCw
                                className={`mr-1 h-3 w-3 ${live ? 'text-primary' : ''}`}
                            />
                            {live ? 'En direct' : 'Pause'}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => load(page, filters, false)}
                            className="h-8 text-xs uppercase tracking-wider"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-1 h-3 w-3" />
                            )}
                            Actualiser
                        </Button>
                        <Link href="/v5">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs uppercase tracking-wider"
                            >
                                <ArrowLeft className="mr-1 h-3 w-3" /> Pages
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4 xl:grid-cols-8">
                    <div className="col-span-2 xl:col-span-1">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Utilisateur
                        </Label>
                        <Select
                            value={filters.user_id}
                            onValueChange={(v) => setFilter('user_id', v)}
                        >
                            <SelectTrigger className="mt-1 h-8 text-xs">
                                <SelectValue placeholder="Tous" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Tous</SelectItem>
                                {users.map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                        {u.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2 xl:col-span-1">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Page
                        </Label>
                        <Select
                            value={filters.page_id}
                            onValueChange={(v) => setFilter('page_id', v)}
                        >
                            <SelectTrigger className="mt-1 h-8 text-xs">
                                <SelectValue placeholder="Toutes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Toutes</SelectItem>
                                {pages.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2 xl:col-span-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Action
                        </Label>
                        <Select
                            value={filters.action}
                            onValueChange={(v) => setFilter('action', v)}
                        >
                            <SelectTrigger className="mt-1 h-8 text-xs">
                                <SelectValue placeholder="Toutes" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                                <SelectItem value="none">Toutes</SelectItem>
                                {ACTIONS.map((a) => (
                                    <SelectItem key={a} value={a}>
                                        {ACTION_LABELS[a]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2 xl:col-span-1">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Widget
                        </Label>
                        <Select
                            value={filters.widget_type}
                            onValueChange={(v) => setFilter('widget_type', v)}
                        >
                            <SelectTrigger className="mt-1 h-8 text-xs">
                                <SelectValue placeholder="Tous" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Tous</SelectItem>
                                {WIDGET_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Du
                        </Label>
                        <Input
                            type="datetime-local"
                            value={filters.from}
                            onChange={(e) => setFilter('from', e.target.value)}
                            className="mt-1 h-8 text-xs"
                        />
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Au
                        </Label>
                        <Input
                            type="datetime-local"
                            value={filters.to}
                            onChange={(e) => setFilter('to', e.target.value)}
                            className="mt-1 h-8 text-xs"
                        />
                    </div>
                    <div className="col-span-2 xl:col-span-1">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Recherche
                        </Label>
                        <div className="relative mt-1">
                            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={filters.q}
                                onChange={(e) => setFilter('q', e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && apply()}
                                placeholder="page, KPI, utilisateur…"
                                className="h-8 pl-7 text-xs"
                            />
                        </div>
                    </div>
                    <div className="col-span-2 flex items-end gap-1.5 xl:col-span-1">
                        <Button
                            size="sm"
                            className="h-8 flex-1 text-xs uppercase tracking-wider"
                            onClick={apply}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                                <Search className="mr-1 h-3 w-3" />
                            )}
                            Filtrer
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={reset}
                            title="Réinitialiser"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-4 py-2">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {total} événement(s) — page {page}/{lastPage || 1}
                        </div>
                        {loading && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-40 whitespace-nowrap">
                                        Heure
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Utilisateur
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Action
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Page
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Widget
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        KPI
                                    </TableHead>
                                    <TableHead>Détail</TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Depuis (IP)
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="py-10 text-center text-sm text-muted-foreground"
                                        >
                                            Aucun événement enregistré.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {rows.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                                            {new Date(r.created_at).toLocaleString(
                                                'fr-FR',
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-xs font-medium">
                                            {r.user ? (
                                                <span>
                                                    {r.user.name}
                                                    {r.user.role && (
                                                        <span className="ml-1 text-[10px] text-muted-foreground">
                                                            ({r.user.role})
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <Badge
                                                variant={actionColor(r.action)}
                                                className="text-[10px] font-medium"
                                            >
                                                {ACTION_LABELS[r.action] ?? r.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-xs">
                                            {r.page_name ? (
                                                <span>
                                                    {r.page_name}
                                                    {r.page_slug && (
                                                        <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                                                            /p/{r.page_slug}
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-xs">
                                            {r.widget_type ? (
                                                <span className="font-mono text-[11px]">
                                                    {r.widget_type}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-xs">
                                            {r.kpi_code ? (
                                                <span className="font-mono text-[10px] text-primary">
                                                    {r.kpi_code}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className="max-w-md truncate text-[11px] text-muted-foreground"
                                            title={formatDetail(r.detail)}
                                        >
                                            {formatDetail(r.detail) || (
                                                <span className="text-muted-foreground/50">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                                            {r.ip_address || (
                                                <span className="text-muted-foreground/50">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            disabled={page <= 1 || loading}
                            onClick={() => load(page - 1, filters, false)}
                        >
                            Précédent
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            disabled={page >= lastPage || loading}
                            onClick={() => load(page + 1, filters, false)}
                        >
                            Suivant
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}