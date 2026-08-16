import { usePage } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Eye,
    EyeOff,
    Filter as FilterIcon,
    Focus,
    MoreHorizontal,
    Trash2,
    Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { VisualExportButton } from '@/components/pbi/VisualExportButton';
import { VisualView } from '@/components/pbi/VisualView';
import { crossFilterRows, enrichRows } from '@/lib/pbi/joins';
import {
    AGG_LABELS,
    KIND_LABELS,
    isReliableHop,
    type WizardSpec,
} from '@/lib/pbi/measureWizard';
import {
    compileListMeasure,
    evaluateMeasure,
    isSlicerVisual,
    listMeasureSource,
    visualTable,
    visualTitleStyle,
    type Field,
    type Interaction,
    type Row,
    type Visual,
} from '@/lib/pbi/model';
import {
    defaultDropWell,
    usePbi,
    visualDataTable,
    visualTypeLabel,
} from '@/lib/pbi/store';
import { uploadPageImage } from '@/lib/pbi/uploadImage';
import { cn } from '@/lib/utils';
import { PageBoundaryOverlay } from './boundary';
import { MenuItem } from './menu';
import { ResizeHandle } from './resize';
import { TooltipPagePopup } from './tooltip';
import { CENTER_TOL, GRID, type DragMember, type DragState, type LiveGeo } from './types';

export function Canvas({
    readOnly = false,
    fit = false,
}: {
    readOnly?: boolean;
    fit?: boolean;
}) {
    const {
        page,
        rows,
        tableRows,
        tables,
        joins,
        selected,
        selectedIds,
        setSelectedIds,
        select,
        updateVisualSingle,
        removeVisuals,
        duplicateVisual,
        showGridlines,
        snapToGrid,
        zoom,
        setZoom,
        mobileView,
        addVisual,
        dropField,
        bringForward,
        sendBackward,
        toggleVisualHidden,
        editInteractions,
        interactionFor,
        setInteraction,
        drill,
        openDrillthrough,
        clearCrossFilter,
        crossFilter,
        measures,
        graph,
        smartNetwork,
    } = usePbi();

    const [drag, setDrag] = useState<DragState | null>(null);
    const [live, setLive] = useState<Record<string, LiveGeo> | null>(null);
    const [marquee, setMarquee] = useState<{
        x0: number;
        y0: number;
        x: number;
        y: number;
        ctrl: boolean;
    } | null>(null);
    const [menu, setMenu] = useState<{
        id: string;
        x: number;
        y: number;
    } | null>(null);
    const [records, setRecords] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const fitRef = useRef<HTMLDivElement>(null);
    const dragMovedRef = useRef(false);
    const [fitSize, setFitSize] = useState<{ w: number; h: number } | null>(
        null,
    );
    const scale = zoom / 100;
    const latestLiveRef = useRef<Record<string, LiveGeo> | null>(null);
    const rafRef = useRef<number | null>(null);
    const { pageId } = usePage().props as unknown as { pageId: number };

    // Render the live drag geometry at most once per animation frame (the
    // store is left untouched while dragging, then committed on mouse-up).
    const scheduleLive = useCallback(() => {
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const g = latestLiveRef.current;
            if (g) setLive(g);
        });
    }, []);

    const endDrag = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        const g = latestLiveRef.current;
        latestLiveRef.current = null;
        if (g) {
            for (const [id, geo] of Object.entries(g)) {
                updateVisualSingle(id, {
                    x: geo.x,
                    y: geo.y,
                    w: geo.w,
                    h: geo.h,
                });
            }
        }
        setLive(null);
        setDrag(null);
    }, [updateVisualSingle]);

    const startMarquee = (e: React.MouseEvent) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        setMarquee({
            x0: x,
            y0: y,
            x,
            y,
            ctrl: e.ctrlKey || e.metaKey,
        });
    };

    const endGesture = (_e: React.MouseEvent) => {
        if (marquee) {
            const m = marquee;
            const l = Math.min(m.x0, m.x);
            const t = Math.min(m.y0, m.y);
            const r = Math.max(m.x0, m.x);
            const b = Math.max(m.y0, m.y);
            const hits = page.visuals
                .filter((v) => !v.hidden)
                .filter(
                    (v) =>
                        !(v.x > r || v.x + v.w < l || v.y > b || v.y + v.h < t),
                )
                .map((v) => v.id);
            if (hits.length) {
                setSelectedIds(
                    m.ctrl
                        ? Array.from(new Set([...selectedIds, ...hits]))
                        : hits,
                );
            }
            setMarquee(null);
            return;
        }
        endDrag();
    };

    const startMove = (v: Visual, e: React.MouseEvent) => {
        e.preventDefault();
        const inSel = selectedIds.includes(v.id);
        const toggle = e.ctrlKey || e.metaKey;
        let ids: string[];
        if (toggle) {
            ids = inSel
                ? selectedIds.filter((x) => x !== v.id)
                : [...selectedIds, v.id];
        } else if (inSel) {
            ids = selectedIds;
        } else {
            ids = [v.id];
        }
        if (!ids.length) return;
        const members = ids
            .map((id) => {
                const s = page.visuals.find((x) => x.id === id);
                return s ? { id, ox: s.x, oy: s.y, ow: s.w, oh: s.h } : null;
            })
            .filter((x): x is DragMember => x !== null);
        setDrag({
            id: v.id,
            mode: 'move',
            startX: e.clientX,
            startY: e.clientY,
            ox: v.x,
            oy: v.y,
            ow: v.w,
            oh: v.h,
            group: members,
        });
    };

    const uploadImage = async (id: string, file: File) => {
        try {
            const url = await uploadPageImage(pageId, file);
            updateVisualSingle(id, { imageUrl: url });
            toast.success('Image téléversée');
        } catch {
            toast.error("Échec du téléversement de l'image");
        }
    };

    useEffect(() => {
        if (readOnly) return;
        const el = ref.current;
        if (!el) return;
        const handler = (e: WheelEvent) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            setZoom(Math.min(300, Math.max(25, Math.round(zoom * factor))));
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [zoom, setZoom, readOnly]);

    useEffect(() => {
        if (!fit) return;
        const el = fitRef.current;
        if (!el) return;
        const measure = () =>
            setFitSize({ w: el.clientWidth, h: el.clientHeight });
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [fit]);

    const snap = useCallback(
        (n: number) =>
            snapToGrid ? Math.round(n / GRID) * GRID : Math.round(n),
        [snapToGrid],
    );

    const onMouseMove = (e: React.MouseEvent) => {
        if (marquee || drag) dragMovedRef.current = true;
        if (marquee) {
            const rect = ref.current?.getBoundingClientRect();
            if (rect) {
                setMarquee({
                    ...marquee,
                    x: (e.clientX - rect.left) / scale,
                    y: (e.clientY - rect.top) / scale,
                });
            }
            return;
        }
        if (!drag) return;
        const dx = (e.clientX - drag.startX) / scale;
        const dy = (e.clientY - drag.startY) / scale;
        if (drag.mode === 'move') {
            const newX = Math.max(0, snap(drag.ox + dx));
            const newY = Math.max(0, snap(drag.oy + dy));
            const ddx = newX - drag.ox;
            const ddy = newY - drag.oy;
            const members = drag.group ?? [
                {
                    id: drag.id,
                    ox: drag.ox,
                    oy: drag.oy,
                    ow: drag.ow,
                    oh: drag.oh,
                },
            ];
            const record: Record<string, LiveGeo> = {};
            for (const m of members) {
                record[m.id] = {
                    x: Math.max(0, snap(m.ox + ddx)),
                    y: Math.max(0, snap(m.oy + ddy)),
                    w: m.ow,
                    h: m.oh,
                };
            }
            latestLiveRef.current = record;
            scheduleLive();
            return;
        }
        const dir = drag.dir ?? 'se';
        const hasN = dir.includes('n');
        const hasS = dir.includes('s');
        const hasW = dir.includes('w');
        const hasE = dir.includes('e');
        let x = drag.ox;
        let y = drag.oy;
        let w = drag.ow;
        let h = drag.oh;
        if (hasW) x = snap(drag.ox + dx);
        if (hasN) y = snap(drag.oy + dy);
        if (hasE) w = snap(drag.ow + dx);
        if (hasS) h = snap(drag.oh + dy);
        if (hasW) w = drag.ow - (x - drag.ox);
        if (hasN) h = drag.oh - (y - drag.oy);
        x = Math.max(0, x);
        y = Math.max(0, y);
        if (w < 80) {
            if (hasW) x -= 80 - w;
            w = 80;
        }
        if (h < 60) {
            if (hasN) y -= 60 - h;
            h = 60;
        }
        x = Math.max(0, x);
        y = Math.max(0, y);
        latestLiveRef.current = { [drag.id]: { x, y, w, h } };
        scheduleLive();
    };

    useEffect(() => {
        const close = () => setMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    useEffect(
        () => () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        },
        [],
    );

    /** Delete/Backspace removes the whole selection, mirroring how moving a
     * selection drags every member together. Ignored while typing or when the
     * context menu / records modal is open. */
    useEffect(() => {
        if (readOnly) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable)
            )
                return;
            if (menu || records) return;
            if (!(selectedIds ?? []).length) return;
            e.preventDefault();
            removeVisuals(selectedIds);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [readOnly, menu, records, selectedIds, removeVisuals]);

    /** Delete the clicked visual alone, or the entire selection when it is a
     * member of a multi-selection (consistent with moving a group). */
    const deleteVisual = (id: string) => {
        const ids =
            (selectedIds ?? []).length > 1 && selectedIds.includes(id)
                ? selectedIds
                : [id];
        removeVisuals(ids);
    };

    const liveMaxX =
        drag && live
            ? Math.max(0, ...Object.values(live).map((g) => g.x + g.w))
            : 0;
    const liveMaxY =
        drag && live
            ? Math.max(0, ...Object.values(live).map((g) => g.y + g.h))
            : 0;
    const width = mobileView
        ? 360
        : Math.max(
              Math.ceil(
                  page.visuals.reduce(
                      (m, v) => (v.hidden ? m : Math.max(m, v.x + v.w)),
                      page.format.width,
                  ),
              ),
              liveMaxX,
          );
    const height = mobileView
        ? 740
        : Math.max(
              Math.ceil(
                  page.visuals.reduce(
                      (m, v) => (v.hidden ? m : Math.max(m, v.y + v.h)),
                      page.format.height,
                  ),
              ),
              liveMaxY,
          );

    const ordered = [...page.visuals].sort((a, b) => a.z - b.z);
    const menuVisual = page.visuals.find((v) => v.id === menu?.id) ?? null;
    const showBoundary = !readOnly && !mobileView;

    const fitScale =
        fit && fitSize && fitSize.w > 0 && fitSize.h > 0
            ? Math.min(fitSize.w / width, fitSize.h / height)
            : 1;
    const renderScale = fit ? fitScale : scale;

    const dragGeo = drag && live ? (live[drag.id] ?? null) : null;
    const pageW = page.format.width;
    const pageH = page.format.height;
    const tileCols = Math.max(1, Math.floor(width / pageW));
    const tileRows = Math.max(1, Math.floor(height / pageH));
    const tileCentersX = Array.from(
        { length: tileCols },
        (_, c) => c * pageW + pageW / 2,
    );
    const tileCentersY = Array.from(
        { length: tileRows },
        (_, r) => r * pageH + pageH / 2,
    );
    const near = (a: number, b: number) => Math.abs(a - b) < CENTER_TOL;
    const guideX =
        showBoundary && dragGeo
            ? (tileCentersX.find(
                  (center) =>
                      near(dragGeo.x, center) ||
                      near(dragGeo.x + dragGeo.w, center) ||
                      near(dragGeo.x + dragGeo.w / 2, center),
              ) ?? null)
            : null;
    const guideY =
        showBoundary && dragGeo
            ? (tileCentersY.find(
                  (center) =>
                      near(dragGeo.y, center) ||
                      near(dragGeo.y + dragGeo.h, center) ||
                      near(dragGeo.y + dragGeo.h / 2, center),
              ) ?? null)
            : null;

    return (
        <div
            ref={fitRef}
            className={cn(
                'flex min-h-full w-full',
                !fit && 'p-6',
                fit && 'items-center justify-center',
            )}
        >
            <div
                className="mx-auto"
                style={{
                    width: width * renderScale,
                    height: height * renderScale,
                }}
            >
                <div
                    ref={ref}
                    onMouseDown={(e) => {
                        if (readOnly) return;
                        dragMovedRef.current = false;
                        if (e.target === e.currentTarget) startMarquee(e);
                    }}
                    onMouseMove={readOnly ? undefined : onMouseMove}
                    onMouseUp={readOnly ? undefined : endGesture}
                    onMouseLeave={readOnly ? undefined : endGesture}
                    onClick={(e) => {
                        if (readOnly) return;
                        if (dragMovedRef.current) {
                            dragMovedRef.current = false;
                            return;
                        }
                        if (e.target === e.currentTarget) select(null);
                    }}
                    onDragOver={(e) => {
                        if (readOnly) return;
                        e.preventDefault();
                    }}
                    onDrop={(e) => {
                        if (readOnly) return;
                        e.preventDefault();
                        const raw = e.dataTransfer.getData('text/plain');
                        if (!raw) return;
                        let name: unknown = raw;
                        let table: string | undefined;
                        try {
                            const payload = JSON.parse(raw);
                            if (payload?.name) {
                                name = payload.name;
                                table = payload.table;
                            }
                        } catch {
                            // plain field name
                        }
                        const id = addVisual('column');
                        dropField(id, defaultDropWell('column'), name, table);
                    }}
                    className={cn(
                        'relative origin-top-left overflow-hidden shadow-lg ring-1 ring-border',
                        (drag || marquee) && 'select-none',
                        showGridlines &&
                            !readOnly &&
                            'bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px]',
                    )}
                    style={{
                        width,
                        height,
                        transform: `scale(${renderScale})`,
                        backgroundColor: page.format.background,
                    }}
                >
                    {!page.visuals.length && (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Page vide — ajoutez un visuel à partir du panneau
                            Visualisations.
                        </div>
                    )}

                    {ordered.map((v) => {
                        if (v.hidden) return null;
                        const dataTable = visualDataTable(v, measures);
                        const vRows = isSlicerVisual(v)
                            ? (tables.find((t) => t.name === dataTable)?.rows ??
                              rows)
                            : (tableRows[dataTable] ?? rows);
                        const isSel = (selectedIds ?? []).includes(v.id);
                        const isElement =
                            v.type === 'text' || v.type === 'image';
                        const interactionTarget =
                            !readOnly &&
                            editInteractions &&
                            selected &&
                            selected.id !== v.id;
                        const mode: Interaction = selected
                            ? interactionFor(selected.id, v.id)
                            : 'filter';
                        const liveGeo = drag && live ? live[v.id] : null;
                        return (
                            <div
                                key={v.id}
                                data-testid={`visual-${v.id}`}
                                onMouseDown={(e) => {
                                    if (readOnly) return;
                                    select(v.id, {
                                        toggle: e.ctrlKey || e.metaKey,
                                    });
                                }}
                                onContextMenu={(e) => {
                                    if (readOnly) return;
                                    e.preventDefault();
                                    select(v.id);
                                    setMenu({
                                        id: v.id,
                                        x: e.clientX,
                                        y: e.clientY,
                                    });
                                }}
                                onDragOver={(e) => {
                                    if (readOnly) return;
                                    e.preventDefault();
                                }}
                                onDrop={(e) => {
                                    if (readOnly) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const file = e.dataTransfer.files?.[0];
                                    if (
                                        file &&
                                        v.type === 'image' &&
                                        file.type.startsWith('image/')
                                    ) {
                                        uploadImage(v.id, file);
                                        return;
                                    }
                                    const raw =
                                        e.dataTransfer.getData('text/plain');
                                    if (!raw) return;
                                    try {
                                        const payload = JSON.parse(raw);
                                        if (payload?.name)
                                            dropField(
                                                v.id,
                                                defaultDropWell(v.type),
                                                payload.name,
                                                payload.table,
                                            );
                                    } catch {
                                        dropField(
                                            v.id,
                                            defaultDropWell(v.type),
                                            raw,
                                        );
                                    }
                                }}
                                className={cn(
                                    'group absolute flex flex-col rounded p-2',
                                    v.border && v.type !== 'shape' && 'border',
                                    v.shadow && 'shadow-md',
                                    isSel &&
                                        !readOnly &&
                                        'outline outline-2 outline-brand',
                                )}
                                style={{
                                    left: liveGeo ? liveGeo.x : v.x,
                                    top: liveGeo ? liveGeo.y : v.y,
                                    width: liveGeo ? liveGeo.w : v.w,
                                    height: liveGeo ? liveGeo.h : v.h,
                                    zIndex: v.z,
                                    backgroundColor:
                                        v.type === 'shape'
                                            ? 'transparent'
                                            : v.background,
                                    ...(v.border &&
                                    v.borderColor &&
                                    v.type !== 'shape'
                                        ? { borderColor: v.borderColor }
                                        : {}),
                                    ...(v.borderWidth && v.type !== 'shape'
                                        ? { borderWidth: v.borderWidth }
                                        : {}),
                                    ...(v.radius !== undefined &&
                                    v.radius !== null &&
                                    v.type !== 'shape'
                                        ? { borderRadius: v.radius }
                                        : {}),
                                    ...(v.fontFamily
                                        ? { fontFamily: v.fontFamily }
                                        : {}),
                                }}
                                aria-label={v.altText || v.name}
                            >
                                {!readOnly || !isElement ? (
                                    <div
                                        onMouseDown={
                                            readOnly
                                                ? undefined
                                                : (e) => startMove(v, e)
                                        }
                                        className={cn(
                                            'relative flex items-center justify-between pb-1',
                                            !readOnly && 'cursor-move',
                                        )}
                                    >
                                        <span
                                            className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground"
                                            style={visualTitleStyle(v)}
                                        >
                                            {v.showTitle && !isElement
                                                ? v.title ||
                                                  visualTypeLabel(v.type)
                                                : ''}
                                        </span>
                                        {readOnly && (
                                            <span className="absolute top-1/2 right-0 flex -translate-y-1/2 items-center bg-white opacity-0 transition-opacity group-hover:opacity-100">
                                                <VisualExportButton
                                                    visual={v}
                                                />
                                            </span>
                                        )}
                                        {!readOnly && (
                                            <span className="absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-1 bg-white opacity-0 transition-opacity group-hover:opacity-100">
                                                {v.drillFields.length > 1 && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                drill(v.id, -1)
                                                            }
                                                            aria-label="Remonter"
                                                        >
                                                            <ChevronUp className="size-3 text-muted-foreground hover:text-foreground" />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                drill(v.id, 1)
                                                            }
                                                            aria-label="Descendre"
                                                        >
                                                            <ChevronDown className="size-3 text-muted-foreground hover:text-foreground" />
                                                        </button>
                                                    </>
                                                )}
                                                <FilterIcon className="size-3 text-muted-foreground" />
                                                <button
                                                    onClick={() =>
                                                        duplicateVisual(v.id)
                                                    }
                                                    aria-label="Dupliquer le visuel"
                                                >
                                                    <Copy className="size-3 text-muted-foreground hover:text-foreground" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        deleteVisual(v.id)
                                                    }
                                                    aria-label="Supprimer le visuel"
                                                >
                                                    <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenu({
                                                            id: v.id,
                                                            x: e.clientX,
                                                            y: e.clientY,
                                                        });
                                                    }}
                                                    aria-label="Plus d'options"
                                                >
                                                    <MoreHorizontal className="size-3 text-muted-foreground" />
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                ) : null}
                                <div className="min-h-0 flex-1">
                                    <VisualView visual={v} rows={vRows} />
                                </div>

                                {v.type === 'image' && !readOnly && (
                                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                                        <label
                                            className={cn(
                                                'pointer-events-auto flex cursor-pointer items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground shadow-sm hover:bg-accent',
                                                v.imageUrl &&
                                                    'opacity-0 transition-opacity group-hover:opacity-100',
                                            )}
                                        >
                                            <Upload className="size-3.5" />
                                            {v.imageUrl
                                                ? "Remplacer l'image"
                                                : 'Ajouter une image'}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file =
                                                        e.target.files?.[0];
                                                    if (file)
                                                        uploadImage(v.id, file);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}

                                {interactionTarget && (
                                    <div
                                        className="absolute top-1 right-1 z-10 flex gap-1 rounded bg-popover/95 p-1 shadow"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        {(
                                            [
                                                'filter',
                                                'highlight',
                                                'none',
                                            ] as Interaction[]
                                        ).map((m) => (
                                            <button
                                                key={m}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setInteraction(
                                                        selected!.id,
                                                        v.id,
                                                        m,
                                                    );
                                                }}
                                                className={cn(
                                                    'rounded px-1.5 py-0.5 text-[9px] capitalize',
                                                    mode === m
                                                        ? 'bg-brand text-brand-foreground'
                                                        : 'hover:bg-accent',
                                                )}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {!readOnly &&
                                    isSel &&
                                    selected?.id === v.id && (
                                        <>
                                            <ResizeHandle
                                                dir="n"
                                                visual={v}
                                                setDrag={setDrag}
                                            />
                                            <ResizeHandle
                                                dir="s"
                                                visual={v}
                                                setDrag={setDrag}
                                            />
                                            <ResizeHandle
                                                dir="e"
                                                visual={v}
                                                setDrag={setDrag}
                                            />
                                            <ResizeHandle
                                                dir="w"
                                                visual={v}
                                                setDrag={setDrag}
                                            />
                                            <ResizeHandle
                                                dir="nw"
                                                visual={v}
                                                setDrag={setDrag}
                                            />
                                            <ResizeHandle
                                                dir="ne"
                                                visual={v}
                                                setDrag={setDrag}
                                            />
                                            <ResizeHandle
                                                dir="sw"
                                                visual={v}
                                                setDrag={setDrag}
                                            />
                                            <ResizeHandle
                                                dir="se"
                                                visual={v}
                                                setDrag={setDrag}
                                            />
                                        </>
                                    )}
                            </div>
                        );
                    })}

                    {showBoundary && (
                        <PageBoundaryOverlay
                            pageWidth={page.format.width}
                            pageHeight={page.format.height}
                            canvasWidth={width}
                            canvasHeight={height}
                        />
                    )}

                    {guideX !== null && (
                        <div
                            className="pointer-events-none absolute z-30 w-px bg-red-500"
                            style={{ left: guideX, top: 0, height }}
                        />
                    )}
                    {guideY !== null && (
                        <div
                            className="pointer-events-none absolute z-30 h-px bg-red-500"
                            style={{ top: guideY, left: 0, width }}
                        />
                    )}

                    {marquee && (
                        <div
                            className="pointer-events-none absolute z-40 border border-brand/80 bg-brand/10"
                            style={{
                                left: Math.min(marquee.x0, marquee.x),
                                top: Math.min(marquee.y0, marquee.y),
                                width: Math.abs(marquee.x - marquee.x0),
                                height: Math.abs(marquee.y - marquee.y0),
                            }}
                        />
                    )}
                </div>
            </div>

            {!readOnly && menu && menuVisual && (
                <div
                    className="fixed z-50 w-52 rounded border border-border bg-popover py-1 text-[11px] shadow-lg"
                    style={{ left: menu.x, top: menu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem
                        label="Mettre au premier plan"
                        onClick={() => bringForward(menuVisual.id)}
                    />
                    <MenuItem
                        label="Envoyer à l'arrière-plan"
                        onClick={() => sendBackward(menuVisual.id)}
                    />
                    <MenuItem
                        label={menuVisual.hidden ? 'Afficher' : 'Masquer'}
                        icon={menuVisual.hidden ? Eye : EyeOff}
                        onClick={() => toggleVisualHidden(menuVisual.id)}
                    />
                    <MenuItem
                        label="Voir les enregistrements"
                        icon={Focus}
                        onClick={() => {
                            setRecords(menuVisual.id);
                            setMenu(null);
                        }}
                    />
                    <MenuItem
                        label="Explorer jusqu'au détail"
                        onClick={() => {
                            const col = menuVisual.axis[0]?.name;
                            const vRows =
                                tableRows[visualTable(menuVisual)] ?? rows;
                            const val =
                                crossFilter?.value ??
                                (col ? String(vRows[0]?.[col] ?? '') : '');
                            if (col && val) openDrillthrough(col, val);
                            setMenu(null);
                        }}
                    />
                    <MenuItem
                        label="Effacer le filtre croisé"
                        onClick={clearCrossFilter}
                    />
                    <MenuItem
                        label="Dupliquer"
                        onClick={() => duplicateVisual(menuVisual.id)}
                    />
                    <MenuItem
                        label="Supprimer"
                        onClick={() => deleteVisual(menuVisual.id)}
                    />
                </div>
            )}

            {!readOnly && records && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8"
                    onClick={() => setRecords(null)}
                >
                    <div
                        className="max-h-[70vh] w-full max-w-4xl overflow-auto rounded bg-card p-4 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-2 text-sm font-semibold">
                            Enregistrements du point de données
                        </h3>
                        {(() => {
                            const recordsVisual = page.visuals.find(
                                (v) => v.id === records,
                            );
                            if (!recordsVisual) return null;
                            const vt = visualTable(recordsVisual);
                            const measureExpressions = measures.reduce<
                                Record<string, string>
                            >((acc, m) => {
                                if (m.expression) acc[m.name] = m.expression;
                                return acc;
                            }, {});

                            // Find a wizard-created measure behind this visual so
                            // we can show its joins + DAX alongside the records.
                            const wellLists = [
                                recordsVisual.axis,
                                recordsVisual.legend,
                                recordsVisual.values,
                                recordsVisual.drillFields,
                                recordsVisual.smallMultiples,
                                recordsVisual.tooltips,
                                recordsVisual.minimum ?? [],
                                recordsVisual.maximum ?? [],
                                recordsVisual.target ?? [],
                            ];
                            let wizardMeasure: Field | null = null;
                            for (const well of wellLists) {
                                for (const f of well ?? []) {
                                    const m = measures.find(
                                        (x) =>
                                            x.table === 'Measures' &&
                                            x.name === String(f?.name ?? '') &&
                                            x.config,
                                    );
                                    if (m) {
                                        wizardMeasure = m;
                                        break;
                                    }
                                }
                                if (wizardMeasure) break;
                            }
                            let wizardSpec: WizardSpec | null = null;
                            const rawConfig = wizardMeasure?.config;
                            if (rawConfig) {
                                try {
                                    wizardSpec =
                                        typeof rawConfig === 'string'
                                            ? (JSON.parse(
                                                  rawConfig,
                                              ) as WizardSpec)
                                            : (rawConfig as WizardSpec);
                                } catch {
                                    wizardSpec = null;
                                }
                            }

                            // A measure-only visual has no physical rows to dump:
                            // evaluate the measure honestly through the engine so
                            // the "records" are what the measure actually returns.
                            const allWellTables = wellLists.flatMap((w) =>
                                (w ?? []).map((f) => String(f?.table ?? '')),
                            );
                            const measureOnly =
                                allWellTables.length > 0 &&
                                allWellTables.every((t) => t === 'Measures');

                            let recordsRows: Row[] = [];
                            let keys: string[] = [];
                            let sourceRows: Row[] = [];
                            let sourceKeys: string[] = [];
                            let sourceTableLabel = '';

                            if (measureOnly) {
                                const measureField = measures.find(
                                    (m) =>
                                        m.table === 'Measures' &&
                                        wellLists.some((w) =>
                                            (w ?? []).some(
                                                (f) => f?.name === m.name,
                                            ),
                                        ),
                                );
                                const expr =
                                    measureField?.expression ??
                                    wizardMeasure?.expression ??
                                    '';
                                // List detection works from the expression
                                // alone (VALUES/DISTINCT), so DAX-created
                                // measures render their distinct column values
                                // even without a saved wizard config.
                                const compiled = compileListMeasure(expr);
                                const listSource = listMeasureSource(expr);
                                const column =
                                    wizardSpec?.column ||
                                    listSource?.column ||
                                    'Valeur';
                                if (compiled && listSource) {
                                    let values: string[] = [];
                                    try {
                                        const out = compiled([], {});
                                        values = Array.isArray(out) ? out : [];
                                    } catch {
                                        values = [];
                                    }
                                    recordsRows = values.map((v) => ({
                                        [column]: v,
                                    }));
                                    keys = [column];
                                    const toTable =
                                        wizardSpec?.to || listSource.table;
                                    sourceTableLabel = toTable || '';
                                    if (values.length > 0 && toTable) {
                                        const target = tables.find(
                                            (t) => t.name === toTable,
                                        );
                                        if (target) {
                                            const wanted = new Set(
                                                values.map((v) =>
                                                    String(v).trim(),
                                                ),
                                            );
                                            sourceRows = target.rows
                                                .filter(
                                                    (r) =>
                                                        r[column] !==
                                                            undefined &&
                                                        wanted.has(
                                                            String(
                                                                r[column],
                                                            ).trim(),
                                                        ),
                                                )
                                                .slice(0, 100);
                                            sourceKeys = target.fields.map(
                                                (f) => f.name,
                                            );
                                        }
                                    }
                                } else {
                                    // Scalar measure (incl. built-ins).
                                    const r = evaluateMeasure(expr, []);
                                    recordsRows = [
                                        {
                                            Valeur:
                                                typeof r.value === 'number'
                                                    ? r.value
                                                    : 0,
                                        },
                                    ];
                                    keys = ['Valeur'];
                                }
                            } else {
                                const base = tableRows[vt] ?? rows;
                                const enriched = enrichRows(
                                    recordsVisual,
                                    base,
                                    tables,
                                    joins,
                                    measureExpressions,
                                );
                                recordsRows = crossFilterRows(
                                    enriched,
                                    crossFilter,
                                    recordsVisual.id,
                                    vt,
                                    recordsVisual.axis.some(
                                        (f) => f.name === crossFilter?.column,
                                    ),
                                    interactionFor(
                                        crossFilter?.sourceId ?? '',
                                        recordsVisual.id,
                                    ),
                                    joins,
                                    tables,
                                    graph,
                                    smartNetwork,
                                ).rows.slice(0, 100);
                                keys = [
                                    ...new Set(
                                        recordsRows.flatMap((r) =>
                                            Object.keys(r),
                                        ),
                                    ),
                                ];
                            }
                            return (
                                <>
                                    {wizardSpec && wizardMeasure && (
                                        <div className="mb-3 rounded-lg border border-brand/30 bg-brand/5 p-3">
                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                <span className="text-[11px] font-semibold text-brand">
                                                    Mesure créée avec
                                                    l’assistant
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {wizardMeasure.name}
                                                </span>
                                            </div>
                                            {wizardSpec.hops.length > 0 && (
                                                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                                                    {[
                                                        wizardSpec.hops[0]!
                                                            .from,
                                                        ...wizardSpec.hops.map(
                                                            (h) => h.to,
                                                        ),
                                                    ].map(
                                                        (node, i, arr) => (
                                                            <span
                                                                key={`${node}-${i}`}
                                                                className="flex items-center gap-1.5"
                                                            >
                                                                {i > 0 && (
                                                                    <>
                                                                        <span
                                                                            className={cn(
                                                                                'rounded border px-1.5 py-0.5 font-mono',
                                                                                isReliableHop(
                                                                                    wizardSpec
                                                                                        .hops[
                                                                                        i -
                                                                                            1
                                                                                    ]!,
                                                                                )
                                                                                    ? 'border-emerald-500/40 text-emerald-700'
                                                                                    : 'border-red-400 text-red-600',
                                                                            )}
                                                                        >
                                                                            {
                                                                            wizardSpec
                                                                                .hops[
                                                                                i -
                                                                                    1
                                                                            ]!
                                                                                .fromCol
                                                                        }
                                                                            ↔
                                                                            {
                                                                            wizardSpec
                                                                                .hops[
                                                                                i -
                                                                                    1
                                                                            ]!
                                                                                .toCol
                                                                        }
                                                                        </span>
                                                                        <span>
                                                                            →
                                                                        </span>
                                                                    </>
                                                                )}
                                                                <span
                                                                    className={cn(
                                                                    'rounded-md border px-2 py-0.5 font-medium',
                                                                    i === 0 ||
                                                                        i ===
                                                                            arr.length -
                                                                                1
                                                                        ? 'border-brand/40 bg-brand/10'
                                                                        : 'border-border bg-background',
                                                                    )}
                                                                >
                                                                    {node}
                                                                </span>
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                            <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                                <span>
                                                    Résultat :{' '}
                                                    <b className="text-foreground">
                                                        {KIND_LABELS[
                                                            wizardSpec.kind
                                                        ] ?? wizardSpec.kind}
                                                    </b>
                                                </span>
                                                {wizardSpec.kind ===
                                                    'number' && (
                                                    <span>
                                                        Agrégation :{' '}
                                                        <b className="text-foreground">
                                                            {AGG_LABELS[
                                                                wizardSpec.agg
                                                            ] ?? wizardSpec.agg}
                                                        </b>
                                                    </span>
                                                )}
                                                {wizardSpec.kind !==
                                                    'countrows' && (
                                                    <span>
                                                        Colonne :{' '}
                                                        <b className="font-mono text-foreground">
                                                            {wizardSpec.column}
                                                        </b>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-semibold">
                                                DAX
                                            </div>
                                            <pre className="mt-1 overflow-auto rounded-md border border-border bg-muted p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                                                {wizardMeasure.expression}
                                            </pre>
                                        </div>
                                    )}
                                    <table className="w-full text-[11px]">
                                        <thead className="sticky top-0 bg-muted">
                                            <tr>
                                                {keys.map((k) => (
                                                    <th
                                                        key={k}
                                                        className="border-b border-border px-2 py-1 text-left"
                                                    >
                                                        {k}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recordsRows.map((r, i) => (
                                                <tr
                                                    key={i}
                                                    className="hover:bg-accent"
                                                >
                                                    {keys.map((k) => (
                                                        <td
                                                            key={k}
                                                            className="border-b border-border px-2 py-1"
                                                        >
                                                            {String(r[k])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {sourceRows.length > 0 && (
                                        <div className="mt-4">
                                            <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                                                Lignes source correspondantes
                                                (table {sourceTableLabel})
                                            </div>
                                            <table className="w-full text-[11px]">
                                                <thead className="sticky top-0 bg-muted">
                                                    <tr>
                                                        {sourceKeys.map((k) => (
                                                            <th
                                                                key={k}
                                                                className="border-b border-border px-2 py-1 text-left"
                                                            >
                                                                {k}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sourceRows.map((r, i) => (
                                                        <tr
                                                            key={i}
                                                            className="hover:bg-accent"
                                                        >
                                                            {sourceKeys.map(
                                                                (k) => (
                                                                    <td
                                                                        key={k}
                                                                        className="border-b border-border px-2 py-1"
                                                                    >
                                                                        {String(
                                                                            r[
                                                                                k
                                                                            ],
                                                                        )}
                                                                    </td>
                                                                ),
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            <TooltipPagePopup />
        </div>
    );
}