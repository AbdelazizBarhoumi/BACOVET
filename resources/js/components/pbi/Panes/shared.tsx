import { ChevronsRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { type Agg, type ValueAggregationMode, type VisualType } from '@/lib/pbi/model';
import { type WellName } from '@/lib/pbi/store';

/** Visual types that expose the conditional-formatting (fx) dialog. */
const CONDITIONAL_FORMAT_TYPES: ReadonlySet<VisualType> = new Set([
    'column',
    'stackedColumn',
    'stacked100Column',
    'bar',
    'stackedBar',
    'stacked100Bar',
    'line',
    'area',
    'stackedArea',
    'combo',
    'ribbon',
    'waterfall',
    'pie',
    'donut',
    'treemap',
    'funnel',
    'scatter',
    'bubble',
    'table',
    'matrix',
]);

const DEFAULT_FOLDER_LABELS: Record<string, string> = {
    Other: 'Autre',
};

function PaneHeader({
    title,
    right,
    onCollapse,
}: {
    title: string;
    right?: React.ReactNode;
    onCollapse?: () => void;
}) {
    return (
        <div className="flex items-center justify-between px-3 py-2">
            <h2 className="text-[12px] font-semibold text-foreground">
                {title}
            </h2>
            <div className="flex items-center gap-1">
                {right}
                {onCollapse && (
                    <button
                        onClick={onCollapse}
                        title="Réduire"
                        className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                    >
                        <ChevronsRight className="size-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}

type AnchorRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

/** Portaled context menu for the measure folders / rows. Rendered at the
 *  document root so it escapes the pane's overflow container and stacking
 *  chain, keeping it in front of the visualization panel. */
function MeasureDropdown({
    rect,
    width = 192,
    onClose,
    children,
}: {
    rect: AnchorRect;
    width?: number;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const style: React.CSSProperties = {
        position: 'fixed',
        left: Math.min(rect.right, window.innerWidth - width - 4),
        top: Math.min(rect.top, window.innerHeight - 160),
        width,
        zIndex: 100,
    };

    return createPortal(
        <div
            ref={ref}
            style={style}
            className="rounded border border-border bg-card py-1 text-[11px] shadow-xl"
        >
            {children}
        </div>,
        document.body,
    );
}

const AGGS: Agg[] = [
    'sum',
    'avg',
    'count',
    'distinct',
    'min',
    'max',
    'first',
    'latest',
    'raw',
    'nth',
];

const AGG_LABELS: Record<Agg, string> = {
    sum: 'Somme',
    avg: 'Moyenne',
    count: 'Nombre',
    distinct: 'Nombre distinct',
    min: 'Min',
    max: 'Max',
    first: 'Premier',
    latest: 'Dernier',
    raw: 'Valeur réelle',
    nth: 'Nième valeur',
};

const VALUE_AGGREGATION_LABELS: Record<ValueAggregationMode, string> = {
    first: 'Premier',
    latest: 'Dernier',
    count: 'Nombre',
    nth: 'Nième valeur',
};

/** Wells that collapse a column to a single displayed value (rather than
 * enumerate the distinct categories). A non-numeric field in one of these
 * offers a First / Latest / Count selector. */
const SINGLE_VALUE_WELLS: ReadonlySet<WellName> = new Set([
    'values',
    'target',
    'minimum',
    'maximum',
    'tooltips',
]);

export {
    AGG_LABELS,
    AGGS,
    CONDITIONAL_FORMAT_TYPES,
    DEFAULT_FOLDER_LABELS,
    MeasureDropdown,
    PaneHeader,
    SINGLE_VALUE_WELLS,
    VALUE_AGGREGATION_LABELS,
};
export type { AnchorRect };
