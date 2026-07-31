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
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Interaction } from '@/lib/pbi/model';
import { usePbi, visualTypeLabel } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { VisualView } from './VisualView';

const GRID = 8;

type DragState = {
    id: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
};

export function Canvas({ readOnly = false }: { readOnly?: boolean }) {
    const {
        page,
        rows,
        selected,
        select,
        updateVisual,
        removeVisual,
        duplicateVisual,
        showGridlines,
        snapToGrid,
        zoom,
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
    } = usePbi();

    const [drag, setDrag] = useState<DragState | null>(null);
    const [menu, setMenu] = useState<{
        id: string;
        x: number;
        y: number;
    } | null>(null);
    const [records, setRecords] = useState<string | null>(null);
    const scale = zoom / 100;
    const ref = useRef<HTMLDivElement>(null);

    const snap = useCallback(
        (n: number) =>
            snapToGrid ? Math.round(n / GRID) * GRID : Math.round(n),
        [snapToGrid],
    );

    const onMouseMove = (e: React.MouseEvent) => {
        if (!drag) return;
        const dx = (e.clientX - drag.startX) / scale;
        const dy = (e.clientY - drag.startY) / scale;
        if (drag.mode === 'move') {
            updateVisual(drag.id, {
                x: Math.max(0, snap(drag.ox + dx)),
                y: Math.max(0, snap(drag.oy + dy)),
            });
        } else {
            updateVisual(drag.id, {
                w: Math.max(80, snap(drag.ow + dx)),
                h: Math.max(60, snap(drag.oh + dy)),
            });
        }
    };

    useEffect(() => {
        const close = () => setMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    const width = mobileView ? 360 : page.format.width;
    const height = mobileView ? 740 : page.format.height;

    const ordered = [...page.visuals].sort((a, b) => a.z - b.z);
    const menuVisual = page.visuals.find((v) => v.id === menu?.id) ?? null;

    return (
        <div className="flex min-h-full w-full justify-center p-6">
            <div style={{ width: width * scale, height: height * scale }}>
                <div
                    ref={ref}
                    onMouseMove={readOnly ? undefined : onMouseMove}
                    onMouseUp={readOnly ? undefined : () => setDrag(null)}
                    onMouseLeave={readOnly ? undefined : () => setDrag(null)}
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
                        if (e.dataTransfer.getData('text/plain'))
                            addVisual('column');
                    }}
                    className={cn(
                        'relative origin-top-left overflow-hidden shadow-lg ring-1 ring-border',
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
                            Blank page — add a visual from the Visualizations
                            pane.
                        </div>
                    )}

                    {ordered.map((v) => {
                        if (v.hidden) return null;
                        const isSel = selected?.id === v.id;
                        const interactionTarget =
                            !readOnly &&
                            editInteractions &&
                            selected &&
                            selected.id !== v.id;
                        const mode: Interaction = selected
                            ? interactionFor(selected.id, v.id)
                            : 'filter';
                        return (
                            <div
                                key={v.id}
                                onMouseDown={() => !readOnly && select(v.id)}
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
                                    const name =
                                        e.dataTransfer.getData('text/plain');
                                    if (name) dropField(v.id, 'values', name);
                                }}
                                className={cn(
                                    'group absolute flex flex-col rounded p-2',
                                    v.border && 'border border-border',
                                    v.shadow && 'shadow-md',
                                    isSel &&
                                        !readOnly &&
                                        'outline outline-2 outline-brand',
                                )}
                                style={{
                                    left: v.x,
                                    top: v.y,
                                    width: v.w,
                                    height: v.h,
                                    zIndex: v.z,
                                    backgroundColor: v.background,
                                }}
                                aria-label={v.altText || v.name}
                            >
                                <div
                                    onMouseDown={
                                        readOnly
                                            ? undefined
                                            : (e) =>
                                                  setDrag({
                                                      id: v.id,
                                                      mode: 'move',
                                                      startX: e.clientX,
                                                      startY: e.clientY,
                                                      ox: v.x,
                                                      oy: v.y,
                                                      ow: v.w,
                                                      oh: v.h,
                                                  })
                                    }
                                    className={cn(
                                        'flex items-center justify-between pb-1',
                                        !readOnly && 'cursor-move',
                                    )}
                                >
                                    <span className="truncate text-[11px] font-semibold text-foreground">
                                        {v.showTitle
                                            ? v.title || visualTypeLabel(v.type)
                                            : ''}
                                    </span>
                                    {!readOnly && (
                                        <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            {v.drillFields.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            drill(v.id, -1)
                                                        }
                                                        aria-label="Drill up"
                                                    >
                                                        <ChevronUp className="size-3 text-muted-foreground hover:text-foreground" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            drill(v.id, 1)
                                                        }
                                                        aria-label="Drill down"
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
                                                aria-label="Duplicate visual"
                                            >
                                                <Copy className="size-3 text-muted-foreground hover:text-foreground" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    removeVisual(v.id)
                                                }
                                                aria-label="Delete visual"
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
                                                aria-label="More options"
                                            >
                                                <MoreHorizontal className="size-3 text-muted-foreground" />
                                            </button>
                                        </span>
                                    )}
                                </div>
                                <div className="min-h-0 flex-1">
                                    <VisualView visual={v} rows={rows} />
                                </div>

                                {interactionTarget && (
                                    <div className="absolute top-1 right-1 z-10 flex gap-1 rounded bg-popover/95 p-1 shadow">
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

                                {!readOnly && (
                                    <div
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDrag({
                                                id: v.id,
                                                mode: 'resize',
                                                startX: e.clientX,
                                                startY: e.clientY,
                                                ox: v.x,
                                                oy: v.y,
                                                ow: v.w,
                                                oh: v.h,
                                            });
                                        }}
                                        className="absolute right-0 bottom-0 size-3 cursor-nwse-resize rounded-sm bg-brand/60 opacity-0 group-hover:opacity-100"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {!readOnly && menu && menuVisual && (
                <div
                    className="fixed z-50 w-52 rounded border border-border bg-popover py-1 text-[11px] shadow-lg"
                    style={{ left: menu.x, top: menu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem
                        label="Bring forward"
                        onClick={() => bringForward(menuVisual.id)}
                    />
                    <MenuItem
                        label="Send backward"
                        onClick={() => sendBackward(menuVisual.id)}
                    />
                    <MenuItem
                        label={menuVisual.hidden ? 'Show' : 'Hide'}
                        icon={menuVisual.hidden ? Eye : EyeOff}
                        onClick={() => toggleVisualHidden(menuVisual.id)}
                    />
                    <MenuItem
                        label="See records"
                        icon={Focus}
                        onClick={() => {
                            setRecords(menuVisual.id);
                            setMenu(null);
                        }}
                    />
                    <MenuItem
                        label="Drill through to detail"
                        onClick={() => {
                            const col = menuVisual.axis[0]?.name;
                            const val =
                                crossFilter?.value ??
                                (col ? String(rows[0]?.[col] ?? '') : '');
                            if (col && val) openDrillthrough(col, val);
                            setMenu(null);
                        }}
                    />
                    <MenuItem
                        label="Clear cross-filter"
                        onClick={clearCrossFilter}
                    />
                    <MenuItem
                        label="Duplicate"
                        onClick={() => duplicateVisual(menuVisual.id)}
                    />
                    <MenuItem
                        label="Remove"
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
                            Data point records
                        </h3>
                        <table className="w-full text-[11px]">
                            <thead className="sticky top-0 bg-muted">
                                <tr>
                                    {Object.keys(rows[0] ?? {}).map((k) => (
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
                                {rows.slice(0, 100).map((r, i) => (
                                    <tr key={i} className="hover:bg-accent">
                                        {Object.keys(rows[0] ?? {}).map((k) => (
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
                    </div>
                </div>
            )}
        </div>
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
                    aria-label="New page"
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
                        label="Duplicate page"
                        onClick={() => duplicatePage(menu.id)}
                    />
                    <MenuItem
                        label="Rename page"
                        onClick={() => {
                            const cur =
                                pages.find((p) => p.id === menu.id)?.name ?? '';
                            const name = window.prompt('Rename page', cur);
                            if (name) renamePage(menu.id, name);
                            setMenu(null);
                        }}
                    />
                    <MenuItem
                        label="Hide / show page"
                        onClick={() => togglePageHidden(menu.id)}
                    />
                    <MenuItem
                        label="Delete page"
                        onClick={() => removePage(menu.id)}
                    />
                </div>
            )}
        </div>
    );
}
