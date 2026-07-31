import {
    BarChart3,
    Bookmark,
    Braces,
    Calendar,
    ChevronDown,
    Clock,
    Columns3,
    Database,
    FileDown,
    Gauge,
    Grid2x2,
    HelpCircle,
    Image,
    Keyboard,
    Layers,
    LayoutGrid,
    Link2,
    ListTree,
    Magnet,
    MessageSquare,
    MousePointerClick,
    Palette,
    RefreshCw,
    Save,
    Share2,
    Shield,
    Smartphone,
    Sparkles,
    Square,
    Table2,
    TextCursorInput,
    Type,
    Upload,
    Wand2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';

const TABS = [
    'File',
    'Home',
    'Insert',
    'Modeling',
    'View',
    'Optimize',
    'Help',
] as const;

type Action = {
    label: string;
    icon: React.ElementType;
    onClick?: () => void;
    active?: boolean;
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
            <Icon className="size-5 text-brand-foreground" strokeWidth={1.6} />
            <span className="text-center">{label}</span>
        </button>
    );
}

export function Ribbon({
    onOpenPowerQuery,
    onOpenDax,
    onOpenPerformance,
    onOpenQna,
    onSave,
}: {
    onOpenPowerQuery: () => void;
    onOpenDax: () => void;
    onOpenPerformance: () => void;
    onOpenQna: () => void;
    onSave?: () => void;
}) {
    const {
        ribbonTab,
        setRibbonTab,
        addVisual,
        addPage,
        theme,
        setTheme,
        setState,
        showGridlines,
        snapToGrid,
        mobileView,
        editInteractions,
        openPanes,
        togglePane,
        addBookmark,
    } = usePbi();
    const [collapsed, setCollapsed] = useState(false);
    const soon = (what: string) => () =>
        toast.info(what, { description: 'Demo action' });

    const groups: Record<string, { title: string; actions: Action[] }[]> = {
        File: [
            {
                title: 'Report',
                actions: [
                    { label: 'New', icon: Square, onClick: soon('New report') },
                    {
                        label: 'Open',
                        icon: Database,
                        onClick: soon('Open report'),
                    },
                    {
                        label: 'Save',
                        icon: Save,
                        onClick:
                            onSave ??
                            (() => toast.success('Report saved locally')),
                    },
                ],
            },
            {
                title: 'Export',
                actions: [
                    {
                        label: 'Export PDF',
                        icon: FileDown,
                        onClick: soon('Export to PDF'),
                    },
                    {
                        label: 'Publish',
                        icon: Upload,
                        onClick: () => toast.success('Published to workspace'),
                    },
                ],
            },
        ],
        Home: [
            {
                title: 'Data',
                actions: [
                    {
                        label: 'Get data',
                        icon: Database,
                        onClick: onOpenPowerQuery,
                    },
                    {
                        label: 'Excel',
                        icon: Table2,
                        onClick: soon('Import Excel workbook'),
                    },
                    {
                        label: 'Enter data',
                        icon: TextCursorInput,
                        onClick: soon('Enter data'),
                    },
                ],
            },
            {
                title: 'Queries',
                actions: [
                    {
                        label: 'Transform data',
                        icon: Wand2,
                        onClick: onOpenPowerQuery,
                    },
                    {
                        label: 'Refresh',
                        icon: RefreshCw,
                        onClick: () => toast.success('Model refreshed'),
                    },
                ],
            },
            {
                title: 'Insert',
                actions: [
                    {
                        label: 'New visual',
                        icon: BarChart3,
                        onClick: () => addVisual('column'),
                    },
                    {
                        label: 'Text box',
                        icon: Type,
                        onClick: () => addVisual('text'),
                    },
                    { label: 'New page', icon: LayoutGrid, onClick: addPage },
                ],
            },
            {
                title: 'Calculations',
                actions: [
                    { label: 'New measure', icon: Braces, onClick: onOpenDax },
                    {
                        label: 'Quick measure',
                        icon: Sparkles,
                        onClick: onOpenDax,
                    },
                ],
            },
            {
                title: 'Share',
                actions: [
                    {
                        label: 'Publish',
                        icon: Share2,
                        onClick: () => toast.success('Published to workspace'),
                    },
                ],
            },
        ],
        Insert: [
            {
                title: 'Visuals',
                actions: [
                    {
                        label: 'Column',
                        icon: BarChart3,
                        onClick: () => addVisual('column'),
                    },
                    {
                        label: 'Line',
                        icon: BarChart3,
                        onClick: () => addVisual('line'),
                    },
                    {
                        label: 'Waterfall',
                        icon: BarChart3,
                        onClick: () => addVisual('waterfall'),
                    },
                    {
                        label: 'Treemap',
                        icon: LayoutGrid,
                        onClick: () => addVisual('treemap'),
                    },
                    {
                        label: 'Map',
                        icon: LayoutGrid,
                        onClick: () => addVisual('map'),
                    },
                    {
                        label: 'Table',
                        icon: Table2,
                        onClick: () => addVisual('table'),
                    },
                    {
                        label: 'Card',
                        icon: Square,
                        onClick: () => addVisual('card'),
                    },
                    {
                        label: 'Slicer',
                        icon: Columns3,
                        onClick: () => addVisual('buttonSlicer'),
                    },
                    {
                        label: 'Gauge',
                        icon: Gauge,
                        onClick: () => addVisual('gauge'),
                    },
                ],
            },
            {
                title: 'AI visuals',
                actions: [
                    { label: 'Q&A', icon: MessageSquare, onClick: onOpenQna },
                    {
                        label: 'Key influencers',
                        icon: Sparkles,
                        onClick: () => addVisual('keyInfluencers'),
                    },
                    {
                        label: 'Decomp tree',
                        icon: ListTree,
                        onClick: () => addVisual('decompositionTree'),
                    },
                    {
                        label: 'Smart narrative',
                        icon: Type,
                        onClick: () => addVisual('smartNarrative'),
                    },
                ],
            },
            {
                title: 'Scripted',
                actions: [
                    {
                        label: 'R visual',
                        icon: Braces,
                        onClick: () => addVisual('rVisual'),
                    },
                    {
                        label: 'Python visual',
                        icon: Braces,
                        onClick: () => addVisual('pythonVisual'),
                    },
                ],
            },
            {
                title: 'Elements',
                actions: [
                    {
                        label: 'Text box',
                        icon: Type,
                        onClick: () => addVisual('text'),
                    },
                    {
                        label: 'Image',
                        icon: Image,
                        onClick: () => addVisual('image'),
                    },
                    {
                        label: 'Button',
                        icon: Square,
                        onClick: () => addVisual('button'),
                    },
                    {
                        label: 'Bookmark',
                        icon: Bookmark,
                        onClick: () => addBookmark(''),
                    },
                ],
            },
        ],
        Modeling: [
            {
                title: 'Calculations',
                actions: [
                    { label: 'New measure', icon: Braces, onClick: onOpenDax },
                    { label: 'New column', icon: Columns3, onClick: onOpenDax },
                    { label: 'New table', icon: Table2, onClick: onOpenDax },
                ],
            },
            {
                title: 'Relationships',
                actions: [
                    {
                        label: 'Manage relationships',
                        icon: Link2,
                        onClick: soon('Manage relationships'),
                    },
                ],
            },
            {
                title: 'Security',
                actions: [
                    {
                        label: 'Manage roles',
                        icon: Shield,
                        onClick: soon('Row-level security roles'),
                    },
                ],
            },
            {
                title: 'Calendars',
                actions: [
                    {
                        label: 'Mark as date table',
                        icon: Calendar,
                        onClick: soon('Marked Date as date table'),
                    },
                ],
            },
        ],
        View: [
            {
                title: 'Themes',
                actions: [
                    {
                        label: 'Default',
                        icon: Palette,
                        onClick: () => setTheme('default'),
                        active: theme === 'default',
                    },
                    {
                        label: 'Executive',
                        icon: Palette,
                        onClick: () => setTheme('executive'),
                        active: theme === 'executive',
                    },
                    {
                        label: 'Innovate',
                        icon: Palette,
                        onClick: () => setTheme('innovate'),
                        active: theme === 'innovate',
                    },
                ],
            },
            {
                title: 'Page options',
                actions: [
                    {
                        label: 'Gridlines',
                        icon: Grid2x2,
                        active: showGridlines,
                        onClick: () =>
                            setState((s) => ({
                                ...s,
                                showGridlines: !s.showGridlines,
                            })),
                    },
                    {
                        label: 'Snap to grid',
                        icon: Magnet,
                        active: snapToGrid,
                        onClick: () =>
                            setState((s) => ({
                                ...s,
                                snapToGrid: !s.snapToGrid,
                            })),
                    },
                    {
                        label: 'Mobile layout',
                        icon: Smartphone,
                        active: mobileView,
                        onClick: () =>
                            setState((s) => ({
                                ...s,
                                mobileView: !s.mobileView,
                            })),
                    },
                ],
            },
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
                        onClick: () =>
                            setState((s) => ({
                                ...s,
                                editInteractions: !s.editInteractions,
                            })),
                    },
                    {
                        label: 'Tab order',
                        icon: Keyboard,
                        onClick: () => togglePane('selection'),
                    },
                ],
            },
        ],
        Optimize: [
            {
                title: 'Performance',
                actions: [
                    {
                        label: 'Performance analyzer',
                        icon: Clock,
                        onClick: onOpenPerformance,
                    },
                ],
            },
        ],
        Help: [
            {
                title: 'Support',
                actions: [
                    {
                        label: 'Documentation',
                        icon: HelpCircle,
                        onClick: soon('Documentation'),
                    },
                    {
                        label: 'Community',
                        icon: MessageSquare,
                        onClick: soon('Community forums'),
                    },
                ],
            },
        ],
    };

    const active = groups[ribbonTab] ?? [];

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
                <div className="flex h-[86px] items-stretch overflow-x-auto border-t border-border bg-ribbon">
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
