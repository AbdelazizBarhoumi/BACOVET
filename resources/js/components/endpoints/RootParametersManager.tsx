import { ListFilter, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
    fetchRootParameters,
    removeRootParameter,
    saveRootParameters,
    type EndpointParameter,
} from '@/services/endpointManagerApi';

const URL_RE = /^https?:\/\/.+/i;

const CUSTOM_ROOT = '__custom__';
const DEFAULT_ROOT = '__default__';

function normalize(value: string): string {
    return value.trim().replace(/\/+$/, '');
}

function parseValues(value: string): string[] {
    return value
        .split(/[,;\s]+/)
        .map((item) => item.trim())
        .filter((item) => item !== '');
}

function keyFor(root: string, name: string): string {
    return `${root}::${name}`;
}

export function RootParametersManager({
    open,
    onOpenChange,
    onChanged,
    selectedRoot = null,
    roots = [],
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChanged: () => void;
    selectedRoot?: string | null;
    roots?: string[];
}) {
    const [rows, setRows] = useState<
        { root: string; parameters: EndpointParameter[] }[]
    >([]);
    const [loading, setLoading] = useState(false);
    const [savingRoot, setSavingRoot] = useState<string | null>(null);
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [newParam, setNewParam] = useState<
        Record<string, { name: string; values: string }>
    >({});
    const [addingRoot, setAddingRoot] = useState(false);
    const [newRootUrl, setNewRootUrl] = useState('');
    const [newRootName, setNewRootName] = useState('');
    const [newRootValues, setNewRootValues] = useState('');
    const [addError, setAddError] = useState('');

    const isCustomRoot =
        newRootUrl.trim() !== '' && !roots.includes(newRootUrl.trim());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchRootParameters();
            setRows(data.roots);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec du chargement des paramètres',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            setEdits({});
            setNewParam({});
            setAddingRoot(false);
            setNewRootUrl('');
            setNewRootName('');
            setNewRootValues('');
            setAddError('');
            void load();
        }, 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const commitRoot = async (
        root: string,
        parameters: EndpointParameter[],
    ) => {
        setSavingRoot(root);
        try {
            await saveRootParameters(root, parameters);
            toast.success('Paramètres enregistrés');
            await load();
            onChanged();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de l’enregistrement des paramètres',
            );
        } finally {
            setSavingRoot(null);
        }
    };

    const handleSaveParam = async (root: string, name: string) => {
        const current = rows.find((row) => row.root === root)?.parameters ?? [];
        const values = parseValues(edits[keyFor(root, name)] ?? '');
        if (values.length === 0) {
            toast.error('Renseignez au moins une valeur');
            return;
        }
        const next = current.map((param) =>
            param.name === name ? { name, values } : param,
        );
        await commitRoot(root, next);
    };

    const handleAddParam = async (root: string) => {
        const draft = newParam[root];
        const name = draft?.name.trim() ?? '';
        const values = parseValues(draft?.values ?? '');
        if (name === '') {
            toast.error('Le nom du paramètre est obligatoire');
            return;
        }
        if (values.length === 0) {
            toast.error('Renseignez au moins une valeur');
            return;
        }
        const current = rows.find((row) => row.root === root)?.parameters ?? [];
        if (current.some((param) => param.name === name)) {
            toast.error(`Le paramètre « ${name} » existe déjà`);
            return;
        }
        const next = [...current, { name, values }];
        await commitRoot(root, next);
        setNewParam((prev) => ({ ...prev, [root]: { name: '', values: '' } }));
    };

    const handleRemoveParam = async (root: string, name: string) => {
        if (
            !window.confirm(
                `Retirer le paramètre « ${name} » de cette racine ? Les endpoints utilisant « ${name} » ne seront plus ajustables ici.`,
            )
        ) {
            return;
        }
        setSavingRoot(root);
        try {
            await removeRootParameter(root, name);
            toast.success(`Paramètre « ${name} » retiré`);
            await load();
            onChanged();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de la suppression du paramètre',
            );
        } finally {
            setSavingRoot(null);
        }
    };

    const handleAddRoot = async () => {
        const root = normalize(newRootUrl);
        if (!URL_RE.test(root)) {
            setAddError(
                'La racine doit être une URL http(s) valide (ex. https://api.exemple.com)',
            );
            return;
        }
        const name = newRootName.trim();
        const values = parseValues(newRootValues);
        if (name === '') {
            setAddError('Le nom du paramètre est obligatoire');
            return;
        }
        if (values.length === 0) {
            setAddError('Renseignez au moins une valeur');
            return;
        }
        setAddError('');
        setSavingRoot(root);
        try {
            await saveRootParameters(root, [{ name, values }]);
            toast.success('Racine et paramètre ajoutés');
            setAddingRoot(false);
            setNewRootUrl('');
            setNewRootName('');
            setNewRootValues('');
            await load();
            onChanged();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de l’ajout des paramètres',
            );
        } finally {
            setSavingRoot(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-mono text-sm tracking-wider uppercase">
                        Paramètres par racine
                    </DialogTitle>
                </DialogHeader>

                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                        Nommez une liste (ex. « chaine ») et indiquez les
                        valeurs disponibles. Chaque endpoint de la racine dont
                        l’URL utilise ce paramètre obtient une liste de
                        sélection.
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
                        <div>
                            <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Racine API
                            </Label>
                            <Select
                                value={
                                    isCustomRoot
                                        ? CUSTOM_ROOT
                                        : newRootUrl === ''
                                          ? DEFAULT_ROOT
                                          : newRootUrl
                                }
                                onValueChange={(value) => {
                                    if (value === CUSTOM_ROOT) return;
                                    setNewRootUrl(
                                        value === DEFAULT_ROOT ? '' : value,
                                    );
                                }}
                            >
                                <SelectTrigger className="h-9 w-full font-mono text-sm">
                                    <SelectValue placeholder="Choisir une racine" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        value={DEFAULT_ROOT}
                                        className="font-mono text-xs"
                                    >
                                        Choisir une racine…
                                    </SelectItem>
                                    {roots.map((root) => (
                                        <SelectItem
                                            key={root}
                                            value={root}
                                            className="font-mono text-xs"
                                        >
                                            {root}
                                        </SelectItem>
                                    ))}
                                    <SelectItem
                                        value={CUSTOM_ROOT}
                                        className="font-mono text-xs"
                                    >
                                        Personnalisée…
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {isCustomRoot && (
                                <Input
                                    value={newRootUrl}
                                    onChange={(e) =>
                                        setNewRootUrl(e.target.value)
                                    }
                                    placeholder="https://api.exemple.com"
                                    className="mt-1.5 font-mono text-sm"
                                />
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    Nom du paramètre
                                </Label>
                                <Input
                                    value={newRootName}
                                    onChange={(e) =>
                                        setNewRootName(e.target.value)
                                    }
                                    placeholder="chaine"
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div>
                                <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    Valeurs (séparées par des virgules)
                                </Label>
                                <Input
                                    value={newRootValues}
                                    onChange={(e) =>
                                        setNewRootValues(e.target.value)
                                    }
                                    placeholder="CH01, CH02, CH03"
                                    className="font-mono text-sm"
                                />
                            </div>
                        </div>
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
                                disabled={savingRoot !== null}
                                onClick={() => void handleAddRoot()}
                            >
                                {savingRoot ? (
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
                            Chargement des paramètres…
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="py-10 text-center text-xs text-muted-foreground">
                            Aucun paramètre déclaré. Utilisez « Ajouter une
                            racine » pour définir la première liste.
                        </p>
                    ) : (
                        <div className="divide-y divide-border">
                            {rows.map((row) => {
                                const busy = savingRoot === row.root;
                                const isSelected = selectedRoot === row.root;
                                const draft = newParam[row.root] ?? {
                                    name: '',
                                    values: '',
                                };
                                return (
                                    <div
                                        key={row.root}
                                        className={cn(
                                            'space-y-2 py-3 first:pt-0 last:pb-0',
                                            isSelected &&
                                                'rounded-md bg-warning/5 ring-1 ring-warning/40',
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <ListFilter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                            <span
                                                className="truncate font-mono text-xs font-semibold"
                                                title={row.root}
                                            >
                                                {row.root}
                                            </span>
                                        </div>

                                        {row.parameters.map((param) => {
                                            const editKey = keyFor(
                                                row.root,
                                                param.name,
                                            );
                                            const valuesValue =
                                                edits[editKey] ??
                                                param.values.join(', ');
                                            return (
                                                <div
                                                    key={param.name}
                                                    className="space-y-1.5 rounded-md border border-border/60 p-2"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-mono text-[11px] font-bold">
                                                            {param.name}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0 text-destructive"
                                                            title="Retirer ce paramètre"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                void handleRemoveParam(
                                                                    row.root,
                                                                    param.name,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={valuesValue}
                                                            onChange={(e) =>
                                                                setEdits(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [editKey]:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                            placeholder="CH01, CH02, CH03"
                                                            className="font-mono text-xs"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 shrink-0 font-mono text-[10px]"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                void handleSaveParam(
                                                                    row.root,
                                                                    param.name,
                                                                )
                                                            }
                                                        >
                                                            {busy ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                'Enregistrer'
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={draft.name}
                                                onChange={(e) =>
                                                    setNewParam((current) => ({
                                                        ...current,
                                                        [row.root]: {
                                                            ...current[
                                                                row.root
                                                            ],
                                                            name: e.target
                                                                .value,
                                                        },
                                                    }))
                                                }
                                                placeholder="Nom (ex. chaine)"
                                                className="w-36 font-mono text-xs"
                                            />
                                            <Input
                                                value={draft.values}
                                                onChange={(e) =>
                                                    setNewParam((current) => ({
                                                        ...current,
                                                        [row.root]: {
                                                            ...current[
                                                                row.root
                                                            ],
                                                            values: e.target
                                                                .value,
                                                        },
                                                    }))
                                                }
                                                placeholder="CH01, CH02, CH03"
                                                className="flex-1 font-mono text-xs"
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 shrink-0 font-mono text-[10px]"
                                                disabled={busy}
                                                onClick={() =>
                                                    void handleAddParam(
                                                        row.root,
                                                    )
                                                }
                                            >
                                                <Plus className="mr-1 h-3 w-3" />
                                                Ajouter
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
