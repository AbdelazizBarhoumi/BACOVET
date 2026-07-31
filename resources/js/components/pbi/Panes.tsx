import {
    Bookmark,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Eye,
    EyeOff,
    Filter,
    Plus,
    Search,
    Sigma,
    Table2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import {
    MEASURES,
    PAGE_PRESETS,
    TABLES,
    distinctValues,
    fieldType,
    isMeasure,
    measureLabel,
    type Agg,
    type VisualType,
} from '@/lib/pbi/model';
import { usePbi, visualTypeLabel, type WellName } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';

/* ------------------------------ Icon set ------------------------------ */
/* Small inline SVGs used in place of unicode glyphs / emoji, drawn to match
 * the stroke weight and proportions of the lucide-react icons above. */

type IconProps = { className?: string };
type IconComponent = (props: IconProps) => JSX.Element;

function svgIcon(paths: React.ReactNode, accent: string): IconComponent {
    return function Icon({ className }: IconProps) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                style={{ color: accent }}
            >
                {paths}
            </svg>
        );
    };
}

// A varied, friendly accent per icon so the visual-type picker reads as
// colorful at a glance instead of a wall of monochrome outlines.
const ICON_PALETTE = [
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
    '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#f43f5e', '#ec4899',
    '#d946ef', '#a855f7', '#8b5cf6', '#6366f1',
];
let iconPaletteCursor = 0;
function nextIconColor(): string {
    const color = ICON_PALETTE[iconPaletteCursor % ICON_PALETTE.length];
    iconPaletteCursor += 1;
    return color;
}

// Comparison
const IconColumn = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <rect x="7" y="13" width="3" height="5" fill="currentColor" stroke="none" />
        <rect x="12" y="9" width="3" height="9" fill="currentColor" stroke="none" />
        <rect x="17" y="5" width="3" height="13" fill="currentColor" stroke="none" />
    </>,
    nextIconColor(),
);
const IconStackedColumn = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <rect x="7" y="14" width="4" height="4" fill="currentColor" stroke="none" />
        <rect x="7" y="8" width="4" height="6" fill="currentColor" stroke="none" opacity={0.5} />
        <rect x="14" y="11" width="4" height="7" fill="currentColor" stroke="none" />
        <rect x="14" y="5" width="4" height="6" fill="currentColor" stroke="none" opacity={0.5} />
    </>,
    nextIconColor(),
);
const IconStacked100Column = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <rect x="7" y="10" width="4" height="8" fill="currentColor" stroke="none" />
        <rect x="7" y="4" width="4" height="6" fill="currentColor" stroke="none" opacity={0.5} />
        <rect x="14" y="14" width="4" height="4" fill="currentColor" stroke="none" />
        <rect x="14" y="4" width="4" height="10" fill="currentColor" stroke="none" opacity={0.5} />
    </>,
    nextIconColor(),
);
const IconBar = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <rect x="5" y="6" width="10" height="3" fill="currentColor" stroke="none" />
        <rect x="5" y="11" width="14" height="3" fill="currentColor" stroke="none" />
        <rect x="5" y="16" width="7" height="3" fill="currentColor" stroke="none" />
    </>,
    nextIconColor(),
);
const IconStackedBar = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <rect x="5" y="7" width="6" height="3" fill="currentColor" stroke="none" />
        <rect x="11" y="7" width="8" height="3" fill="currentColor" stroke="none" opacity={0.5} />
        <rect x="5" y="14" width="10" height="3" fill="currentColor" stroke="none" />
        <rect x="15" y="14" width="4" height="3" fill="currentColor" stroke="none" opacity={0.5} />
    </>,
    nextIconColor(),
);
const IconStacked100Bar = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <rect x="5" y="7" width="9" height="3" fill="currentColor" stroke="none" />
        <rect x="14" y="7" width="5" height="3" fill="currentColor" stroke="none" opacity={0.5} />
        <rect x="5" y="14" width="5" height="3" fill="currentColor" stroke="none" />
        <rect x="10" y="14" width="9" height="3" fill="currentColor" stroke="none" opacity={0.5} />
    </>,
    nextIconColor(),
);
const IconLine = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <polyline points="5,15 10,9 14,13 20,5" />
    </>,
    nextIconColor(),
);
const IconArea = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <path d="M5 15 10 9 14 13 20 5 20 18 5 18 Z" fill="currentColor" stroke="none" opacity={0.5} />
        <polyline points="5,15 10,9 14,13 20,5" />
    </>,
    nextIconColor(),
);
const IconStackedArea = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <path d="M5 17 10 14 14 15 20 12 20 18 5 18 Z" fill="currentColor" stroke="none" opacity={0.35} />
        <path d="M5 12 10 8 14 11 20 6 20 18 5 18 Z" fill="currentColor" stroke="none" opacity={0.6} />
    </>,
    nextIconColor(),
);
const IconCombo = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <rect x="6" y="12" width="3" height="6" fill="currentColor" stroke="none" opacity={0.6} />
        <rect x="11" y="9" width="3" height="9" fill="currentColor" stroke="none" opacity={0.6} />
        <rect x="16" y="14" width="3" height="4" fill="currentColor" stroke="none" opacity={0.6} />
        <polyline points="6,10 11,6 16,11 20,4" />
    </>,
    nextIconColor(),
);

// Part to whole & distribution
const IconPie = svgIcon(
    <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 A9 9 0 0 1 20 15 L12 12 Z" fill="currentColor" stroke="none" />
    </>,
    nextIconColor(),
);
const IconDonut = svgIcon(
    <>
        <circle cx="12" cy="12" r="8" strokeWidth={3} />
        <path d="M12 4 A8 8 0 0 1 19 16" strokeWidth={3} strokeOpacity={0.4} />
    </>,
    nextIconColor(),
);
const IconTreemap = svgIcon(
    <>
        <rect x="3" y="3" width="18" height="18" />
        <line x1="3" y1="11" x2="21" y2="11" />
        <line x1="11" y1="3" x2="11" y2="11" />
        <line x1="15" y1="11" x2="15" y2="21" />
    </>,
    nextIconColor(),
);
const IconFunnel = svgIcon(<path d="M3 4h18l-7 8v7l-4 2v-9Z" />, nextIconColor());
const IconRibbon = svgIcon(
    <>
        <path d="M3 8c4-3 6 3 10 0s6-3 8 0" />
        <path d="M3 14c4-3 6 3 10 0s6-3 8 0" strokeOpacity={0.5} />
    </>,
    nextIconColor(),
);
const IconWaterfall = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <rect x="5" y="12" width="3" height="6" fill="currentColor" stroke="none" />
        <rect x="9" y="7" width="3" height="5" fill="currentColor" stroke="none" opacity={0.6} />
        <rect x="13" y="10" width="3" height="2" fill="currentColor" stroke="none" opacity={0.6} />
        <rect x="17" y="5" width="3" height="7" fill="currentColor" stroke="none" />
    </>,
    nextIconColor(),
);
const IconScatter = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <circle cx="8" cy="14" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="9" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="15" cy="15" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="18" cy="7" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="10" cy="17" r="1.4" fill="currentColor" stroke="none" />
    </>,
    nextIconColor(),
);
const IconBubble = svgIcon(
    <>
        <path d="M3 3v18h18" />
        <circle cx="8" cy="14" r="2.5" fill="currentColor" stroke="none" opacity={0.6} />
        <circle cx="14" cy="10" r="3.5" fill="currentColor" stroke="none" opacity={0.6} />
        <circle cx="18" cy="15" r="1.8" fill="currentColor" stroke="none" opacity={0.6} />
    </>,
    nextIconColor(),
);

// Single value & tabular
const IconCard = svgIcon(
    <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="6" y1="9" x2="11" y2="9" strokeWidth={1.4} strokeOpacity={0.5} />
        <line x1="6" y1="15" x2="16" y2="15" strokeWidth={3} />
    </>,
    nextIconColor(),
);
const IconKpi = svgIcon(
    <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <polyline points="7,15 11,10 14,13 18,7" />
        <polyline points="14,7 18,7 18,11" />
    </>,
    nextIconColor(),
);
const IconGauge = svgIcon(
    <>
        <path d="M4 16a8 8 0 0 1 16 0" />
        <line x1="12" y1="16" x2="16" y2="10" />
        <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
    </>,
    nextIconColor(),
);
const IconTable = svgIcon(
    <>
        <rect x="3" y="4" width="18" height="16" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="14" x2="21" y2="14" />
        <line x1="9" y1="4" x2="9" y2="20" />
        <line x1="15" y1="4" x2="15" y2="20" />
    </>,
    nextIconColor(),
);
const IconMatrix = svgIcon(
    <>
        <rect x="3" y="4" width="18" height="16" />
        <rect x="3" y="4" width="18" height="5" fill="currentColor" stroke="none" opacity={0.3} />
        <rect x="3" y="4" width="6" height="16" fill="currentColor" stroke="none" opacity={0.3} />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="14" x2="21" y2="14" />
        <line x1="9" y1="4" x2="9" y2="20" />
        <line x1="15" y1="4" x2="15" y2="20" />
    </>,
    nextIconColor(),
);

// Maps
const IconMap = svgIcon(
    <>
        <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" />
        <line x1="9" y1="3" x2="9" y2="19" />
        <line x1="15" y1="5" x2="15" y2="21" />
    </>,
    nextIconColor(),
);
const IconFilledMap = svgIcon(
    <>
        <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" fill="currentColor" opacity={0.3} />
        <line x1="9" y1="3" x2="9" y2="19" />
        <line x1="15" y1="5" x2="15" y2="21" />
    </>,
    nextIconColor(),
);
const IconShapeMap = svgIcon(<path d="M12 2 20 7v10l-8 5-8-5V7Z" />, nextIconColor());

// Slicers
const IconCheckboxSlicer = svgIcon(
    <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <polyline points="8,12.5 11,15.5 16,9" />
    </>,
    nextIconColor(),
);
const IconButtonSlicer = svgIcon(
    <>
        <rect x="3" y="9" width="5" height="6" rx="1.5" />
        <rect x="9.5" y="9" width="5" height="6" rx="1.5" fill="currentColor" stroke="none" opacity={0.5} />
        <rect x="16" y="9" width="5" height="6" rx="1.5" />
    </>,
    nextIconColor(),
);
const IconListSlicer = svgIcon(
    <>
        <circle cx="5" cy="6" r="1.2" fill="currentColor" stroke="none" />
        <line x1="9" y1="6" x2="20" y2="6" />
        <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <circle cx="5" cy="18" r="1.2" fill="currentColor" stroke="none" />
        <line x1="9" y1="18" x2="20" y2="18" />
    </>,
    nextIconColor(),
);
const IconInputSlicer = svgIcon(
    <>
        <rect x="3" y="8" width="18" height="8" rx="1.5" />
        <line x1="6" y1="12" x2="11" y2="12" strokeWidth={1.4} />
        <line x1="14" y1="10" x2="14" y2="14" strokeWidth={1.4} />
    </>,
    nextIconColor(),
);
const IconDateSlicer = svgIcon(
    <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
        <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
    </>,
    nextIconColor(),
);

// AI, scripted & other
const IconDecompositionTree = svgIcon(
    <>
        <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <line x1="6.5" y1="12" x2="11" y2="6" />
        <line x1="6.5" y1="12" x2="11" y2="12" />
        <line x1="6.5" y1="12" x2="11" y2="18" />
        <circle cx="12.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12.5" cy="18" r="1.4" fill="currentColor" stroke="none" />
        <line x1="14" y1="6" x2="19" y2="4" />
        <line x1="14" y1="6" x2="19" y2="8" />
        <circle cx="20" cy="4" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="20" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </>,
    nextIconColor(),
);
const IconKeyInfluencers = svgIcon(
    <path
        d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6Z"
        fill="currentColor"
        stroke="none"
    />,
    nextIconColor(),
);
const IconSmartNarrative = svgIcon(
    <>
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="11" x2="20" y2="11" />
        <line x1="4" y1="16" x2="14" y2="16" />
    </>,
    nextIconColor(),
);
const IconQna = svgIcon(
    <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.2 1-1.2 1.8" />
        <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </>,
    nextIconColor(),
);
const IconRVisual = svgIcon(
    <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight={600} fill="currentColor" stroke="none">
            R
        </text>
    </>,
    nextIconColor(),
);
const IconPythonVisual = svgIcon(
    <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <text x="12" y="15" textAnchor="middle" fontSize="7" fontWeight={600} fill="currentColor" stroke="none">
            PY
        </text>
    </>,
    nextIconColor(),
);
const IconTextBox = svgIcon(
    <>
        <rect x="3" y="4" width="18" height="16" rx="1.5" strokeDasharray="3 2" />
        <line x1="7" y1="9" x2="17" y2="9" />
        <line x1="7" y1="13" x2="14" y2="13" />
    </>,
    nextIconColor(),
);
const IconImage = svgIcon(
    <>
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <circle cx="8.5" cy="9" r="1.5" fill="currentColor" stroke="none" />
        <path d="M4 17l5-5 4 4 3-3 5 5" />
    </>,
    nextIconColor(),
);
const IconButton = svgIcon(
    <>
        <rect x="3" y="8" width="18" height="8" rx="2" />
        <line x1="8" y1="12" x2="16" y2="12" strokeWidth={1.4} />
    </>,
    nextIconColor(),
);

// Field type indicators (Data pane)
const IconFieldNumber = svgIcon(
    <>
        <line x1="5" y1="9" x2="19" y2="9" />
        <line x1="5" y1="15" x2="19" y2="15" />
        <line x1="9" y1="4" x2="7" y2="20" />
        <line x1="17" y1="4" x2="15" y2="20" />
    </>,
    '#16a34a',
);
const IconFieldDate = svgIcon(
    <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
    </>,
    '#7c3aed',
);
const IconFieldText = svgIcon(<path d="M7 17 11 5 15 17 M8.5 12.5h5" />, '#f97316');

function PaneHeader({
    title,
    right,
}: {
    title: string;
    right?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between px-3 py-2">
            <h2 className="text-[12px] font-semibold text-foreground">
                {title}
            </h2>
            {right}
        </div>
    );
}

/* ---------------------------- Fields pane ---------------------------- */

export function FieldsPane() {
    const { addFilter, selected, dropField } = usePbi();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState<Record<string, boolean>>({
        Measures: true,
        Sales: true,
        Date: true,
        Product: true,
        Region: true,
    });

    const groups = [
        { name: 'Measures', fields: MEASURES },
        ...TABLES.map((t) => ({ name: t.name, fields: t.fields })),
    ];

    return (
        <div className="flex h-full flex-col">
            <PaneHeader title="Data" />
            <div className="px-2 pb-2">
                <div className="flex items-center gap-1 rounded border border-border bg-background px-2">
                    <Search className="size-3 text-muted-foreground" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full bg-transparent py-1 text-[11px] outline-none"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-auto px-1 pb-2">
                {groups.map((g) => {
                    const fields = g.fields.filter((f) =>
                        f.name.toLowerCase().includes(query.toLowerCase()),
                    );
                    if (!fields.length) return null;
                    return (
                        <div key={g.name}>
                            <button
                                onClick={() =>
                                    setOpen((o) => ({
                                        ...o,
                                        [g.name]: !o[g.name],
                                    }))
                                }
                                className="flex w-full items-center gap-1 rounded px-1 py-1 text-[12px] font-medium hover:bg-accent"
                            >
                                <ChevronRight
                                    className={cn(
                                        'size-3 transition-transform',
                                        open[g.name] && 'rotate-90',
                                    )}
                                />
                                <Table2 className="size-3 text-brand-foreground" />
                                <span className="truncate">{g.name}</span>
                            </button>
                            {open[g.name] &&
                                fields.map((f) => (
                                    <div
                                        key={`${g.name}.${f.name}`}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData(
                                                'text/plain',
                                                f.name,
                                            );
                                            // Ctrl+drag duplicates a field into another bucket
                                            e.dataTransfer.effectAllowed =
                                                e.ctrlKey ? 'copy' : 'move';
                                        }}
                                        onDoubleClick={() =>
                                            !f.measure && addFilter(f.name)
                                        }
                                        title={
                                            f.expression ??
                                            `${f.table}[${f.name}]`
                                        }
                                        className="ml-5 flex cursor-grab items-center gap-2 rounded px-2 py-[3px] text-[11px] hover:bg-accent active:cursor-grabbing"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                !!selected &&
                                                [
                                                    ...selected.axis,
                                                    ...selected.values,
                                                    ...selected.legend,
                                                ].some((x) => x.name === f.name)
                                            }
                                            onChange={() => {
                                                if (!selected) return;
                                                dropField(
                                                    selected.id,
                                                    f.measure ||
                                                        f.type === 'number'
                                                        ? 'values'
                                                        : 'axis',
                                                    f.name,
                                                );
                                            }}
                                            className="size-3 accent-[var(--brand)]"
                                        />
                                        {f.measure ? (
                                            <Sigma className="size-3 text-brand-foreground" />
                                        ) : f.type === 'number' ? (
                                            <IconFieldNumber className="size-3" />
                                        ) : f.type === 'date' ? (
                                            <IconFieldDate className="size-3" />
                                        ) : (
                                            <IconFieldText className="size-3" />
                                        )}
                                        <span className="truncate">
                                            {f.name}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ------------------------ Visualizations pane ------------------------ */

const VISUAL_GROUPS: {
    group: string;
    items: { type: VisualType; label: string; Icon: IconComponent }[];
}[] = [
    {
        group: 'Comparison',
        items: [
            { type: 'column', label: 'Clustered column', Icon: IconColumn },
            {
                type: 'stackedColumn',
                label: 'Stacked column',
                Icon: IconStackedColumn,
            },
            {
                type: 'stacked100Column',
                label: '100% stacked column',
                Icon: IconStacked100Column,
            },
            { type: 'bar', label: 'Clustered bar', Icon: IconBar },
            { type: 'stackedBar', label: 'Stacked bar', Icon: IconStackedBar },
            {
                type: 'stacked100Bar',
                label: '100% stacked bar',
                Icon: IconStacked100Bar,
            },
            { type: 'line', label: 'Line', Icon: IconLine },
            { type: 'area', label: 'Area', Icon: IconArea },
            { type: 'stackedArea', label: 'Stacked area', Icon: IconStackedArea },
            {
                type: 'combo',
                label: 'Line and stacked column',
                Icon: IconCombo,
            },
        ],
    },
    {
        group: 'Part to whole & distribution',
        items: [
            { type: 'pie', label: 'Pie', Icon: IconPie },
            { type: 'donut', label: 'Donut', Icon: IconDonut },
            { type: 'treemap', label: 'Treemap', Icon: IconTreemap },
            { type: 'funnel', label: 'Funnel', Icon: IconFunnel },
            { type: 'ribbon', label: 'Ribbon', Icon: IconRibbon },
            { type: 'waterfall', label: 'Waterfall', Icon: IconWaterfall },
            { type: 'scatter', label: 'Scatter', Icon: IconScatter },
            { type: 'bubble', label: 'Bubble', Icon: IconBubble },
        ],
    },
    {
        group: 'Single value & tabular',
        items: [
            { type: 'card', label: 'Card (new)', Icon: IconCard },
            { type: 'kpi', label: 'KPI', Icon: IconKpi },
            { type: 'gauge', label: 'Gauge', Icon: IconGauge },
            { type: 'table', label: 'Table', Icon: IconTable },
            { type: 'matrix', label: 'Matrix', Icon: IconMatrix },
        ],
    },
    {
        group: 'Maps',
        items: [
            { type: 'map', label: 'Map', Icon: IconMap },
            { type: 'filledMap', label: 'Filled map', Icon: IconFilledMap },
            { type: 'shapeMap', label: 'Shape map', Icon: IconShapeMap },
        ],
    },
    {
        group: 'Slicers',
        items: [
            {
                type: 'slicer',
                label: 'Slicer (checkbox)',
                Icon: IconCheckboxSlicer,
            },
            {
                type: 'buttonSlicer',
                label: 'Button slicer',
                Icon: IconButtonSlicer,
            },
            { type: 'listSlicer', label: 'List slicer', Icon: IconListSlicer },
            {
                type: 'inputSlicer',
                label: 'Input slicer',
                Icon: IconInputSlicer,
            },
            {
                type: 'dateSlicer',
                label: 'Date picker slicer',
                Icon: IconDateSlicer,
            },
        ],
    },
    {
        group: 'AI, scripted & other',
        items: [
            {
                type: 'decompositionTree',
                label: 'Decomposition tree',
                Icon: IconDecompositionTree,
            },
            {
                type: 'keyInfluencers',
                label: 'Key influencers',
                Icon: IconKeyInfluencers,
            },
            {
                type: 'smartNarrative',
                label: 'Smart narrative',
                Icon: IconSmartNarrative,
            },
            { type: 'qna', label: 'Q&A', Icon: IconQna },
            { type: 'rVisual', label: 'R visual', Icon: IconRVisual },
            {
                type: 'pythonVisual',
                label: 'Python visual',
                Icon: IconPythonVisual,
            },
            { type: 'text', label: 'Text box', Icon: IconTextBox },
            { type: 'image', label: 'Image', Icon: IconImage },
            { type: 'button', label: 'Button', Icon: IconButton },
        ],
    },
];

const AGGS: Agg[] = ['sum', 'avg', 'count', 'distinct', 'min', 'max'];

export function VisualizationsPane() {
    const {
        selected,
        addVisual,
        updateVisual,
        dropField,
        removeWellField,
        setWellAgg,
        toggleAnalytics,
        page,
        pages,
        setPageFormat,
    } = usePbi();
    const [tab, setTab] = useState<'fields' | 'format' | 'analytics'>('fields');

    const well = (name: WellName, label: string) => (
        <div className="mb-3">
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                {label}
            </div>
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (selected)
                        dropField(
                            selected.id,
                            name,
                            e.dataTransfer.getData('text/plain'),
                        );
                }}
                className="min-h-9 rounded border border-dashed border-border bg-background p-1"
            >
                {selected?.[name].length ? (
                    selected[name].map((f, i) => (
                        <div
                            key={`${f.name}-${i}`}
                            className="mb-1 flex items-center gap-1 rounded bg-muted px-2 py-1 text-[11px]"
                        >
                            <span className="flex-1 truncate">
                                {fieldType(f.name) === 'number' &&
                                !isMeasure(f.name)
                                    ? measureLabel(f)
                                    : f.name}
                            </span>
                            {fieldType(f.name) === 'number' &&
                                !isMeasure(f.name) && (
                                    <select
                                        value={f.agg}
                                        onChange={(e) =>
                                            setWellAgg(
                                                selected.id,
                                                name,
                                                i,
                                                e.target.value as Agg,
                                            )
                                        }
                                        className="rounded border border-border bg-background text-[10px]"
                                    >
                                        {AGGS.map((a) => (
                                            <option key={a} value={a}>
                                                {a}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            <button
                                onClick={() =>
                                    removeWellField(selected.id, name, i)
                                }
                            >
                                <X className="size-3 text-muted-foreground hover:text-destructive" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="px-1 py-1 text-[11px] text-muted-foreground">
                        Add data fields here
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex h-full flex-col">
            <PaneHeader title="Visualizations" />
            <div className="max-h-56 overflow-auto border-b border-border px-2 pb-2">
                {VISUAL_GROUPS.map((g) => (
                    <div key={g.group} className="mb-2">
                        <div className="mb-1 text-[9px] tracking-wide text-muted-foreground uppercase">
                            {g.group}
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                            {g.items.map((v) => (
                                <button
                                    key={v.type}
                                    title={v.label}
                                    onClick={() =>
                                        selected
                                            ? updateVisual(selected.id, {
                                                  type: v.type,
                                              })
                                            : addVisual(v.type)
                                    }
                                    className={cn(
                                        'flex h-7 items-center justify-center rounded border border-border text-[10px] hover:bg-accent',
                                        selected?.type === v.type &&
                                            'border-brand bg-brand/15',
                                    )}
                                >
                                    <v.Icon className="size-3.5" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                <button className="w-full rounded border border-dashed border-border py-1 text-[10px] text-muted-foreground hover:bg-accent">
                    + Get more visuals (AppSource)
                </button>
            </div>

            {!selected ? (
                <div className="flex-1 overflow-auto p-3 text-[11px]">
                    <div className="mb-2 font-semibold">
                        Format page — {page.name}
                    </div>
                    <label className="mb-2 block">
                        <span className="mb-1 block text-muted-foreground">
                            Canvas size
                        </span>
                        <select
                            value={page.format.preset}
                            onChange={(e) => {
                                const p = PAGE_PRESETS.find(
                                    (x) => x.name === e.target.value,
                                )!;
                                setPageFormat(page.id, {
                                    preset: p.name,
                                    width: p.width,
                                    height: p.height,
                                    tooltip: p.name === 'Tooltip',
                                });
                            }}
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        >
                            {PAGE_PRESETS.map((p) => (
                                <option key={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </label>
                    <div className="mb-2 grid grid-cols-2 gap-2">
                        <label>
                            <span className="mb-1 block text-muted-foreground">
                                Width px
                            </span>
                            <input
                                type="number"
                                value={page.format.width}
                                onChange={(e) =>
                                    setPageFormat(page.id, {
                                        width: Number(e.target.value),
                                        preset: 'Custom',
                                    })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1"
                            />
                        </label>
                        <label>
                            <span className="mb-1 block text-muted-foreground">
                                Height px
                            </span>
                            <input
                                type="number"
                                value={page.format.height}
                                onChange={(e) =>
                                    setPageFormat(page.id, {
                                        height: Number(e.target.value),
                                        preset: 'Custom',
                                    })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1"
                            />
                        </label>
                    </div>
                    <label className="mb-2 block">
                        <span className="mb-1 block text-muted-foreground">
                            Page background
                        </span>
                        <input
                            type="color"
                            onChange={(e) =>
                                setPageFormat(page.id, {
                                    background: e.target.value,
                                })
                            }
                            className="h-7 w-full rounded border border-border bg-background"
                        />
                    </label>
                    <label className="mb-2 flex items-center justify-between">
                        <span>Use as tooltip page</span>
                        <input
                            type="checkbox"
                            checked={page.format.tooltip}
                            onChange={(e) =>
                                setPageFormat(page.id, {
                                    tooltip: e.target.checked,
                                })
                            }
                            className="accent-[var(--brand)]"
                        />
                    </label>
                    <label className="flex items-center justify-between">
                        <span>Hide page</span>
                        <input
                            type="checkbox"
                            checked={page.format.hidden}
                            onChange={(e) =>
                                setPageFormat(page.id, {
                                    hidden: e.target.checked,
                                })
                            }
                            className="accent-[var(--brand)]"
                        />
                    </label>
                    <p className="mt-3 text-muted-foreground">
                        Select a visual on the canvas to edit its fields, format
                        and analytics.
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex border-b border-border text-[11px]">
                        {(['fields', 'format', 'analytics'] as const).map(
                            (t) => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={cn(
                                        'flex-1 py-1.5 capitalize',
                                        tab === t
                                            ? 'border-b-2 border-brand font-semibold'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {t === 'fields'
                                        ? 'Build visual'
                                        : t === 'format'
                                          ? 'Format'
                                          : 'Analytics'}
                                </button>
                            ),
                        )}
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                        {tab === 'fields' && (
                            <>
                                {well(
                                    'axis',
                                    selected.type
                                        .toLowerCase()
                                        .includes('slicer')
                                        ? 'Field'
                                        : 'X-axis / Rows',
                                )}
                                {well('legend', 'Legend / Columns')}
                                {well('values', 'Values')}
                                {well('smallMultiples', 'Small multiples')}
                                {well('tooltips', 'Tooltips')}
                                {well(
                                    'drillFields',
                                    'Extraction / drill fields',
                                )}
                                <label className="block text-[11px]">
                                    <span className="mb-1 block text-muted-foreground">
                                        Tooltip page
                                    </span>
                                    <select
                                        value={selected.tooltipPageId ?? ''}
                                        onChange={(e) =>
                                            updateVisual(selected.id, {
                                                tooltipPageId:
                                                    e.target.value || undefined,
                                            })
                                        }
                                        className="w-full rounded border border-border bg-background px-2 py-1"
                                    >
                                        <option value="">Default</option>
                                        {pages.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </>
                        )}

                        {tab === 'format' && (
                            <div className="space-y-3 text-[11px]">
                                <label className="block">
                                    <span className="mb-1 block text-muted-foreground">
                                        Title
                                    </span>
                                    <input
                                        value={selected.title}
                                        onChange={(e) =>
                                            updateVisual(selected.id, {
                                                title: e.target.value,
                                            })
                                        }
                                        className="w-full rounded border border-border bg-background px-2 py-1"
                                    />
                                </label>
                                {(selected.type === 'text' ||
                                    selected.type === 'button') && (
                                    <label className="block">
                                        <span className="mb-1 block text-muted-foreground">
                                            Text
                                        </span>
                                        <textarea
                                            value={selected.text ?? ''}
                                            onChange={(e) =>
                                                updateVisual(selected.id, {
                                                    text: e.target.value,
                                                })
                                            }
                                            className="h-20 w-full rounded border border-border bg-background px-2 py-1"
                                        />
                                    </label>
                                )}
                                {selected.type === 'image' && (
                                    <label className="block">
                                        <span className="mb-1 block text-muted-foreground">
                                            Image URL
                                        </span>
                                        <input
                                            value={selected.imageUrl ?? ''}
                                            onChange={(e) =>
                                                updateVisual(selected.id, {
                                                    imageUrl: e.target.value,
                                                })
                                            }
                                            className="w-full rounded border border-border bg-background px-2 py-1"
                                        />
                                    </label>
                                )}
                                {(
                                    [
                                        ['showTitle', 'Show title'],
                                        ['showLegend', 'Show legend'],
                                        ['showLabels', 'Data labels'],
                                        ['border', 'Border'],
                                        ['shadow', 'Shadow'],
                                        [
                                            'conditionalFormat',
                                            'Conditional formatting (data bars)',
                                        ],
                                        ['subtotals', 'Totals / subtotals'],
                                    ] as const
                                ).map(([key, label]) => (
                                    <label
                                        key={key}
                                        className="flex items-center justify-between"
                                    >
                                        <span>{label}</span>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(selected[key])}
                                            onChange={(e) =>
                                                updateVisual(selected.id, {
                                                    [key]: e.target.checked,
                                                })
                                            }
                                            className="accent-[var(--brand)]"
                                        />
                                    </label>
                                ))}
                                <label className="block">
                                    <span className="mb-1 block text-muted-foreground">
                                        Data colors (palette offset)
                                    </span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={7}
                                        value={selected.colorIndex}
                                        onChange={(e) =>
                                            updateVisual(selected.id, {
                                                colorIndex: Number(
                                                    e.target.value,
                                                ),
                                            })
                                        }
                                        className="w-full accent-[var(--brand)]"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-muted-foreground">
                                        Alt text (accessibility)
                                    </span>
                                    <input
                                        value={selected.altText}
                                        onChange={(e) =>
                                            updateVisual(selected.id, {
                                                altText: e.target.value,
                                            })
                                        }
                                        className="w-full rounded border border-border bg-background px-2 py-1"
                                    />
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['x', 'y', 'w', 'h'] as const).map(
                                        (k) => (
                                            <label key={k}>
                                                <span className="mb-1 block text-muted-foreground">
                                                    {k === 'w'
                                                        ? 'Width'
                                                        : k === 'h'
                                                          ? 'Height'
                                                          : k.toUpperCase()}{' '}
                                                    px
                                                </span>
                                                <input
                                                    type="number"
                                                    value={selected[k]}
                                                    onChange={(e) =>
                                                        updateVisual(
                                                            selected.id,
                                                            {
                                                                [k]: Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            },
                                                        )
                                                    }
                                                    className="w-full rounded border border-border bg-background px-2 py-1"
                                                />
                                            </label>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

                        {tab === 'analytics' && (
                            <div className="space-y-2 text-[11px]">
                                {(
                                    [
                                        'constant',
                                        'average',
                                        'trend',
                                        'forecast',
                                    ] as const
                                ).map((k) => (
                                    <label
                                        key={k}
                                        className="flex items-center justify-between capitalize"
                                    >
                                        <span>{k} line</span>
                                        <input
                                            type="checkbox"
                                            checked={selected.analytics.some(
                                                (a) => a.kind === k,
                                            )}
                                            onChange={() =>
                                                toggleAnalytics(selected.id, k)
                                            }
                                            className="accent-[var(--brand)]"
                                        />
                                    </label>
                                ))}
                                <p className="pt-2 text-muted-foreground">
                                    Lines apply to cartesian visuals (column,
                                    line, combo).
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/* ---------------------------- Filters pane ---------------------------- */

export function FiltersPane() {
    const { filters, addFilter, toggleFilterValue, removeFilter, selected } =
        usePbi();
    const columns = TABLES.flatMap((t) => t.fields)
        .filter((f) => f.type !== 'number')
        .map((f) => f.name);

    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Filters"
                right={<Filter className="size-3 text-muted-foreground" />}
            />
            <div className="px-3 pb-2">
                <select
                    value=""
                    onChange={(e) =>
                        e.target.value && addFilter(e.target.value)
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                >
                    <option value="">Add a filter field…</option>
                    {columns.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex-1 space-y-2 overflow-auto px-3 pb-3">
                {selected && (
                    <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                        Filters on this visual: {selected.name}
                    </p>
                )}
                {!filters.length && (
                    <p className="text-[11px] text-muted-foreground">
                        Filters on all pages. Double-click a field in the Data
                        pane to add it here.
                    </p>
                )}
                {filters.map((f) => (
                    <div
                        key={f.column}
                        className="rounded border border-border bg-background p-2"
                    >
                        <div className="mb-1 flex items-center justify-between text-[11px] font-medium">
                            <span>
                                {f.column}{' '}
                                <span className="text-muted-foreground">
                                    is{' '}
                                    {f.values.length
                                        ? f.values.join(', ')
                                        : '(All)'}
                                </span>
                            </span>
                            <button onClick={() => removeFilter(f.column)}>
                                <X className="size-3 text-muted-foreground hover:text-destructive" />
                            </button>
                        </div>
                        <div className="max-h-36 overflow-auto">
                            {distinctValues(f.column).map((v) => (
                                <label
                                    key={v}
                                    className="flex items-center gap-2 py-[1px] text-[11px]"
                                >
                                    <input
                                        type="checkbox"
                                        checked={f.values.includes(v)}
                                        onChange={() =>
                                            toggleFilterValue(f.column, v)
                                        }
                                        className="size-3 accent-[var(--brand)]"
                                    />
                                    <span className="truncate">{v}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* --------------------------- Selection pane --------------------------- */

export function SelectionPane() {
    const {
        page,
        selected,
        select,
        updateVisual,
        toggleVisualHidden,
        reorderVisual,
        togglePane,
    } = usePbi();
    const ordered = [...page.visuals].sort((a, b) => b.z - a.z);
    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Selection"
                right={
                    <button
                        onClick={() => togglePane('selection')}
                        aria-label="Close selection pane"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
            />
            <p className="px-3 pb-1 text-[10px] text-muted-foreground">
                Layer order (front to back) · tab order
            </p>
            <div className="flex-1 overflow-auto px-2 pb-2">
                {ordered.map((v, i) => (
                    <div
                        key={v.id}
                        className={cn(
                            'mb-1 flex items-center gap-1 rounded px-1 py-1 text-[11px]',
                            selected?.id === v.id
                                ? 'bg-brand/15'
                                : 'hover:bg-accent',
                        )}
                    >
                        <span className="w-4 text-center text-[9px] text-muted-foreground">
                            {i + 1}
                        </span>
                        <input
                            value={v.name}
                            onChange={(e) =>
                                updateVisual(v.id, { name: e.target.value })
                            }
                            onFocus={() => select(v.id)}
                            className="min-w-0 flex-1 truncate bg-transparent outline-none"
                        />
                        <button
                            onClick={() => reorderVisual(v.id, -1)}
                            aria-label="Move up"
                        >
                            <ChevronUp className="size-3 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button
                            onClick={() => reorderVisual(v.id, 1)}
                            aria-label="Move down"
                        >
                            <ChevronDown className="size-3 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button
                            onClick={() => toggleVisualHidden(v.id)}
                            aria-label="Toggle visibility"
                        >
                            {v.hidden ? (
                                <EyeOff className="size-3 text-muted-foreground" />
                            ) : (
                                <Eye className="size-3 text-muted-foreground hover:text-foreground" />
                            )}
                        </button>
                    </div>
                ))}
                {!ordered.length && (
                    <p className="px-1 text-[11px] text-muted-foreground">
                        No objects on this page.
                    </p>
                )}
            </div>
        </div>
    );
}

/* --------------------------- Bookmarks pane --------------------------- */

export function BookmarksPane() {
    const {
        bookmarks,
        addBookmark,
        applyBookmark,
        removeBookmark,
        togglePane,
    } = usePbi();
    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Bookmarks"
                right={
                    <button
                        onClick={() => togglePane('bookmarks')}
                        aria-label="Close bookmarks pane"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
            />
            <div className="px-3 pb-2">
                <button
                    onClick={() =>
                        addBookmark(window.prompt('Bookmark name') ?? '')
                    }
                    className="flex w-full items-center justify-center gap-1 rounded border border-border py-1 text-[11px] hover:bg-accent"
                >
                    <Plus className="size-3" /> Add bookmark
                </button>
            </div>
            <div className="flex-1 overflow-auto px-2 pb-2">
                {!bookmarks.length && (
                    <p className="px-1 text-[11px] text-muted-foreground">
                        Bookmarks capture filters, slicer selections,
                        cross-filtering and visual visibility.
                    </p>
                )}
                {bookmarks.map((b) => (
                    <div
                        key={b.id}
                        className="mb-1 flex items-center gap-1 rounded px-1 py-1 text-[11px] hover:bg-accent"
                    >
                        <Bookmark className="size-3 text-brand-foreground" />
                        <button
                            onClick={() => applyBookmark(b.id)}
                            className="min-w-0 flex-1 truncate text-left"
                        >
                            {b.name}
                        </button>
                        <button
                            onClick={() => removeBookmark(b.id)}
                            aria-label="Delete bookmark"
                        >
                            <X className="size-3 text-muted-foreground hover:text-destructive" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* -------------------------- Sync slicers pane -------------------------- */

export function SyncSlicersPane() {
    const { page, pages, slicerSync, setSlicerSync, togglePane } = usePbi();
    const slicers = page.visuals.filter((v) =>
        v.type.toLowerCase().includes('slicer'),
    );
    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Sync slicers"
                right={
                    <button
                        onClick={() => togglePane('syncSlicers')}
                        aria-label="Close sync slicers pane"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
            />
            <div className="flex-1 overflow-auto px-3 pb-3 text-[11px]">
                {!slicers.length && (
                    <p className="text-muted-foreground">
                        Add a slicer to this page to sync it.
                    </p>
                )}
                {slicers.map((s) => (
                    <div key={s.id} className="mb-3">
                        <div className="mb-1 font-medium">
                            {s.name || visualTypeLabel(s.type)}
                        </div>
                        {pages.map((p) => (
                            <label
                                key={p.id}
                                className="flex items-center justify-between py-[1px]"
                            >
                                <span className="truncate">{p.name}</span>
                                <input
                                    type="checkbox"
                                    checked={
                                        p.id === page.id ||
                                        (slicerSync[s.id] ?? []).includes(p.id)
                                    }
                                    disabled={p.id === page.id}
                                    onChange={() => setSlicerSync(s.id, p.id)}
                                    className="size-3 accent-[var(--brand)]"
                                />
                            </label>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}