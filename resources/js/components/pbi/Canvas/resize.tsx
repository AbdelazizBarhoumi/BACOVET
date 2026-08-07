import type { Visual } from '@/lib/pbi/model';
import { cn } from '@/lib/utils';
import type { DragState, ResizeDir } from './types';

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

export function ResizeHandle({
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