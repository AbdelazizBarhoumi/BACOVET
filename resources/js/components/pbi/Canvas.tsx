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
import { crossFilterRows, enrichRows } from '@/lib/pbi/joins';
import {
    isSlicerVisual,
    visualTable,
    visualTitleStyle,
    type Interaction,
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
import { VisualExportButton } from './VisualExportButton';
import { VisualView } from './VisualView';

const GRID = 8;

const CENTER_TOL = 4;

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

type LiveGeo = { x: number; y: number; w: number; h: number };

type DragMember = {
    id: string;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
};

type DragState = {
    id: string;
    mode: 'move' | 'resize';
    dir?: ResizeDir;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
    group?: DragMember[];
};

const POPUP_WIDTH = 280;
const POPUP_HEIGHT = 200;

/** Floating tooltip page shown on hover of a visual that has a tooltipPageId. */
function TooltipPagePopup() {
    const { tooltipHover, pages, page, tableRows, rows } = usePbi();
    const [pos, setPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, []);

    if (!tooltipHover) return null;
    const source = page.visuals.find((v) => v.id === tooltipHover.sourceId);
    const tooltipPage = source?.tooltipPageId
        ? pages.find((p) => p.id === source.tooltipPageId)
        : null;
    if (!tooltipPage) return null;

    const tpVisuals = tooltipPage.visuals.filter((v) => !v.hidden);
    if (!tpVisuals.length) return null;

    const scale = Math.min(
        POPUP_WIDTH / tooltipPage.format.width,
        POPUP_HEIGHT / tooltipPage.format.height,
        1,
    );
    const x = Math.max(
        8,
        Math.min(pos.x + 14, window.innerWidth - POPUP_WIDTH - 8),
    );
    const y = Math.max(
        8,
        Math.min(pos.y + 14, window.innerHeight - POPUP_HEIGHT - 8),
    );

    return (
        <div
            className="pointer-events-none fixed z-50 overflow-hidden rounded border border-border bg-card shadow-xl"
            style={{
                left: x,
                top: y,
                width: POPUP_WIDTH,
                height: POPUP_HEIGHT,
                backgroundColor: tooltipPage.format.background,
            }}
        >
            <div
                className="relative"
                style={{
                    width: tooltipPage.format.width,
                    height: tooltipPage.format.height,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }}
            >
                {tpVisuals.map((tv) => {
                    const base = tableRows[visualTable(tv)] ?? rows;
                    const hovered = base.filter(
                        (r) =>
                            String(r[tooltipHover.column]) ===
                            tooltipHover.value,
                    );
                    return (
                        <div
                            key={tv.id}
                            className="absolute p-1"
                            style={{
                                left: tv.x,
                                top: tv.y,
                                width: tv.w,
                                height: tv.h,
                            }}
                        >
                            <VisualView visual={tv} rows={hovered} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function Canvas({ readOnly = false }: { readOnly?: boolean }) {
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
        updateVisual,
        removeVisual,
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
    const scale = zoom / 100;
    const ref = useRef<HTMLDivElement>(null);
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
                updateVisual(id, {
                    x: geo.x,
                    y: geo.y,
                    w: geo.w,
                    h: geo.h,
                });
            }
        }
        setLive(null);
        setDrag(null);
    }, [updateVisual]);

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
                return s
                    ? { id, ox: s.x, oy: s.y, ow: s.w, oh: s.h }
                    : null;
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
            updateVisual(id, { imageUrl: url });
            toast.success('Image téléversée');
        } catch {
            toast.error("Échec du téléversement de l'image");
        }
    };

    useEffect(() => {
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
    }, [zoom, setZoom]);

    const snap = useCallback(
        (n: number) =>
            snapToGrid ? Math.round(n / GRID) * GRID : Math.round(n),
        [snapToGrid],
    );

    const onMouseMove = (e: React.MouseEvent) => {
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

    const liveMaxX =
        drag && live ? Math.max(0, ...Object.values(live).map((g) => g.x + g.w)) : 0;
    const liveMaxY =
        drag && live ? Math.max(0, ...Object.values(live).map((g) => g.y + g.h)) : 0;
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
                  (c) =>
                      near(dragGeo.x, c) ||
                      near(dragGeo.x + dragGeo.w, c) ||
                      near(dragGeo.x + dragGeo.w / 2, c),
              ) ?? null)
            : null;
    const guideY =
        showBoundary && dragGeo
            ? (tileCentersY.find(
                  (c) =>
                      near(dragGeo.y, c) ||
                      near(dragGeo.y + dragGeo.h, c) ||
                      near(dragGeo.y + dragGeo.h / 2, c),
              ) ?? null)
            : null;

    return (
        <div className="flex min-h-full w-full p-6">
            <div
                className="mx-auto"
                style={{ width: width * scale, height: height * scale }}
            >
                <div
                    ref={ref}
                    onMouseDown={(e) => {
                        if (readOnly) return;
                        if (e.target === e.currentTarget) startMarquee(e);
                    }}
                    onMouseMove={readOnly ? undefined : onMouseMove}
                    onMouseUp={readOnly ? undefined : endGesture}
                    onMouseLeave={readOnly ? undefined : endGesture}
                    onClick={(e) =>
                        !readOnly &&
                        e.target === e.currentTarget &&
                        select(null)
                    }
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
                        transform: `scale(${scale})`,
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
                                                        removeVisual(v.id)
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
                                                : "Ajouter une image"}
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

                                {!readOnly && isSel && selected?.id === v.id && (
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
                        onClick={() => removeVisual(menuVisual.id)}
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
                            const base =
                                tableRows[visualTable(recordsVisual)] ?? rows;
                            const vt = visualTable(recordsVisual);
                            const measureExpressions = measures.reduce<
                                Record<string, string>
                            >((acc, m) => {
                                if (m.expression) acc[m.name] = m.expression;
                                return acc;
                            }, {});
                            const enriched = enrichRows(
                                recordsVisual,
                                base,
                                tables,
                                joins,
                                measureExpressions,
                            );
                            const recordsRows = crossFilterRows(
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
                            const keys = [
                                ...new Set(
                                    recordsRows.flatMap((r) => Object.keys(r)),
                                ),
                            ];
                            return (
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
                            );
                        })()}
                    </div>
                </div>
            )}

            <TooltipPagePopup />
        </div>
    );
}

const HANDLE_POS: Record<ResizeDir, { className: string; cursor: string }> = {
    n: {
        className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-6',
        cursor: 'cursor-n-resize',
    },
    s: {
        className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-2 w-6',
        cursor: 'cursor-s-resize',
    },
    e: {
        className: 'top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-2 h-6',
        cursor: 'cursor-e-resize',
    },
    w: {
        className: 'top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-2 h-6',
        cursor: 'cursor-w-resize',
    },
    nw: {
        className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 size-3',
        cursor: 'cursor-nwse-resize',
    },
    ne: {
        className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 size-3',
        cursor: 'cursor-nesw-resize',
    },
    sw: {
        className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 size-3',
        cursor: 'cursor-nesw-resize',
    },
    se: {
        className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 size-3',
        cursor: 'cursor-nwse-resize',
    },
};

function ResizeHandle({
    dir,
    visual: v,
    setDrag,
}: {
    dir: ResizeDir;
    visual: Visual;
    setDrag: (d: DragState) => void;
}) {
    const pos = HANDLE_POS[dir];
    return (
        <div
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDrag({
                    id: v.id,
                    mode: 'resize',
                    dir,
                    startX: e.clientX,
                    startY: e.clientY,
                    ox: v.x,
                    oy: v.y,
                    ow: v.w,
                    oh: v.h,
                });
            }}
            className={cn(
                'absolute z-20 rounded-sm bg-brand/60 hover:bg-brand',
                pos.className,
                pos.cursor,
            )}
        />
    );
}

function PageBoundaryOverlay({
    pageWidth,
    pageHeight,
    canvasWidth,
    canvasHeight,
}: {
    pageWidth: number;
    pageHeight: number;
    canvasWidth: number;
    canvasHeight: number;
}) {
    const edge = 'pointer-events-none absolute border-dashed border-black/80';
    const cols = Math.max(1, Math.floor(canvasWidth / pageWidth));
    const rows = Math.max(1, Math.floor(canvasHeight / pageHeight));
    const tiles = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            tiles.push({ left: c * pageWidth + 1, top: r * pageHeight + 1 });
        }
    }
    return (
        <>
            {tiles.map((t, i) => (
                <div
                    key={i}
                    className={edge}
                    style={{
                        left: t.left,
                        top: t.top,
                        width: Math.max(0, pageWidth - 2),
                        height: Math.max(0, pageHeight - 2),
                        borderWidth: 1,
                    }}
                />
            ))}
            <div
                className={`${edge} h-4 w-4 border-t-2 border-l-2`}
                style={{ left: 1, top: 1 }}
            />
            <div
                className={`${edge} h-4 w-4 border-t-2 border-r-2`}
                style={{ left: Math.max(1, pageWidth - 17), top: 1 }}
            />
            <div
                className={`${edge} h-4 w-4 border-b-2 border-l-2`}
                style={{ left: 1, top: Math.max(1, pageHeight - 17) }}
            />
            <div
                className={`${edge} h-4 w-4 border-r-2 border-b-2`}
                style={{
                    left: Math.max(1, pageWidth - 17),
                    top: Math.max(1, pageHeight - 17),
                }}
            />
        </>
    );
}

function MenuItem({
    label,
    onClick,
    icon: Icon,
}: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
}) {
    return (
        <button
            onClick={onClick}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
        >
            {Icon && <Icon className="size-3 text-muted-foreground" />}
            {label}
        </button>
    );
}

export function PageTabs({ readOnly = false }: { readOnly?: boolean }) {
    const {
        pages,
        activePageId,
        setActivePage,
        addPage,
        removePage,
        renamePage,
        duplicatePage,
        togglePageHidden,
    } = usePbi();
    const [menu, setMenu] = useState<{
        id: string;
        x: number;
        y: number;
    } | null>(null);

    useEffect(() => {
        const close = () => setMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    return (
        <div className="flex items-center gap-1 border-t border-border bg-panel px-2 py-1">
            {pages.map((p) => (
                <div
                    key={p.id}
                    onContextMenu={(e) => {
                        if (readOnly) return;
                        e.preventDefault();
                        setMenu({ id: p.id, x: e.clientX, y: e.clientY });
                    }}
                    className={cn(
                        'group flex items-center gap-1 rounded-t px-3 py-1 text-[11px]',
                        p.id === activePageId
                            ? 'border-b-2 border-brand bg-card font-semibold'
                            : 'text-muted-foreground hover:bg-accent',
                        p.format.hidden && 'italic opacity-50',
                    )}
                >
                    <button onClick={() => setActivePage(p.id)}>
                        {p.name}
                    </button>
                    {p.format.hidden && <EyeOff className="size-3" />}
                </div>
            ))}
            {!readOnly && (
                <button
                    onClick={addPage}
                    className="rounded px-2 py-1 text-[13px] text-muted-foreground hover:bg-accent"
                    aria-label="Nouvelle page"
                >
                    +
                </button>
            )}

            {!readOnly && menu && (
                <div
                    className="fixed z-50 w-44 rounded border border-border bg-popover py-1 text-[11px] shadow-lg"
                    style={{ left: menu.x, top: menu.y - 140 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem
                        label="Dupliquer la page"
                        onClick={() => duplicatePage(menu.id)}
                    />
                    <MenuItem
                        label="Renommer la page"
                        onClick={() => {
                            const cur =
                                pages.find((p) => p.id === menu.id)?.name ?? '';
                            const name = window.prompt('Renommer la page', cur);
                            if (name) renamePage(menu.id, name);
                            setMenu(null);
                        }}
                    />
                    <MenuItem
                        label="Masquer / afficher la page"
                        onClick={() => togglePageHidden(menu.id)}
                    />
                    <MenuItem
                        label="Supprimer la page"
                        onClick={() => removePage(menu.id)}
                    />
                </div>
            )}
        </div>
    );
}
