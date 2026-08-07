export const GRID = 8;

export const CENTER_TOL = 4;

export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export type LiveGeo = { x: number; y: number; w: number; h: number };

export type DragMember = {
    id: string;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
};

export type DragState = {
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

export const POPUP_WIDTH = 280;
export const POPUP_HEIGHT = 200;