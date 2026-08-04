import {
    Bookmark,
    Braces,
    ChevronDown,
    Columns3,
    FolderCog,
    Image,
    Layers,
    Link2,
    MousePointerClick,
    Network,
    Palette,
    Shapes as ShapesIcon,
    SquareMousePointer,
    Type,
} from 'lucide-react';
import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { SHAPE_KINDS, SHAPES, ShapeGlyph } from '@/lib/pbi/shapes';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';

const TABS = ['Insertion', 'Affichage'] as const;

type Action = {
    label: string;
    icon: React.ElementType;
    onClick?: () => void;
    active?: boolean;
};

type Group = {
    title: string;
    actions: Action[];
    /** when present, renders a single custom control instead of actions */
    menu?: React.ReactNode;
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

/** A single "Shapes" button that opens a grid of shape glyphs on click. */
function ShapesMenu() {
    const { addShape } = usePbi();
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className="flex h-[62px] w-[74px] flex-col items-center justify-center gap-1 rounded px-1 text-[10px] leading-tight text-foreground transition-colors hover:bg-accent"
                    aria-label="Insérer des formes"
                >
                    <ShapesIcon
                        className="size-5 text-foreground"
                        strokeWidth={1.6}
                    />
                    <span className="flex items-center gap-0.5">
                        Formes
                        <ChevronDown className="size-2.5 text-muted-foreground" />
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="w-auto p-2">
                <div className="grid grid-cols-3 gap-1">
                    {SHAPE_KINDS.map((kind) => (
                        <button
                            key={kind}
                            title={SHAPES[kind].label}
                            onClick={() => addShape(kind)}
                            className="flex h-8 w-8 items-center justify-center rounded border border-transparent p-1.5 text-foreground transition-colors hover:border-brand hover:bg-accent"
                        >
                            <ShapeGlyph
                                kind={kind}
                                stroke="#000000"
                                strokeWidth={2.5}
                                className="h-full w-full"
                            />
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
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
        smartNetwork,
        setSmartNetworkFilter,
    } = usePbi();
    const [collapsed, setCollapsed] = useState(false);

    const groups: Record<string, Group[]> = {
        Insertion: [
            {
                title: 'Formes',
                actions: [],
                menu: <ShapesMenu />,
            },
            {
                title: 'Éléments',
                actions: [
                    {
                        label: 'Zone de texte',
                        icon: Type,
                        onClick: () => addVisual('text'),
                    },
                    {
                        label: 'Image',
                        icon: Image,
                        onClick: () => addVisual('image'),
                    },
                    {
                        label: 'Bouton',
                        icon: SquareMousePointer,
                        onClick: () => addVisual('button'),
                    },
                    {
                        label: 'Signet',
                        icon: Bookmark,
                        onClick: () => addBookmark(''),
                    },
                ],
            },
            {
                title: 'Calculs',
                actions: [
                    {
                        label: 'Nouvelle mesure',
                        icon: Braces,
                        onClick: onOpenDax,
                    },
                    {
                        label: 'Gérer les mesures',
                        icon: FolderCog,
                        onClick: onOpenManage,
                    },
                ],
            },
        ],
        Affichage: [
            {
                title: 'Afficher les volets',
                actions: [
                    {
                        label: 'Sélection',
                        icon: Layers,
                        active: openPanes.selection,
                        onClick: () => togglePane('selection'),
                    },
                    {
                        label: 'Signets',
                        icon: Bookmark,
                        active: openPanes.bookmarks,
                        onClick: () => togglePane('bookmarks'),
                    },
                    {
                        label: 'Synchroniser les segments',
                        icon: Link2,
                        active: openPanes.syncSlicers,
                        onClick: () => togglePane('syncSlicers'),
                    },
                    {
                        label: 'Filtres',
                        icon: Columns3,
                        active: openPanes.filters,
                        onClick: () => togglePane('filters'),
                    },
                    {
                        label: 'Thèmes',
                        icon: Palette,
                        active: openPanes.themes,
                        onClick: () => togglePane('themes'),
                    },
                ],
            },
            {
                title: 'Interactions',
                actions: [
                    {
                        label: 'Modifier les interactions',
                        icon: MousePointerClick,
                        active: editInteractions,
                        onClick: () => toggleEditInteractions(),
                    },
                    {
                        label: 'Filtrage réseau',
                        icon: Network,
                        active: smartNetwork,
                        onClick: () => setSmartNetworkFilter(!smartNetwork),
                    },
                ],
            },
        ],
    };

    const active = groups[ribbonTab] ?? groups['Insertion'] ?? [];

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
                    <span className="hidden sm:inline">Thème : {theme}</span>
                    <button
                        onClick={() => setCollapsed((c) => !c)}
                        className="rounded p-1 hover:bg-accent"
                        aria-label="Réduire le ruban"
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
                <div className="flex h-[90px] items-stretch overflow-x-auto border-t border-border bg-ribbon">
                    {active.map((g) => (
                        <Group key={g.title} title={g.title}>
                            {g.menu ??
                                g.actions.map((a) => (
                                    <RibbonButton key={a.label} {...a} />
                                ))}
                        </Group>
                    ))}
                </div>
            )}
        </div>
    );
}
