import { Link } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    Eye,
    Globe,
    Pencil,
    Redo2,
    Save,
    Share2,
    Undo2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import ShareDialog from '@/components/builder/ShareDialog';
import { ExportMenu } from '@/components/pbi/ExportMenu';
import { FullscreenView } from '@/components/pbi/FullscreenView';
import { Button } from '@/components/ui/button';
import { usePbi } from '@/lib/pbi/store';
import { getCsrfToken, handleApiError, statusOfError } from '@/lib/session';
import { EditBody } from './edit-body';
import { formatDraftTime, type DraftPbi, type PageProps } from './helpers';
import { ViewBody } from './view-body';

export function Shell({
    pageId,
    slug,
    pageName,
    dirty,
    setDirty,
    editTick,
    layoutDraft,
    layoutDraftUpdatedAt,
    canEdit,
    canManage,
    isPublic,
    published,
}: {
    pageId: number;
    slug: string;
    pageName: string;
    dirty: boolean;
    setDirty: (v: boolean) => void;
    editTick: number;
    layoutDraft?: PageProps['layoutDraft'];
    layoutDraftUpdatedAt?: string | null;
    canEdit?: boolean;
    canManage?: boolean;
    isPublic?: boolean;
    published?: boolean;
}) {
    const { state, setState, undo, redo, canUndo, canRedo, fullscreen } =
        usePbi();
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const canEditPage = canEdit ?? true;
    const [publishedState, setPublishedState] = useState(() => !!published);
    const [publishBusy, setPublishBusy] = useState(false);
    const [sharing, setSharing] = useState(false);
    const savingRef = useRef(false);
    const draftSavingRef = useRef(false);
    const [checkpointAt, setCheckpointAt] = useState<string | null>(() =>
        layoutDraftUpdatedAt ? formatDraftTime(layoutDraftUpdatedAt) : null,
    );
    const [showDraftBanner, setShowDraftBanner] = useState(
        () => !!layoutDraft?.pbi?.pages?.length,
    );

    // Always-available latest snapshot for the interval + unload flush.
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    });
    // Most recent draft persisted this session, so restore uses the latest
    // checkpoint rather than the (possibly older) page-load snapshot.
    const latestDraftRef = useRef<{ version?: number; pbi?: DraftPbi } | null>(
        layoutDraft ?? null,
    );
    const lastSavedRef = useRef<string | null>(null);
    const dirtyRef = useRef(dirty);
    useEffect(() => {
        dirtyRef.current = dirty;
    });

    const flushDraft = useCallback(() => {
        const { measures: _measures, ...pbi } = stateRef.current;
        latestDraftRef.current = { version: 2, pbi };
        fetch(`/api/builder-pages/${pageId}`, {
            method: 'PUT',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify({ layout_draft: { version: 2, pbi } }),
        }).catch(() => {
            // best-effort flush; the committed layout is untouched.
        });
    }, [pageId]);

    const save = async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        try {
            // Measures live in the shared library, not the per-page layout.
            const { measures: _measures, ...pbi } = stateRef.current;
            await axios.put(`/api/builder-pages/${pageId}`, {
                layout: { version: 2, pbi },
            });
            toast.success('Layout enregistré');
            setDirty(false);
            setCheckpointAt(null);
            setShowDraftBanner(false);
            latestDraftRef.current = null;
            lastSavedRef.current = null;
        } catch (err) {
            if (handleApiError(statusOfError(err))) return;
            toast.error("Échec de l'enregistrement du layout");
        } finally {
            savingRef.current = false;
        }
    };

    const togglePublish = async () => {
        if (publishBusy) return;
        setPublishBusy(true);
        try {
            const next = !publishedState;
            await axios.put(`/api/builder-pages/${pageId}`, {
                published: next,
            });
            setPublishedState(next);
            toast.success(next ? 'Page publiée' : 'Page dépubliée');
        } catch (err) {
            if (!handleApiError(statusOfError(err))) {
                toast.error("Échec de la mise à jour de la publication");
            }
        } finally {
            setPublishBusy(false);
        }
    };

    const checkpoint = useCallback(async () => {
        if (draftSavingRef.current) return;
        const { measures: _measures, ...pbi } = stateRef.current;
        const serialized = JSON.stringify(pbi);
        if (serialized === lastSavedRef.current) return;
        draftSavingRef.current = true;
        try {
            await axios.put(`/api/builder-pages/${pageId}`, {
                layout_draft: { version: 2, pbi },
            });
            lastSavedRef.current = serialized;
            latestDraftRef.current = { version: 2, pbi };
            setCheckpointAt(
                new Date().toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            );
        } catch (err) {
            if (!handleApiError(statusOfError(err))) {
                toast.error('Impossible de sauvegarder le brouillon');
            }
        } finally {
            draftSavingRef.current = false;
        }
    }, [pageId]);

    const discardDraft = async () => {
        try {
            await axios.put(`/api/builder-pages/${pageId}`, {
                layout_draft: null,
            });
            latestDraftRef.current = null;
            lastSavedRef.current = null;
            setShowDraftBanner(false);
            setCheckpointAt(null);
        } catch (err) {
            if (!handleApiError(statusOfError(err))) {
                toast.error("Impossible d'ignorer le brouillon");
            }
        }
    };

    // Checkpoint autosave: persist 5s after the last persistence-relevant
    // change. Only real edits bump editTick (transient hover / selection
    // activity is filtered out upstream), so the timer resets on actual
    // interactions and cannot be starved by passive mouse movement.
    useEffect(() => {
        if (!dirty) return;
        const timer = setTimeout(() => {
            void checkpoint();
        }, 5000);
        return () => clearTimeout(timer);
    }, [dirty, checkpoint, editTick]);

    // Flush the latest draft when the page unloads (reload/navigation) so
    // edits made right before leaving are not lost. keepalive lets the request
    // complete during unload.
    useEffect(() => {
        if (!dirty) return;
        const handler = () => flushDraft();
        window.addEventListener('pagehide', handler);
        return () => window.removeEventListener('pagehide', handler);
    }, [dirty, flushDraft]);

    // Also flush on unmount, which covers in-app (Inertia) navigation away
    // from the editor where pagehide does not fire.
    useEffect(() => {
        return () => {
            if (dirtyRef.current) flushDraft();
        };
    }, [flushDraft]);

    const restoreDraft = () => {
        const draft = latestDraftRef.current?.pbi;
        if (draft && Array.isArray(draft.pages) && draft.pages.length) {
            setState({
                ...JSON.parse(JSON.stringify(draft)),
                ribbonTab: 'Insertion',
            });
        }
        setShowDraftBanner(false);
    };

    // Undo/Redo keyboard shortcuts, active only while editing. Text editing
    // (inputs / textareas / contentEditable) keeps the browser's native undo.
    useEffect(() => {
        if (mode !== 'edit') return;
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable)
            )
                return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            } else if (
                (e.ctrlKey || e.metaKey) &&
                e.key.toLowerCase() === 'y'
            ) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [mode, undo, redo]);

    if (fullscreen) {
        return <FullscreenView />;
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-panel px-3">
                <div className="flex min-w-0 items-center gap-3">
                    {!isPublic && (
                        <Link href="/">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-[11px] tracking-wider uppercase"
                            >
                                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Pages
                            </Button>
                        </Link>
                    )}
                    <div className="min-w-0">
                        <div className="truncate text-[13px] font-bold">
                            {pageName}
                        </div>
                        <div className="truncate font-mono text-[10px] text-muted-foreground">
                            {isPublic ? `/pub/${slug}` : `/p/${slug}`}
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {canEditPage && !isPublic && (
                        <>
                            {publishedState && (
                                <a
                                    href={`/pub/${slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/20"
                                    title={`Lien public : /pub/${slug}`}
                                >
                                    <Globe className="h-3.5 w-3.5" /> Publié
                                </a>
                            )}
                            <Button
                                size="sm"
                                variant={publishedState ? 'outline' : 'default'}
                                className="h-8 text-[11px]"
                                disabled={publishBusy}
                                onClick={togglePublish}
                            >
                                <Globe className="mr-1 h-3.5 w-3.5" />{' '}
                                {publishedState ? 'Dépublier' : 'Publier'}
                            </Button>
                        </>
                    )}
                    {canManage && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[11px]"
                            onClick={() => setSharing(true)}
                        >
                            <Share2 className="mr-1 h-3.5 w-3.5" /> Partager
                        </Button>
                    )}
                    {mode === 'edit' ? (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={undo}
                                disabled={!canUndo}
                                title="Annuler (Ctrl+Z)"
                            >
                                <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={redo}
                                disabled={!canRedo}
                                title="Rétablir (Ctrl+Shift+Z)"
                            >
                                <Redo2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="sm"
                                onClick={save}
                                className="h-8 text-[11px]"
                            >
                                <Save className="mr-1 h-3.5 w-3.5" />
                                Enregistrer{dirty ? ' *' : ''}
                            </Button>
                            {checkpointAt && (
                                <span className="text-[10px] text-muted-foreground">
                                    Brouillon {checkpointAt}
                                </span>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-[11px]"
                                onClick={() => setMode('view')}
                            >
                                <Eye className="mr-1 h-3.5 w-3.5" /> Voir
                            </Button>
                        </>
                    ) : (
                        <>
                            <ExportMenu />
                            {canEditPage && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-[11px]"
                                    onClick={() => setMode('edit')}
                                >
                                    <Pencil className="mr-1 h-3 w-3" /> Modifier
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </header>

            {showDraftBanner && canEditPage && (
                <div className="flex items-center justify-between gap-3 border-b border-border bg-brand/15 px-3 py-1.5 text-[11px] text-foreground">
                    <span>
                        {checkpointAt
                            ? `Un brouillon sauvegardé à ${checkpointAt} est disponible pour cette page.`
                            : 'Un brouillon est disponible pour cette page.'}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                        <button
                            onClick={restoreDraft}
                            className="font-medium underline hover:text-brand"
                        >
                            Restaurer le brouillon
                        </button>
                        <button
                            onClick={discardDraft}
                            className="text-muted-foreground underline hover:text-foreground"
                        >
                            Ignorer
                        </button>
                    </div>
                </div>
            )}

            {mode === 'view' ? <ViewBody /> : <EditBody />}
            <ShareDialog
                open={sharing}
                onOpenChange={setSharing}
                pageId={pageId}
                pageName={pageName}
            />
        </div>
    );
}