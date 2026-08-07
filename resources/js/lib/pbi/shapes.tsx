import type { CSSProperties, ReactNode } from 'react';

export type ShapeKind =
    | 'rectangle'
    | 'roundedRectangle'
    | 'oval'
    | 'line'
    | 'triangle'
    | 'rightTriangle'
    | 'parallelogram'
    | 'trapezoid'
    | 'pentagon'
    | 'hexagon'
    | 'chevron'
    | 'diamond'
    | 'arrowRight'
    | 'arrowLeft'
    | 'arrowUp'
    | 'arrowDown';

export const SHAPE_KINDS: ShapeKind[] = [
    'rectangle',
    'roundedRectangle',
    'oval',
    'line',
    'triangle',
    'rightTriangle',
    'parallelogram',
    'trapezoid',
    'pentagon',
    'hexagon',
    'chevron',
    'diamond',
    'arrowRight',
    'arrowLeft',
    'arrowUp',
    'arrowDown',
];

export type ShapeDef = {
    kind: ShapeKind;
    label: string;
    /** default canvas footprint in px */
    defaultW: number;
    defaultH: number;
};

export const SHAPES: Record<ShapeKind, ShapeDef> = {
    rectangle: { kind: 'rectangle', label: 'Rectangle', defaultW: 200, defaultH: 140 },
    roundedRectangle: { kind: 'roundedRectangle', label: 'Rectangle arrondi', defaultW: 200, defaultH: 140 },
    oval: { kind: 'oval', label: 'Ovale', defaultW: 200, defaultH: 140 },
    line: { kind: 'line', label: 'Ligne', defaultW: 220, defaultH: 16 },
    triangle: { kind: 'triangle', label: 'Triangle', defaultW: 200, defaultH: 140 },
    rightTriangle: { kind: 'rightTriangle', label: 'Triangle rectangle', defaultW: 200, defaultH: 140 },
    parallelogram: { kind: 'parallelogram', label: 'Parallélogramme', defaultW: 200, defaultH: 140 },
    trapezoid: { kind: 'trapezoid', label: 'Trapèze', defaultW: 200, defaultH: 140 },
    pentagon: { kind: 'pentagon', label: 'Pentagone', defaultW: 200, defaultH: 150 },
    hexagon: { kind: 'hexagon', label: 'Hexagone', defaultW: 200, defaultH: 160 },
    chevron: { kind: 'chevron', label: 'Chevron', defaultW: 200, defaultH: 140 },
    diamond: { kind: 'diamond', label: 'Losange', defaultW: 160, defaultH: 160 },
    arrowRight: { kind: 'arrowRight', label: 'Flèche droite', defaultW: 200, defaultH: 120 },
    arrowLeft: { kind: 'arrowLeft', label: 'Flèche gauche', defaultW: 200, defaultH: 120 },
    arrowUp: { kind: 'arrowUp', label: 'Flèche haut', defaultW: 160, defaultH: 140 },
    arrowDown: { kind: 'arrowDown', label: 'Flèche bas', defaultW: 160, defaultH: 140 },
};

export const DEFAULT_SHAPE_FILL = '#2d6df6';

function render(kind: ShapeKind, radius?: number): ReactNode {
    const rx = Math.min(radius ?? 10, 40);
    switch (kind) {
        case 'rectangle':
            return <rect x="4" y="4" width="92" height="92" />;
        case 'roundedRectangle':
            return <rect x="4" y="4" width="92" height="92" rx={rx} />;
        case 'oval':
            return <ellipse cx="50" cy="50" rx="46" ry="46" />;
        case 'line':
            return <line x1="4" y1="50" x2="96" y2="50" />;
        case 'triangle':
            return <polygon points="50,6 96,94 4,94" />;
        case 'rightTriangle':
            return <polygon points="4,6 96,94 4,94" />;
        case 'parallelogram':
            return <polygon points="28,6 96,6 72,94 4,94" />;
        case 'trapezoid':
            return <polygon points="30,6 70,6 96,94 4,94" />;
        case 'pentagon':
            return <polygon points="50,4 94,36 77,94 23,94 6,36" />;
        case 'hexagon':
            return <polygon points="50,4 90,27 90,73 50,96 10,73 10,27" />;
        case 'chevron':
            return <polygon points="22,6 92,50 22,94 12,94 74,50 12,6" />;
        case 'diamond':
            return <polygon points="50,4 96,50 50,96 4,50" />;
        case 'arrowRight':
            return <polygon points="4,44 66,44 66,30 96,50 66,70 66,56 4,56" />;
        case 'arrowLeft':
            return <polygon points="96,44 34,44 34,30 4,50 34,70 34,56 96,56" />;
        case 'arrowUp':
            return <polygon points="42,40 28,40 50,6 72,40 58,40 58,96 42,96" />;
        case 'arrowDown':
            return <polygon points="42,60 28,60 50,94 72,60 58,60 58,4 42,4" />;
        default:
            return null;
    }
}

/**
 * Renders a shape glyph inside a 100x100 viewBox as an outline: shapes are
 * never filled, they draw a stroke. `stroke` can be any CSS color; when
 * omitted the glyph falls back to `currentColor`.
 */
export function ShapeGlyph({
    kind,
    className,
    fill = 'none',
    stroke,
    strokeWidth,
    radius,
    style,
}: {
    kind: ShapeKind;
    className?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    radius?: number;
    style?: CSSProperties;
}) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={className}
            style={style}
            preserveAspectRatio="none"
            aria-hidden
        >
            <g
                fill={fill}
                stroke={stroke ?? 'currentColor'}
                strokeWidth={strokeWidth ?? 1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
            >
                {render(kind, radius)}
            </g>
        </svg>
    );
}
