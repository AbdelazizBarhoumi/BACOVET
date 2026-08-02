import {
    Bookmark,
    Braces,
    Calendar,
    ChartArea,
    ChartBar,
    ChartBarBig,
    ChartCandlestick,
    ChartColumn,
    ChartColumnBig,
    ChartLine,
    ChartPie,
    ChartScatter,
    ChartSpline,
    CheckCheck,
    ChevronDown,
    Circle,
    Columns3,
    Donut,
    FolderCog,
    Frame,
    Gauge,
    Grid3x3,
    Hexagon,
    Image,
    Layers,
    LayoutGrid,
    Link2,
    List,
    ListFilter,
    Map,
    MapPin,
    SquareMousePointer,
    Table2,
    TextCursorInput,
    Ticket,
    ToggleLeft,
    TrendingUp,
    Type,
    MousePointerClick,
} from 'lucide-react';
import { useState } from 'react';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';

const TABS = [
    'Insert',
    'Modeling',
    'View',
] as const;

type Action = {
    label: string;
    icon: React.ElementType;
    onClick?: () => void;
    active?: boolean;
};

type Group = {
    title: string;
    actions: Action[];
};

function Group({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full flex-col justify-between border-r border-border px-3 pt-1.5 pb-1">
            <div className="flex items-start gap-1">{children}</div>
            <div className="pt-1 text-center text-[10px] text-muted-foreground">
                {title}
            </div>
        </div>
    );
}

function RibbonButton({ label, icon: Icon, onClick, active }: Action) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex h-[62px] w-[74px] flex-col items-center justify-center gap-1 rounded px-1 text-[10px] leading-tight text-foreground transition-colors hover:bg-accent',
                active && 'bg-brand/15 ring-1 ring-brand',
            )}
        >
            <Icon className="size-5 text-foreground" strokeWidth={1.6} />
            <span className="text-center">{label}</span>
        </button>
    );
}

export function Ribbon({
    onOpenDax,
    onOpenManage,
}: {
    onOpenDax: () => void;
    onOpenManage: () => void;
}) {
    const {
        ribbonTab,
        setRibbonTab,
        addVisual,
        theme,
        openPanes,
        togglePane,
        addBookmark,
        editInteractions,
        toggleEditInteractions,
    } = usePbi();
    const [collapsed, setCollapsed] = useState(false);

    const groups: Record<string, Group[]> = {
        Insert: [
            {
                title: 'Comparison',
                actions: [
                    { label: 'Clustered column', icon: ChartColumnBig, onClick: () => addVisual('column') },
                    { label: 'Stacked column', icon: ChartColumn, onClick: () => addVisual('stackedColumn') },
                    { label: '100% stacked column', icon: ChartColumn, onClick: () => addVisual('stacked100Column') },
                    { label: 'Clustered bar', icon: ChartBarBig, onClick: () => addVisual('bar') },
                    { label: 'Stacked bar', icon: ChartBar, onClick: () => addVisual('stackedBar') },
                    { label: '100% stacked bar', icon: ChartBar, onClick: () => addVisual('stacked100Bar') },
                    { label: 'Line', icon: ChartLine, onClick: () => addVisual('line') },
                    { label: 'Area', icon: ChartArea, onClick: () => addVisual('area') },
                    { label: 'Stacked area', icon: ChartArea, onClick: () => addVisual('stackedArea') },
                    { label: 'Combo', icon: ChartSpline, onClick: () => addVisual('combo') },
                ],
            },
            {
                title: 'Part to whole',
                actions: [
                    { label: 'Pie', icon: ChartPie, onClick: () => addVisual('pie') },
                    { label: 'Donut', icon: Donut, onClick: () => addVisual('donut') },
                    { label: 'Treemap', icon: LayoutGrid, onClick: () => addVisual('treemap') },
                    { label: 'Funnel', icon: ListFilter, onClick: () => addVisual('funnel') },
                    { label: 'Ribbon', icon: Ticket, onClick: () => addVisual('ribbon') },
                    { label: 'Waterfall', icon: ChartCandlestick, onClick: () => addVisual('waterfall') },
                    { label: 'Scatter', icon: ChartScatter, onClick: () => addVisual('scatter') },
                    { label: 'Bubble', icon: Circle, onClick: () => addVisual('bubble') },
                ],
            },
            {
                title: 'Single value',
                actions: [
                    { label: 'Card', icon: Frame, onClick: () => addVisual('card') },
                    { label: 'KPI', icon: TrendingUp, onClick: () => addVisual('kpi') },
                    { label: 'Gauge', icon: Gauge, onClick: () => addVisual('gauge') },
                    { label: 'Table', icon: Table2, onClick: () => addVisual('table') },
                    { label: 'Matrix', icon: Grid3x3, onClick: () => addVisual('matrix') },
                ],
            },
            {
                title: 'Maps',
                actions: [
                    { label: 'Map', icon: MapPin, onClick: () => addVisual('map') },
                    { label: 'Filled map', icon: Map, onClick: () => addVisual('filledMap') },
                    { label: 'Shape map', icon: Hexagon, onClick: () => addVisual('shapeMap') },
                ],
            },
            {
                title: 'Slicers',
                actions: [
                    { label: 'Slicer (checkbox)', icon: CheckCheck, onClick: () => addVisual('slicer') },
                    { label: 'Button slicer', icon: ToggleLeft, onClick: () => addVisual('buttonSlicer') },
                    { label: 'List slicer', icon: List, onClick: () => addVisual('listSlicer') },
                    { label: 'Input slicer', icon: TextCursorInput, onClick: () => addVisual('inputSlicer') },
                    { label: 'Date slicer', icon: Calendar, onClick: () => addVisual('dateSlicer') },
                ],
            },
            {
                title: 'Elements',
                actions: [
                    { label: 'Text box', icon: Type, onClick: () => addVisual('text') },
                    { label: 'Image', icon: Image, onClick: () => addVisual('image') },
                    { label: 'Button', icon: SquareMousePointer, onClick: () => addVisual('button') },
                    { label: 'Bookmark', icon: Bookmark, onClick: () => addBookmark('') },
                ],
            },
        ],
        Modeling: [
            {
                title: 'Calculations',
                actions: [
                    { label: 'New measure', icon: Braces, onClick: onOpenDax },
                    { label: 'Manage measures', icon: FolderCog, onClick: onOpenManage },
                ],
            },
        ],
        View: [
            {
                title: 'Show panes',
                actions: [
                    {
                        label: 'Selection',
                        icon: Layers,
                        active: openPanes.selection,
                        onClick: () => togglePane('selection'),
                    },
                    {
                        label: 'Bookmarks',
                        icon: Bookmark,
                        active: openPanes.bookmarks,
                        onClick: () => togglePane('bookmarks'),
                    },
                    {
                        label: 'Sync slicers',
                        icon: Link2,
                        active: openPanes.syncSlicers,
                        onClick: () => togglePane('syncSlicers'),
                    },
                    {
                        label: 'Filters',
                        icon: Columns3,
                        active: openPanes.filters,
                        onClick: () => togglePane('filters'),
                    },
                ],
            },
            {
                title: 'Interactions',
                actions: [
                    {
                        label: 'Edit interactions',
                        icon: MousePointerClick,
                        active: editInteractions,
                        onClick: () => toggleEditInteractions(),
                    },
                ],
            },
        ],
    };

    const active = groups[ribbonTab] ?? groups['Insert'] ?? [];

    return (
        <div className="border-b border-border bg-panel">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-end">
                    {TABS.map((t) => (
                        <button
                            key={t}
                            onClick={() => {
                                setRibbonTab(t);
                                setCollapsed(false);
                            }}
                            className={cn(
                                'px-3 py-1.5 text-[12px] transition-colors',
                                ribbonTab === t
                                    ? 'border-b-2 border-brand font-semibold text-foreground'
                                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 pr-1 text-[11px] text-muted-foreground">
                    <span className="hidden sm:inline">Theme: {theme}</span>
                    <button
                        onClick={() => setCollapsed((c) => !c)}
                        className="rounded p-1 hover:bg-accent"
                        aria-label="Collapse ribbon"
                    >
                        <ChevronDown
                            className={cn(
                                'size-4 transition-transform',
                                collapsed && 'rotate-180',
                            )}
                        />
                    </button>
                </div>
            </div>
            {!collapsed && (
                <div className="flex h-[100px] items-stretch overflow-x-auto border-t border-border bg-ribbon">
                    {active.map((g) => (
                        <Group key={g.title} title={g.title}>
                            {g.actions.map((a) => (
                                <RibbonButton key={a.label} {...a} />
                            ))}
                        </Group>
                    ))}
                </div>
            )}
        </div>
    );
}
