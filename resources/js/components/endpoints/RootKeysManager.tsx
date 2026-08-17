import {
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
    fetchRootCredentials,
    removeRootCredential,
    rewriteEndpointRoot,
    saveRootCredential,
    toggleRootDisabled,
    type RootCredentialInfo,
} from '@/services/endpointManagerApi';

const URL_RE = /^https?:\/\/.+/i;

function normalize(value: string): string {
    return value.trim().replace(/\/+$/, '');
}

export function RootKeysManager({
    open,
    onOpenChange,
    onChanged,
    selectedRoot = null,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChanged: () => void;
    selectedRoot?: string | null;
}) {
    const [roots, setRoots] = useState<RootCredentialInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [draftByRoot, setDraftByRoot] = useState<Record<string, string>>({});
    const [revealedByRoot, setRevealedByRoot] = useState<
        Record<string, boolean>
    >({});
    const [busyByRoot, setBusyByRoot] = useState<Record<string, boolean>>({});
    const [addingRoot, setAddingRoot] = useState(false);
    const [newRootUrl, setNewRootUrl] = useState('');
    const [newRootKey, setNewRootKey] = useState('');
    const [addError, setAddError] = useState('');
    const [renamingRoot, setRenamingRoot] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [renameError, setRenameError] = useState('');
    const [focusRoot, setFocusRoot] = useState<string | null>(null);
    const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchRootCredentials();
            setRoots(data.roots);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec du chargement des clés par racine',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            setDraftByRoot({});
            setRevealedByRoot({});
            setBusyByRoot({});
            setAddingRoot(false);
            setRenamingRoot(null);
            setFocusRoot(null);
            setNewRootUrl('');
            setNewRootKey('');
            setAddError('');
            setRenameError('');
            rowRefs.current = {};
            void load();
        }, 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open || loading) return;
        const target = selectedRoot ?? focusRoot;
        if (!target) return;
        const el = rowRefs.current[target];
        if (!el) return;
        el.scrollIntoView({ block: 'center' });
    }, [open, selectedRoot, focusRoot, loading, roots]);

    const setBusy = (root: string, busy: boolean) => {
        setBusyByRoot((current) => ({ ...current, [root]: busy }));
    };

    const handleSave = async (root: string) => {
        const apiKey = (draftByRoot[root] ?? '').trim();
        setBusy(root, true);
        try {
            const result = await saveRootCredential(root, apiKey);
            toast.success(
                result.has_api_key
                    ? 'Clé API définie pour cette racine'
                    : 'Clé API réinitialisée (retour à la clé globale)',
            );
            await load();
            onChanged();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de l’enregistrement de la clé API',
            );
        } finally {
            setBusy(root, false);
        }
    };

    const handleRemove = async (root: string) => {
        setBusy(root, true);
        try {
            await removeRootCredential(root);
            toast.success('Clé API supprimée pour cette racine');
            await load();
            onChanged();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de la suppression de la clé API',
            );
        } finally {
            setBusy(root, false);
        }
    };

    const handleToggleRoot = async (root: string, disabled: boolean) => {
        setBusy(root, true);
        try {
            const result = await toggleRootDisabled(root, disabled);
            toast.success(
                result.disabled
                    ? `Racine désactivée — ${result.count} endpoint(s) retirés des datasets`
                    : `Racine réactivée — ${result.count} endpoint(s) restaurés`,
            );
            await load();
            onChanged();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de la désactivation de la racine',
            );
        } finally {
            setBusy(root, false);
        }
    };

    const handleAdd = async () => {
        const root = normalize(newRootUrl);
        if (!URL_RE.test(root)) {
            setAddError(
                'La racine doit être une URL http(s) valide (ex. https://api.exemple.com)',
            );
            return;
        }
        setAddError('');
        setBusy(root, true);
        try {
            const result = await saveRootCredential(root, newRootKey.trim());
            toast.success('Racine ajoutée');
            setAddingRoot(false);
            setNewRootUrl('');
            setNewRootKey('');
            setFocusRoot(result.root);
            await load();
            onChanged();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de l’ajout de la racine',
            );
        } finally {
            setBusy(root, false);
        }
    };

    const startRename = (root: string) => {
        setRenamingRoot(root);
        setRenameValue(root);
        setRenameError('');
    };

    const cancelRename = () => {
        setRenamingRoot(null);
        setRenameValue('');
        setRenameError('');
    };

    const handleRename = async () => {
        if (!renamingRoot) return;
        const newRoot = normalize(renameValue);
        const oldRoot = normalize(renamingRoot);
        if (oldRoot === newRoot) {
            cancelRename();
            return;
        }
        if (!URL_RE.test(newRoot)) {
            setRenameError(
                'La racine doit être une URL http(s) valide (ex. https://api.exemple.com)',
            );
            return;
        }
        setRenameError('');
        setBusy(oldRoot, true);
        try {
            const result = await rewriteEndpointRoot(oldRoot, newRoot);
            if (!result.success) {
                throw new Error('Échec du renommage de la racine');
            }
            toast.success(
                result.changed > 0
                    ? `Racine renommée — ${result.changed} endpoint(s) mis à jour`
                    : 'Racine renommée',
            );
            setRenamingRoot(null);
            setRenameValue('');
            setFocusRoot(newRoot);
            await load();
            onChanged();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec du renommage de la racine',
            );
        } finally {
            setBusy(oldRoot, false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-mono text-sm tracking-wider uppercase">
                        Racines &amp; clés API
                    </DialogTitle>
                </DialogHeader>

                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                        La clé se gère par racine ; la racine vit par endpoint et
                        se renomme ici.
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 font-mono text-[10px] tracking-wider uppercase"
                        onClick={() => {
                            setAddingRoot((current) => !current);
                            setAddError('');
                        }}
                    >
                        {addingRoot ? (
                            <X className="mr-1 h-3 w-3" />
                        ) : (
                            <Plus className="mr-1 h-3 w-3" />
                        )}
                        {addingRoot ? 'Annuler' : 'Ajouter une racine'}
                    </Button>
                </div>

                {addingRoot && (
                    <div className="mb-3 space-y-2 rounded-md border border-border bg-muted/20 p-3">
                        <Input
                            value={newRootUrl}
                            onChange={(e) => setNewRootUrl(e.target.value)}
                            placeholder="https://api.exemple.com"
                            className="font-mono text-sm"
                        />
                        <Input
                            value={newRootKey}
                            onChange={(e) => setNewRootKey(e.target.value)}
                            placeholder="Clé API pour cette racine (optionnel)"
                            className="font-mono text-sm"
                        />
                        {addError && (
                            <p className="text-[10px] font-medium text-destructive">
                                {addError}
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setAddingRoot(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                size="sm"
                                disabled={busyByRoot[newRootUrl.trim()] ?? false}
                                onClick={() => void handleAdd()}
                            >
                                {busyByRoot[newRootUrl.trim()] ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    'Ajouter'
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement des racines…
                        </div>
                    ) : roots.length === 0 ? (
                        <p className="py-10 text-center text-xs text-muted-foreground">
                            Aucune racine configurée. Utilisez « Ajouter une
                            racine » pour créer une racine avec sa clé API.
                        </p>
                    ) : (
                        <div className="divide-y divide-border">
                            {roots.map((root) => {
                                const busy = busyByRoot[root.root] ?? false;
                                const revealed =
                                    revealedByRoot[root.root] ?? false;
                                const draft = draftByRoot[root.root] ?? '';
                                const renaming = renamingRoot === root.root;
                                const isSelected =
                                    (selectedRoot ?? focusRoot) === root.root;
                                return (
                                    <div
                                        key={root.root}
                                        ref={(el) => {
                                            rowRefs.current[root.root] = el;
                                        }}
                                        className={cn(
                                            'space-y-2 py-3 first:pt-0 last:pb-0',
                                            isSelected &&
                                                'rounded-md bg-warning/5 ring-1 ring-warning/40',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                {renaming ? (
                                                    <Input
                                                        value={renameValue}
                                                        onChange={(e) =>
                                                            setRenameValue(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="font-mono text-xs"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className="truncate font-mono text-xs font-semibold"
                                                            title={root.root}
                                                        >
                                                            {root.root}
                                                        </span>
                                                        {root.has_api_key && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-[10px] font-medium text-warning"
                                                                title="Clé API personnalisée définie"
                                                            >
                                                                <KeyRound className="h-3 w-3" />
                                                                {
                                                                    root.masked_api_key
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                                                    <span className="rounded bg-muted px-1 font-mono">
                                                        {root.count}{' '}
                                                        endpoint
                                                        {root.count === 1
                                                            ? ''
                                                            : 's'}
                                                    </span>
                                                    {root.disabled && (
                                                        <span className="rounded bg-destructive/10 px-1 font-mono font-bold tracking-wider text-destructive uppercase">
                                                            Désactivée
                                                        </span>
                                                    )}
                                                    {renaming && renameError ? (
                                                        <span className="text-destructive">
                                                            {renameError}
                                                        </span>
                                                    ) : root.has_api_key ? (
                                                        <span className="text-success">
                                                            Clé personnalisée
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            Clé globale
                                                            (fallback)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                {renaming ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 text-[10px]"
                                                            disabled={busy}
                                                            onClick={
                                                                cancelRename
                                                            }
                                                        >
                                                            Annuler
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            className="h-6 text-[10px]"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                void handleRename()
                                                            }
                                                        >
                                                            {busy ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                'Renommer'
                                                            )}
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Switch
                                                            checked={
                                                                !root.disabled
                                                            }
                                                            disabled={busy}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                void handleToggleRoot(
                                                                    root.root,
                                                                    !checked,
                                                                )
                                                            }
                                                            title={
                                                                root.disabled
                                                                    ? 'Réactiver toute la racine'
                                                                    : 'Désactiver toute la racine'
                                                            }
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0"
                                                            title="Renommer la racine"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                startRename(
                                                                    root.root,
                                                                )
                                                            }
                                                        >
                                                            {busy ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                        {root.has_api_key && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0 text-destructive"
                                                                title="Retirer la clé API de cette racine"
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    handleRemove(
                                                                        root.root,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    type={
                                                        revealed
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    value={draft}
                                                    onChange={(e) =>
                                                        setDraftByRoot(
                                                            (current) => ({
                                                                ...current,
                                                                [root.root]:
                                                                    e.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                    placeholder={
                                                        root.has_api_key
                                                            ? root.masked_api_key
                                                            : 'Clé API pour cette racine (laisser vide = clé globale)'
                                                    }
                                                    className="pr-9 font-mono text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    title={
                                                        revealed
                                                            ? 'Masquer la clé'
                                                            : 'Afficher la clé'
                                                    }
                                                    onClick={() =>
                                                        setRevealedByRoot(
                                                            (current) => ({
                                                                ...current,
                                                                [root.root]:
                                                                    !revealed,
                                                            }),
                                                        )
                                                    }
                                                    className={cn(
                                                        'absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                                                    )}
                                                >
                                                    {revealed ? (
                                                        <EyeOff className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Eye className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 font-mono text-[11px]"
                                                disabled={busy}
                                                onClick={() =>
                                                    handleSave(root.root)
                                                }
                                            >
                                                Enregistrer
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}