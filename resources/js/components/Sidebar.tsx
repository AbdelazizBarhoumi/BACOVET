import { Link, usePage, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Copy,
    FolderPlus,
    GripVertical,
    Link as LinkIcon,
    LogOut,
    Pencil,
    Plus,
    Settings,
    Trash2,
    Loader2,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import bacovetLogo from '@/assets/bacovet-logo.png';
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
import { useAuth, ROLE_LABEL, type RolePage } from '@/context/AuthContext';
import { pushAudit } from '@/lib/audit';
import { useSidebarStructure } from '@/lib/groups-registry';
import { usePagesRegistry } from '@/lib/pages-registry';
import type { BuilderPage } from '@/lib/pages-registry';

const Sidebar = () => {
    const { url: pathname } = usePage();
    const { session, logout, hasAccess } = useAuth();
    const {
        groups,
        ungrouped,
        loading,
        createGroup,
        renameGroup,
        deleteGroup,
        assignPage,
        reorderPages,
        reorderGroups,
        refresh,
    } = useSidebarStructure();
    const { createPage, deletePage, duplicatePage, updatePage } =
        usePagesRegistry();
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [showAddPage, setShowAddPage] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newPageName, setNewPageName] = useState('');
    const [newPageGroupId, setNewPageGroupId] = useState<string>('none');
    const [creating, setCreating] = useState(false);
    const [renaming, setRenaming] = useState<{
        id: number;
        name: string;
        type: 'group' | 'page';
    } | null>(null);
    const [busy, setBusy] = useState(false);
    const [draggedPageId, setDraggedPageId] = useState<number | null>(null);
    const [dragTarget, setDragTarget] = useState<{
        type: 'group' | 'page' | 'ungrouped';
        id: number | null;
    } | null>(null);

    if (!session) return null;

    const initials = session.name
        .split(' ')
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const canSeeAdmin = hasAccess('/admin');

    const toggleCollapse = (id: number) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const doCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setCreating(true);
        const g = await createGroup(newGroupName.trim());
        setCreating(false);
        setNewGroupName('');
        setShowAddGroup(false);
        if (g) toast.success(`Groupe « ${g.name} » créé`);
        else toast.error('Erreur lors de la création');
    };

    const doCreatePage = async () => {
        if (!newPageName.trim()) return;
        setCreating(true);
        const p = await createPage(
            newPageName.trim(),
            newPageGroupId && newPageGroupId !== 'none'
                ? parseInt(newPageGroupId)
                : null,
        );
        setCreating(false);
        setNewPageName('');
        setNewPageGroupId('none');
        setShowAddPage(false);
        if (p) {
            toast.success(`Page « ${p.name} » créée`);
            router.visit(`/p/${p.slug}`);
        } else {
            toast.error('Erreur lors de la création');
        }
    };

    const doRename = async () => {
        if (!renaming || !renaming.name.trim()) return;
        setBusy(true);
        let ok = false;
        if (renaming.type === 'group') {
            ok = await renameGroup(renaming.id, renaming.name.trim());
        } else {
            const result = await updatePage(renaming.id, {
                name: renaming.name.trim(),
            });
            ok = !!result;
        }
        setBusy(false);
        setRenaming(null);
        if (ok)
            toast.success(
                renaming.type === 'group' ? 'Groupe renommé' : 'Page renommée',
            );
        else toast.error('Erreur');
    };

    const doDeleteGroup = async (id: number, name: string) => {
        if (
            !confirm(
                `Supprimer le groupe « ${name} » ? Les pages seront déplacées hors groupe.`,
            )
        )
            return;
        const ok = await deleteGroup(id);
        if (ok) toast.success('Groupe supprimé');
        else toast.error('Erreur');
    };

    const doDeletePage = async (id: number, name: string) => {
        if (
            !confirm(
                `Supprimer la page « ${name} » ? Cette action est irréversible.`,
            )
        )
            return;
        const ok = await deletePage(id);
        if (ok) toast.success('Page supprimée');
        else toast.error('Erreur');
    };

    const doDuplicatePage = async (id: number) => {
        const c = await duplicatePage(id);
        if (c) toast.success(`Dupliqué : ${c.name}`);
    };

    const copyUrl = (slug: string) => {
        const url = `${window.location.origin}/p/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success('URL copiée');
    };

    const findPageGroup = useCallback(
        (pageId: number): number | null => {
            for (const g of groups) {
                if (g.pages.some((p) => p.id === pageId)) return g.id;
            }
            if (ungrouped.some((p) => p.id === pageId)) return null;
            return null;
        },
        [groups, ungrouped],
    );

    const computeReorderItems = useCallback(
        (
            pages: BuilderPage[],
            draggedId: number,
            targetId: number,
        ): { id: number; sort_order: number }[] | null => {
            const filtered = pages.filter((p) => p.id !== draggedId);
            const targetIdx = filtered.findIndex((p) => p.id === targetId);
            if (targetIdx === -1) return null;

            const reordered = [...filtered];
            const draggedPage = pages.find((p) => p.id === draggedId);
            if (!draggedPage) return null;
            reordered.splice(targetIdx + 1, 0, draggedPage);

            return reordered.map((p, i) => ({ id: p.id, sort_order: i }));
        },
        [],
    );

    const getPagesInGroup = useCallback(
        (groupId: number | null): BuilderPage[] => {
            if (groupId === null) return ungrouped;
            const g = groups.find((gr) => gr.id === groupId);
            return g ? g.pages : [];
        },
        [groups, ungrouped],
    );

    const handleDragStart = (e: React.DragEvent, pageId: number) => {
        e.dataTransfer.setData('text/plain', String(pageId));
        e.dataTransfer.effectAllowed = 'move';
        setDraggedPageId(pageId);
    };

    const handleDragEnd = () => {
        setDraggedPageId(null);
        setDragTarget(null);
    };

    const handleGroupDragOver = (
        e: React.DragEvent,
        groupId: number | null,
    ) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragTarget({ type: 'group', id: groupId });
    };

    const handlePageDragOver = useCallback(
        (e: React.DragEvent, pageId: number) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragTarget({ type: 'page', id: pageId });
        },
        [],
    );

    const handleUngroupedDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragTarget({ type: 'ungrouped', id: null });
    }, []);

    const handleDropOnPage = async (targetPageId: number) => {
        if (draggedPageId === null) return;
        setDragTarget(null);

        const draggedGroupId = findPageGroup(draggedPageId);
        const targetGroupId = findPageGroup(targetPageId);

        if (draggedGroupId === targetGroupId) {
            const pages = getPagesInGroup(draggedGroupId);
            const items = computeReorderItems(
                pages,
                draggedPageId,
                targetPageId,
            );
            if (items) {
                const ok = await reorderPages(items);
                if (ok) toast.success('Page réordonnée');
                else toast.error('Erreur');
            }
        } else {
            const ok = await assignPage(draggedPageId, targetGroupId);
            if (ok) {
                if (targetGroupId !== null) {
                    const pages = getPagesInGroup(targetGroupId);
                    const items = computeReorderItems(
                        pages,
                        draggedPageId,
                        targetPageId,
                    );
                    if (items) await reorderPages(items);
                }
                toast.success('Page déplacée');
            } else {
                toast.error('Erreur');
            }
        }
        setDraggedPageId(null);
    };

    const handleDropOnGroup = async (groupId: number | null) => {
        if (draggedPageId === null) return;
        setDragTarget(null);

        const draggedGroupId = findPageGroup(draggedPageId);

        if (draggedGroupId === groupId) return;

        const ok = await assignPage(draggedPageId, groupId);
        if (ok) toast.success('Page déplacée');
        else toast.error('Erreur');

        setDraggedPageId(null);
    };

    const handleDropOnGroupForReorder = async (
        groupId: number,
        targetGroupId: number,
    ) => {
        if (draggedPageId !== null) return;

        const items = groups.map((g) => ({
            id: g.id,
            sort_order: g.sort_order,
        }));
        const draggedIdx = items.findIndex((g) => g.id === groupId);
        const targetIdx = items.findIndex((g) => g.id === targetGroupId);
        if (draggedIdx === -1 || targetIdx === -1) return;

        const [moved] = items.splice(draggedIdx, 1);
        items.splice(targetIdx + 1, 0, moved);
        const updated = items.map((g, i) => ({ id: g.id, sort_order: i }));

        const ok = await reorderGroups(updated);
        if (ok) toast.success('Groupe réordonné');
        else toast.error('Erreur');
    };

    const isDragOverGroup = (groupId: number | null) =>
        dragTarget?.type === 'group' && dragTarget.id === groupId;
    const isDragOverPage = (pageId: number) =>
        dragTarget?.type === 'page' && dragTarget.id === pageId;
    const isDragOverUngrouped = () => dragTarget?.type === 'ungrouped';

    return (
        <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
            <div className="border-b border-sidebar-border px-5 py-5">
                <div>
                    <img
                        src={bacovetLogo}
                        alt="BACOVET"
                        className="h-8 w-auto object-contain"
                    />
                </div>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-3 py-1">
                            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                PAGES
                            </span>
                            {true && (
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => setShowAddGroup(true)}
                                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                                        title="Ajouter un groupe"
                                    >
                                        <FolderPlus className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setShowAddPage(true)}
                                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                                        title="Ajouter une page"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div
                            onDragOver={handleUngroupedDragOver}
                            onDragLeave={() => setDragTarget(null)}
                            onDrop={() => handleDropOnGroup(null)}
                            className={`rounded-md transition-colors ${isDragOverUngrouped() ? 'bg-sidebar-accent/50 ring-1 ring-primary' : ''}`}
                        >
                            {ungrouped.length > 0 && (
                                <div className="px-3 py-1 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                                    Sans groupe
                                </div>
                            )}
                            {ungrouped.map((p, i) => (
                                <div key={p.id}>
                                    {i > 0 && (
                                        <div
                                            className={`mx-2 h-0.5 transition-colors ${isDragOverPage(p.id) ? 'h-0.5 bg-primary' : ''}`}
                                        />
                                    )}
                                    <DraggablePageItem
                                        page={p}
                                        pathname={pathname}
                                        canEdit={!!p.can_manage}
                                        isDragOver={isDragOverPage(p.id)}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) =>
                                            handlePageDragOver(e, p.id)
                                        }
                                        onDrop={() => handleDropOnPage(p.id)}
                                        onRename={() =>
                                            setRenaming({
                                                id: p.id,
                                                name: p.name,
                                                type: 'page',
                                            })
                                        }
                                        onDuplicate={() =>
                                            doDuplicatePage(p.id)
                                        }
                                        onDelete={() =>
                                            doDeletePage(p.id, p.name)
                                        }
                                        onCopyUrl={() => copyUrl(p.slug)}
                                    />
                                </div>
                            ))}
                        </div>

                        {groups.map((g) => {
                            const isCollapsed = collapsed.has(g.id);
                            const active = g.pages.some(
                                (p) => pathname === `/p/${p.slug}`,
                            );

                            return (
                                <div key={g.id} className="space-y-0.5">
                                    <div
                                        className={`group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors ${
                                            active
                                                ? 'bg-primary/10 text-primary'
                                                : 'hover:bg-sidebar-accent'
                                        } ${isDragOverGroup(g.id) ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
                                        onDragOver={(e) =>
                                            handleGroupDragOver(e, g.id)
                                        }
                                        onDragLeave={() => setDragTarget(null)}
                                        onDrop={() => handleDropOnGroup(g.id)}
                                    >
                                        <button
                                            onClick={() => toggleCollapse(g.id)}
                                            className="flex h-4 w-4 cursor-pointer items-center justify-center rounded hover:bg-sidebar-accent"
                                        >
                                            {isCollapsed ? (
                                                <ChevronRight className="h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="h-3 w-3" />
                                            )}
                                        </button>
                                        <span
                                            className="flex-1 text-[11px] font-semibold tracking-wide uppercase"
                                            onDoubleClick={() =>
                                                setRenaming({
                                                    id: g.id,
                                                    name: g.name,
                                                    type: 'group',
                                                })
                                            }
                                        >
                                            {g.name}
                                        </span>
                                        <span className="font-mono text-[9px] text-muted-foreground">
                                            {g.pages.length}
                                        </span>
                                        {true && (
                                            <>
                                                <button
                                                    onClick={() =>
                                                        setRenaming({
                                                            id: g.id,
                                                            name: g.name,
                                                            type: 'group',
                                                        })
                                                    }
                                                    className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        doDeleteGroup(
                                                            g.id,
                                                            g.name,
                                                        )
                                                    }
                                                    className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {!isCollapsed && g.pages.length > 0 && (
                                        <div className="ml-3 space-y-0.5 border-l border-border pl-2">
                                            {g.pages.map((p, i) => (
                                                <div key={p.id}>
                                                    {i > 0 && (
                                                        <div
                                                            className={`mx-2 h-0.5 transition-colors ${isDragOverPage(p.id) ? 'h-0.5 bg-primary' : ''}`}
                                                        />
                                                    )}
                                                    <DraggablePageItem
                                                        page={p}
                                                        pathname={pathname}
                                                        canEdit={!!p.can_manage}
                                                        isDragOver={isDragOverPage(
                                                            p.id,
                                                        )}
                                                        onDragStart={
                                                            handleDragStart
                                                        }
                                                        onDragEnd={
                                                            handleDragEnd
                                                        }
                                                        onDragOver={(e) =>
                                                            handlePageDragOver(
                                                                e,
                                                                p.id,
                                                            )
                                                        }
                                                        onDrop={() =>
                                                            handleDropOnPage(
                                                                p.id,
                                                            )
                                                        }
                                                        onRename={() =>
                                                            setRenaming({
                                                                id: p.id,
                                                                name: p.name,
                                                                type: 'page',
                                                            })
                                                        }
                                                        onDuplicate={() =>
                                                            doDuplicatePage(
                                                                p.id,
                                                            )
                                                        }
                                                        onDelete={() =>
                                                            doDeletePage(
                                                                p.id,
                                                                p.name,
                                                            )
                                                        }
                                                        onCopyUrl={() =>
                                                            copyUrl(p.slug)
                                                        }
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}

                {canSeeAdmin && (
                    <>
                        <div className="px-3 pt-6 pb-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                            SYSTÈME
                        </div>
                        <Link
                            href="/admin"
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                pathname === '/admin'
                                    ? 'border-l-2 border-primary bg-primary/15 text-primary'
                                    : 'hover:bg-sidebar-accent'
                            }`}
                        >
                            <Settings
                                className={`h-4 w-4 ${pathname === '/admin' ? 'text-white' : 'text-primary'}`}
                            />
                            <span className="flex-1 text-[12px] font-semibold tracking-wide uppercase">
                                ADMINISTRATION
                            </span>
                        </Link>
                    </>
                )}
            </nav>

            <div className="border-t border-sidebar-border bg-sidebar-accent/30 p-4">
                <div className="mb-3 flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-white shadow-sm">
                        {initials}
                    </div>
                    <div className="min-w-0 text-xs leading-tight">
                        <div className="truncate font-bold uppercase">
                            {session.name}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                            {ROLE_LABEL[session.role]}
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        pushAudit('USER', `Déconnexion ${session.matricule}`);
                        logout();
                    }}
                    className="w-full justify-start text-[11px] tracking-wider uppercase hover:bg-destructive/10 hover:text-destructive"
                >
                    <LogOut className="mr-2 h-3.5 w-3.5" /> DÉCONNEXION
                </Button>
            </div>

            <Dialog open={showAddPage} onOpenChange={setShowAddPage}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvelle page</DialogTitle>
                        <DialogDescription>
                            Créez un nouveau tableau de bord.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            autoFocus
                            value={newPageName}
                            onChange={(e) => setNewPageName(e.target.value)}
                            placeholder="Nom de la page"
                            onKeyDown={(e) =>
                                e.key === 'Enter' && doCreatePage()
                            }
                        />
                        <div>
                            <div className="mb-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                                Groupe
                            </div>
                            <Select
                                value={newPageGroupId}
                                onValueChange={setNewPageGroupId}
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
                            onClick={() => {
                                setShowAddPage(false);
                                setNewPageName('');
                            }}
                            disabled={creating}
                        >
                            Annuler
                        </Button>
                        <Button onClick={doCreatePage} disabled={creating}>
                            {creating ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : null}
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showAddGroup} onOpenChange={setShowAddGroup}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau groupe</DialogTitle>
                        <DialogDescription>
                            Créez un groupe pour organiser vos pages.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        autoFocus
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="ex. Production"
                        onKeyDown={(e) => e.key === 'Enter' && doCreateGroup()}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowAddGroup(false)}
                            disabled={creating}
                        >
                            Annuler
                        </Button>
                        <Button onClick={doCreateGroup} disabled={creating}>
                            {creating ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : null}
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!renaming}
                onOpenChange={(o) => !o && setRenaming(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {renaming?.type === 'group'
                                ? 'Renommer le groupe'
                                : 'Renommer la page'}
                        </DialogTitle>
                    </DialogHeader>
                    {renaming && (
                        <Input
                            autoFocus
                            value={renaming.name}
                            onChange={(e) =>
                                setRenaming({
                                    ...renaming,
                                    name: e.target.value,
                                })
                            }
                            onKeyDown={(e) => e.key === 'Enter' && doRename()}
                        />
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRenaming(null)}
                            disabled={busy}
                        >
                            Annuler
                        </Button>
                        <Button onClick={doRename} disabled={busy}>
                            {busy ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : null}
                            Renommer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </aside>
    );
};

function DraggablePageItem({
    page,
    pathname,
    canEdit,
    isDragOver,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onRename,
    onDuplicate,
    onDelete,
    onCopyUrl,
}: {
    page: { id: number; slug: string; name: string };
    pathname: string;
    canEdit: boolean;
    isDragOver: boolean;
    onDragStart: (e: React.DragEvent, pageId: number) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
    onRename: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onCopyUrl: () => void;
}) {
    const href = `/p/${page.slug}`;
    const active = pathname === href;
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className={`group relative rounded-md transition-colors ${isDragOver ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            onDragOver={onDragOver}
            onDragLeave={(e) => {
                e.preventDefault();
            }}
            onDrop={(e) => {
                e.preventDefault();
                onDrop();
            }}
        >
            <Link
                href={href}
                draggable
                onDragStart={(e) => onDragStart(e, page.id)}
                onDragEnd={onDragEnd}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    active
                        ? 'border-l-2 border-primary bg-primary/15 font-bold text-primary'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                }`}
            >
                <GripVertical className="h-3 w-3 shrink-0 cursor-grab opacity-30 active:cursor-grabbing" />
                <span className="flex-1 truncate">{page.name}</span>
            </Link>
            {canEdit && showActions && (
                <div className="absolute top-1/2 right-1 flex -translate-y-1/2 cursor-pointer items-center gap-0.5 rounded-md border border-border bg-sidebar/90 px-1 py-0.5 shadow-sm">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onRename();
                        }}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                        title="Renommer"
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onDuplicate();
                        }}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                        title="Dupliquer"
                    >
                        <Copy className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onCopyUrl();
                        }}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                        title="Copier l'URL"
                    >
                        <LinkIcon className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onDelete();
                        }}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Supprimer"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default Sidebar;
