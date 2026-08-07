import { Loader2, Lock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    getPagePermissions,
    savePagePermissions,
    type PageAccessUser,
} from '@/lib/pages-registry-v5';

type Props = {
    pageId: number;
    pageName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function ShareDialog({
    pageId,
    pageName,
    open,
    onOpenChange,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Partager « {pageName} »
                    </DialogTitle>
                    <DialogDescription>
                        Cochez qui peut voir cette page, et qui peut également
                        la modifier. Les utilisateurs non cochés n'y ont pas
                        accès.
                    </DialogDescription>
                </DialogHeader>

                {open && (
                    <PermissionList
                        pageId={pageId}
                        onDone={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function PermissionList({
    pageId,
    onDone,
}: {
    pageId: number;
    onDone: () => void;
}) {
    const [rows, setRows] = useState<PageAccessUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getPagePermissions(Number(pageId)).then((data) => {
            if (cancelled) return;
            setRows(data ?? []);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [pageId]);

    const setView = (user: PageAccessUser, canView: boolean) => {
        setRows((prev) =>
            prev.map((u) =>
                u.id === user.id
                    ? {
                          ...u,
                          mode: !canView
                              ? 'none'
                              : u.mode === 'edit'
                                ? 'edit'
                                : 'view',
                      }
                    : u,
            ),
        );
    };

    const setEdit = (user: PageAccessUser, canEdit: boolean) => {
        setRows((prev) =>
            prev.map((u) =>
                u.id === user.id
                    ? { ...u, mode: canEdit ? 'edit' : 'view' }
                    : u,
            ),
        );
    };

    const save = async () => {
        setSaving(true);
        const ok = await savePagePermissions(
            Number(pageId),
            rows.map((u) => ({
                user_id: u.id,
                mode: u.mode ?? 'none',
            })),
        );
        setSaving(false);
        if (ok) {
            toast.success('Permissions mises à jour');
            onDone();
        } else {
            toast.error("Échec de l'enregistrement des permissions");
        }
    };

    return (
        <>
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-3 pr-3 text-[10px] tracking-widest text-muted-foreground uppercase">
                        <span />
                        <span className="w-24 text-center">Peut voir</span>
                        <span className="w-24 text-center">
                            Voir + modifier
                        </span>
                    </div>
                    <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
                        {rows.map((u) => (
                            <div
                                key={u.id}
                                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 text-sm font-medium">
                                        <span className="truncate">
                                            {u.name}
                                        </span>
                                        {u.is_owner && (
                                            <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="truncate text-[10px] text-muted-foreground">
                                        {u.email}
                                    </div>
                                </div>
                                {u.is_owner || u.is_admin ? (
                                    <div className="col-span-2 pr-1 text-center text-[11px] text-muted-foreground uppercase">
                                        {u.is_owner
                                            ? 'Propriétaire'
                                            : 'Administrateur'}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid w-24 place-items-center text-[11px]">
                                            <Checkbox
                                                checked={
                                                    u.mode !== 'none' &&
                                                    u.mode !== null
                                                }
                                                onCheckedChange={(v) =>
                                                    setView(u, !!v)
                                                }
                                            />
                                        </div>
                                        <div className="grid w-24 place-items-center text-[11px]">
                                            <Checkbox
                                                checked={u.mode === 'edit'}
                                                onCheckedChange={(v) =>
                                                    setEdit(u, !!v)
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={onDone} disabled={saving}>
                    Annuler
                </Button>
                <Button onClick={save} disabled={saving || loading}>
                    {saving ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : null}
                    Enregistrer
                </Button>
            </DialogFooter>
        </>
    );
}
