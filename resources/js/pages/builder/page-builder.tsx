import { Head, Link, router } from '@inertiajs/react';
import {
    Plus,
    Copy,
    Trash2,
    Pencil,
    ExternalLink,
    Link as LinkIcon,
    FileText,
    Loader2,
    Share2,
    Globe,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import ShareDialog from '@/components/builder/ShareDialog';
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
import { useSidebarStructure } from '@/lib/groups-registry';
import { usePagesRegistry } from '@/lib/pages-registry';

export default function PageBuilder() {
    const {
        pages,
        loading,
        createPage,
        duplicatePage,
        deletePage,
        updatePage,
        togglePublished,
    } = usePagesRegistry();
    const { groups, assignPage } = useSidebarStructure();
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
    const originalGroupIdRef = useRef<number | null>(null);

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
            router.visit(`/p/${p.slug}`);
        } else {
            toast.error('Erreur lors de la création');
        }
    };

    const copyUrl = (slug: string, published: boolean) => {
        const url = `${window.location.origin}/p/${slug}`;
        const share = published ? `${window.location.origin}/pub/${slug}` : url;
        navigator.clipboard.writeText(share);
        toast.success(published ? 'URL publique copiée' : 'URL copiée');
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <AppShell
            page="/"
            title="Constructeur de pages"
            subtitle="Constructeur unifié — créez autant de tableaux de bord que nécessaire, chacun avec sa propre URL."
        >
            <Head title="Constructeur de pages — BACOVET" />
            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-center justify-end">
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setCreating(true)}
                            className="text-xs tracking-wider uppercase"
                            disabled={busy}
                        >
                            <Plus className="mr-1.5 h-4 w-4" /> Nouvelle page
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
                                className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="truncate text-sm font-bold">
                                                {p.name}
                                            </div>
                                            {p.published && (
                                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                                                    <Globe className="h-3 w-3" />{' '}
                                                    Publié
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground">
                                            <LinkIcon className="h-3 w-3" /> /p/
                                            {p.slug}
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
                                <div className="mt-auto flex flex-wrap items-stretch gap-1.5 gap-y-2 border-t border-border pt-3">
                                        <Link
                                            href={`/p/${p.slug}`}
                                            className="min-w-0 flex-1 sm:flex-none"
                                        >
                                            <Button
                                                size="sm"
                                                className="h-7 w-full text-[11px] tracking-wider uppercase"
                                            >
                                                <ExternalLink className="mr-1 h-3 w-3" />{' '}
                                                Ouvrir
                                            </Button>
                                        </Link>
                                        {p.can_edit && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 flex-1 text-[11px] sm:flex-none"
                                                onClick={() => {
                                                    originalGroupIdRef.current =
                                                        p.group_id;
                                                    setEditing({
                                                        id: p.id,
                                                        name: p.name,
                                                        slug: p.slug,
                                                        group_id: p.group_id,
                                                    });
                                                }}
                                            >
                                                <Pencil className="mr-1 h-3 w-3" />{' '}
                                                Éditer
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 flex-1 text-[11px] sm:flex-none"
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
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 flex-1 text-[11px] sm:flex-none"
                                            onClick={() =>
                                                copyUrl(p.slug, !!p.published)
                                            }
                                        >
                                            <LinkIcon className="mr-1 h-3 w-3" />{' '}
                                            URL
                                        </Button>
                                        {p.can_edit && (
                                            <Button
                                                size="sm"
                                                variant={
                                                    p.published
                                                        ? 'outline'
                                                        : 'default'
                                                }
                                                className="h-7 flex-1 text-[11px] sm:flex-none"
                                                disabled={busy}
                                                onClick={async () => {
                                                    setBusy(true);
                                                    const next =
                                                        await togglePublished(
                                                            p.id,
                                                            !p.published,
                                                        );
                                                    setBusy(false);
                                                    toast.success(
                                                        next?.published
                                                            ? `« ${p.name} » publié`
                                                            : `« ${p.name} » dépublié`,
                                                    );
                                                }}
                                            >
                                                <Globe className="mr-1 h-3 w-3" />{' '}
                                                {p.published
                                                    ? 'Dépublier'
                                                    : 'Publier'}
                                            </Button>
                                        )}
                                        {p.can_manage && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 flex-1 text-[11px] sm:flex-none"
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
                                        {p.can_manage && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="h-7 flex-1 text-[11px] sm:flex-none"
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
                                    /p/{editing.slug}
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
                                });
                                if (
                                    editing.group_id !==
                                    originalGroupIdRef.current
                                ) {
                                    await assignPage(
                                        editing.id,
                                        editing.group_id,
                                    );
                                }
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
        </AppShell>
    );
}
