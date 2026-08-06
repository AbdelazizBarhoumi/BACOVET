import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Plus,
    Copy,
    Trash2,
    Pencil,
    ExternalLink,
    Link as LinkIcon,
    FileText,
    Loader2,
    LogOut,
    History,
    Share2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import ShareDialog from '@/components/v5/ShareDialog';
import { useSidebarStructureV5 } from '@/lib/groups-registry-v5';
import { usePagesRegistryV5 } from '@/lib/pages-registry-v5';

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function V5PageBuilder() {
    const { props } = usePage();
    const authRole = (props as unknown as { authRole?: string }).authRole;
    const isSuperAdmin = authRole === 'it' || authRole === 'direction';
    const {
        pages,
        loading,
        createPage,
        duplicatePage,
        deletePage,
        updatePage,
    } = usePagesRegistryV5();
    const { groups } = useSidebarStructureV5();
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newGroupId, setNewGroupId] = useState<string>('none');
    const [editing, setEditing] = useState<{
        id: number;
        name: string;
        slug: string;
        group_id: number | null;
    } | null>(null);
    const [busy, setBusy] = useState(false);
    const [sharing, setSharing] = useState<{
        id: number;
        name: string;
    } | null>(null);

    const doCreate = async () => {
        setBusy(true);
        const p = await createPage(
            newName || 'Nouvelle page',
            newGroupId && newGroupId !== 'none' ? parseInt(newGroupId) : null,
        );
        setBusy(false);
        setNewName('');
        setNewGroupId('none');
        setCreating(false);
        if (p) {
            toast.success(`Page « ${p.name} » créée`);
            router.visit(`/v5/p/${p.slug}`);
        } else {
            toast.error('Erreur lors de la création');
        }
    };

    const copyUrl = (slug: string) => {
        const url = `${window.location.origin}/v5/p/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success('URL copiée');
    };

    const doLogout = async () => {
        try {
            await fetch('/api/v5-auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
            });
        } catch {
            /* ignore */
        }
        router.visit('/v5/login');
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Constructeur de pages V5 — BACOVET" />
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight uppercase">
                            Constructeur de pages V5
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Constructeur unifié — créez autant de tableaux de
                            bord que nécessaire, chacun avec sa propre URL.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                            <Link href="/v5/trace">
                                <Button
                                    variant="outline"
                                    className="text-xs tracking-wider uppercase"
                                >
                                    <History className="mr-1.5 h-4 w-4" />
                                    Traçabilité
                                </Button>
                            </Link>
                        )}
                        <Button
                            onClick={() => setCreating(true)}
                            className="text-xs tracking-wider uppercase"
                            disabled={busy}
                        >
                            <Plus className="mr-1.5 h-4 w-4" /> Nouvelle page
                        </Button>
                        <Button
                            onClick={doLogout}
                            variant="outline"
                            className="text-xs tracking-wider uppercase"
                        >
                            <LogOut className="mr-1.5 h-4 w-4" /> Déconnexion
                        </Button>
                    </div>
                </div>
                {pages.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-12 text-center">
                        <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                        <div className="mb-4 text-sm text-muted-foreground">
                            Aucune page. Créez votre premier tableau de bord.
                        </div>
                        <Button
                            onClick={() => setCreating(true)}
                            variant="outline"
                            size="sm"
                        >
                            <Plus className="mr-1.5 h-4 w-4" /> Créer une page
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {pages.map((p) => (
                            <div
                                key={p.id}
                                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold">
                                            {p.name}
                                        </div>
                                        <div className="flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground">
                                            <LinkIcon className="h-3 w-3" />{' '}
                                            /v5/p/{p.slug}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
                                    Créée le{' '}
                                    {new Date(p.created_at).toLocaleDateString(
                                        'fr-FR',
                                    )}
                                </div>
                                {p.group_id && (
                                    <div className="font-mono text-[10px] text-muted-foreground">
                                        Groupe:{' '}
                                        {groups.find((g) => g.id === p.group_id)
                                            ?.name ?? p.group_id}
                                    </div>
                                )}
                                <div className="mt-auto flex flex-wrap items-center justify-between gap-1.5 border-t border-border pt-3">
                                    <div className="flex flex-nowrap items-center gap-1.5">
                                        <Link href={`/v5/p/${p.slug}`}>
                                            <Button
                                                size="sm"
                                                className="h-7 text-[11px] tracking-wider uppercase"
                                            >
                                                <ExternalLink className="mr-1 h-3 w-3" />{' '}
                                                Ouvrir
                                            </Button>
                                        </Link>
                                        {p.can_edit && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-[11px]"
                                                onClick={() =>
                                                    setEditing({
                                                        id: p.id,
                                                        name: p.name,
                                                        slug: p.slug,
                                                        group_id: p.group_id,
                                                    })
                                                }
                                            >
                                                <Pencil className="mr-1 h-3 w-3" />{' '}
                                                Éditer
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[11px]"
                                            onClick={async () => {
                                                setBusy(true);
                                                const c = await duplicatePage(
                                                    p.id,
                                                );
                                                setBusy(false);
                                                if (c)
                                                    toast.success(
                                                        `Dupliqué : ${c.name}`,
                                                    );
                                            }}
                                        >
                                            <Copy className="mr-1 h-3 w-3" />{' '}
                                            Dupliquer
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[11px]"
                                            onClick={() => copyUrl(p.slug)}
                                        >
                                            <LinkIcon className="mr-1 h-3 w-3" />{' '}
                                            URL
                                        </Button>
                                        {p.can_manage && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-[11px]"
                                                onClick={() =>
                                                    setSharing({
                                                        id: p.id,
                                                        name: p.name,
                                                    })
                                                }
                                            >
                                                <Share2 className="mr-1 h-3 w-3" />{' '}
                                                Partager
                                            </Button>
                                        )}
                                        {p.can_edit && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="h-7 text-[11px]"
                                                disabled={busy}
                                                onClick={async () => {
                                                    if (
                                                        confirm(
                                                            `Supprimer « ${p.name} » ? Cette action est irréversible.`,
                                                        )
                                                    ) {
                                                        setBusy(true);
                                                        const ok =
                                                            await deletePage(
                                                                p.id,
                                                            );
                                                        setBusy(false);
                                                        if (ok)
                                                            toast.success(
                                                                'Page supprimée',
                                                            );
                                                    }
                                                }}
                                            >
                                                <Trash2 className="mr-1 h-3 w-3" />{' '}
                                                Supprimer
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvelle page</DialogTitle>
                        <DialogDescription>
                            Nommez votre tableau de bord. Une URL directe sera
                            générée.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            autoFocus
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="ex. Production Chaîne 12"
                            onKeyDown={(e) => e.key === 'Enter' && doCreate()}
                        />
                        <div>
                            <div className="mb-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                                Groupe
                            </div>
                            <Select
                                value={newGroupId}
                                onValueChange={setNewGroupId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Aucun groupe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        Aucun groupe
                                    </SelectItem>
                                    {groups.map((g) => (
                                        <SelectItem
                                            key={g.id}
                                            value={String(g.id)}
                                        >
                                            {g.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreating(false)}
                            disabled={busy}
                        >
                            Annuler
                        </Button>
                        <Button onClick={doCreate} disabled={busy}>
                            {busy ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : null}
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!editing}
                onOpenChange={(o) => !o && setEditing(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Éditer la page</DialogTitle>
                        <DialogDescription>
                            Modifier le nom, l'URL (slug) ou le groupe. Les
                            widgets sont conservés.
                        </DialogDescription>
                    </DialogHeader>
                    {editing && (
                        <div className="space-y-3">
                            <div>
                                <div className="mb-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                                    Nom
                                </div>
                                <Input
                                    value={editing.name}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            name: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <div className="mb-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                                    Slug (URL)
                                </div>
                                <Input
                                    value={editing.slug}
                                    onChange={(e) =>
                                        setEditing({
                                            ...editing,
                                            slug: e.target.value,
                                        })
                                    }
                                />
                                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                                    /v5/p/{editing.slug}
                                </div>
                            </div>
                            <div>
                                <div className="mb-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                                    Groupe
                                </div>
                                <Select
                                    value={String(editing.group_id ?? 'none')}
                                    onValueChange={(v) =>
                                        setEditing({
                                            ...editing,
                                            group_id:
                                                v && v !== 'none'
                                                    ? parseInt(v)
                                                    : null,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Aucun groupe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Aucun groupe
                                        </SelectItem>
                                        {groups.map((g) => (
                                            <SelectItem
                                                key={g.id}
                                                value={String(g.id)}
                                            >
                                                {g.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditing(null)}
                            disabled={busy}
                        >
                            Annuler
                        </Button>
                        <Button
                            disabled={busy}
                            onClick={async () => {
                                if (!editing) return;
                                setBusy(true);
                                await updatePage(editing.id, {
                                    name: editing.name,
                                    slug: editing.slug,
                                    group_id: editing.group_id,
                                });
                                setBusy(false);
                                toast.success('Page mise à jour');
                                setEditing(null);
                            }}
                        >
                            {busy ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : null}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ShareDialog
                open={!!sharing}
                onOpenChange={(o) => !o && setSharing(null)}
                pageId={sharing?.id ?? 0}
                pageName={sharing?.name ?? ''}
            />
        </div>
    );
}
