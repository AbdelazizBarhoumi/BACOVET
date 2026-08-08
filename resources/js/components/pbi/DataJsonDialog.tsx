import { Check, Copy, FileJson, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { fetchEndpointDatasets } from '@/lib/pbi/datasets';

type Props = {
    open: boolean;
    onClose: () => void;
};

export function DataJsonDialog({ open, onClose }: Props) {
    const [json, setJson] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const loadRef = useRef(0);

    const load = async () => {
        const token = ++loadRef.current;
        setLoading(true);
        setError(null);
        setCopied(false);
        try {
            const datasets = await fetchEndpointDatasets();
            if (token !== loadRef.current) return;
            setJson(JSON.stringify(datasets, null, 2));
        } catch (e) {
            if (token !== loadRef.current) return;
            setJson(null);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            if (token === loadRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => {
            void load();
        }, 0);
        return () => clearTimeout(t);
    }, [open]);

    const copy = async () => {
        if (json == null) return;
        try {
            await navigator.clipboard.writeText(json);
            setCopied(true);
            toast.success('Données copiées dans le presse-papiers');
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Impossible de copier');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileJson className="h-4 w-4" /> Données (JSON)
                    </DialogTitle>
                    <DialogDescription>
                        Toutes les lignes des datasets du rapport, au format
                        JSON.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-[300px] max-h-[60vh] overflow-auto rounded-md border border-border bg-foreground/[0.03] p-3">
                    {loading && json == null && error == null ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Chargement des données…</span>
                        </div>
                    ) : error != null ? (
                        <div className="py-16 text-center text-sm text-destructive">
                            {error}
                        </div>
                    ) : json != null ? (
                        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                            {json}
                        </pre>
                    ) : null}
                </div>

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
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void copy()}
                        disabled={json == null}
                    >
                        {copied ? (
                            <Check className="mr-1 h-3.5 w-3.5" />
                        ) : (
                            <Copy className="mr-1 h-3.5 w-3.5" />
                        )}
                        Copier
                    </Button>
                    <Button size="sm" onClick={onClose}>
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
