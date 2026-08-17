import { Check, ListFilter, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { usePbi } from '@/lib/pbi/store';
import {
    fetchDashboardParameters,
    type DashboardParameter,
} from '@/services/dashboardParametersApi';

type Props = {
    open: boolean;
    onClose: () => void;
};

export function ParametersDialog({ open, onClose }: Props) {
    const { tables, parameters, activePageId, addParameter, removeParameter } =
        usePbi();
    const [items, setItems] = useState<DashboardParameter[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reportSlugs = new Set(
        tables
            .map((t) => t.slug)
            .filter(
                (slug): slug is string =>
                    typeof slug === 'string' && slug !== '',
            ),
    );

    const usedInReport = (item: DashboardParameter) =>
        item.affected_slugs.some((slug) => reportSlugs.has(slug));

    const addedKeys = new Set(
        parameters
            .filter((p) => p.pageId === activePageId)
            .map((p) => `${p.root}::${p.name}`),
    );

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDashboardParameters();
            setItems(data);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Échec du chargement',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => void load(), 0);
        return () => clearTimeout(timer);
    }, [open]);

    const visible = items.filter(usedInReport);
    const hiddenCount = items.length - visible.length;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListFilter className="h-4 w-4" /> Paramètres
                    </DialogTitle>
                    <DialogDescription>
                        Chaque paramètre agit sur les endpoints (datasets) du
                        rapport qui l'utilisent. Ajoutez-le, puis choisissez sa
                        valeur dans le volet Filtres : les données se rechargent
                        depuis la valeur déjà synchronisée.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[55vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement des paramètres…
                        </div>
                    ) : error != null ? (
                        <div className="flex flex-col items-center gap-2 py-10">
                            <p className="text-sm text-destructive">{error}</p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void load()}
                            >
                                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                Réessayer
                            </Button>
                        </div>
                    ) : visible.length === 0 ? (
                        <p className="py-12 text-center text-xs text-muted-foreground">
                            {items.length === 0
                                ? 'Aucun paramètre déclaré. Définissez des paramètres par racine (chaine, …) dans la gestion des endpoints.'
                                : 'Aucun paramètre déclaré n’est utilisé par les datasets de ce rapport.'}
                        </p>
                    ) : (
                        <div className="divide-y divide-border">
                            {visible.map((item) => {
                                const key = `${item.root}::${item.name}`;
                                const added = addedKeys.has(key);
                                return (
                                    <div
                                        key={key}
                                        className="space-y-2 py-3 first:pt-0 last:pb-0"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[11px] font-bold uppercase">
                                                        {item.name}
                                                    </span>
                                                    {added && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                                                            <Check className="h-3 w-3" />{' '}
                                                            Ajouté
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="truncate text-[10px] text-muted-foreground">
                                                    {item.root}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={
                                                    added ? 'ghost' : 'outline'
                                                }
                                                className={
                                                    added
                                                        ? 'h-7 shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase'
                                                        : 'h-7 shrink-0 font-mono text-[10px] tracking-wider uppercase'
                                                }
                                                onClick={() => {
                                                    if (added) {
                                                        const existing =
                                                            parameters.find(
                                                                (p) =>
                                                                    p.pageId ===
                                                                        activePageId &&
                                                                    p.root ===
                                                                        item.root &&
                                                                    p.name ===
                                                                        item.name,
                                                            );
                                                        if (existing) {
                                                            removeParameter(
                                                                existing.id,
                                                            );
                                                            toast.success(
                                                                `« ${item.name} » retiré du rapport`,
                                                            );
                                                        }
                                                        return;
                                                    }
                                                    addParameter({
                                                        root: item.root,
                                                        name: item.name,
                                                        values: item.values,
                                                        value:
                                                            item.current ??
                                                            null,
                                                    });
                                                    toast.success(
                                                        `« ${item.name} » ajouté — choisissez sa valeur dans le volet Filtres`,
                                                    );
                                                }}
                                            >
                                                {added ? (
                                                    <>
                                                        <X className="mr-1 h-3 w-3" />{' '}
                                                        Retirer
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="mr-1 h-3 w-3" />{' '}
                                                        Ajouter
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {item.values.map((value) => (
                                                <span
                                                    key={value}
                                                    className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                                >
                                                    {value}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {item.affected_slugs.filter(
                                                (slug) => reportSlugs.has(slug),
                                            ).length === 1
                                                ? '1 dataset'
                                                : `${item.affected_slugs.filter((slug) => reportSlugs.has(slug)).length} datasets`}{' '}
                                            du rapport concernés
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {hiddenCount > 0 && !loading && !error && (
                    <p className="text-[10px] text-muted-foreground">
                        {hiddenCount} paramètre(s) déclaré(s) non utilisé(s) par
                        ce rapport masqué(s).
                    </p>
                )}

                <DialogFooter>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void load()}
                        disabled={loading}
                    >
                        <RefreshCw
                            className={
                                loading
                                    ? 'mr-1 h-3.5 w-3.5 animate-spin'
                                    : 'mr-1 h-3.5 w-3.5'
                            }
                        />
                        Recharger
                    </Button>
                    <Button size="sm" onClick={onClose}>
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
