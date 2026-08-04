import {
    BubbleMultipleRegular,
    ButtonRegular,
    CalendarLtrRegular,
    CardUiRegular,
    ChartMultipleRegular,
    CheckboxCheckedRegular,
    ChevronDownRegular,
    DataAreaRegular,
    DataBarHorizontalRegular,
    DataBarVerticalRegular,
    DataFunnelRegular,
    DataLineRegular,
    DataPieRegular,
    DataScatterRegular,
    DataTreemapRegular,
    DataWaterfallRegular,
    GaugeRegular,
    GridRegular,
    ImageRegular,
    MapRegular,
    NumberSymbolRegular,
    TableRegular,
    TextCaseTitleRegular,
    TextboxRegular,
    ToggleLeftRegular,
} from '@fluentui/react-icons';
import { usePage } from '@inertiajs/react';
import {
    Bookmark,
    ChevronDown,
    ChevronRight,
    ChevronsRight,
    ChevronUp,
    Eye,
    EyeOff,
    Filter,
    Folder,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Sigma,
    Table2,
    Trash2,
    TriangleAlert,
    Upload,
    X,
} from 'lucide-react';
import { Fragment, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    relativeDateRange,
    type FilterType,
    type RelativePreset,
} from '@/lib/pbi/filters';
import {
    MEASURES,
    NUMBER_FORMATS,
    PAGE_PRESETS,
    VALUE_AGGREGATION_MODES,
    distinctValues,
    fieldIssue,
    fieldLabel,
    fieldNumericIssue,
    fieldType,
    isMeasure,
    measureError,
    measureLabel,
    type Agg,
    type Field,
    type NumberFormat,
    type ValueAggregationMode,
    type Visual,
    type VisualType,
} from '@/lib/pbi/model';
import { SHAPE_KINDS, SHAPES, type ShapeKind } from '@/lib/pbi/shapes';
import {
    defaultDropWell,
    usePbi,
    visualTypeLabel,
    type WellName,
} from '@/lib/pbi/store';
import {
    THEME_COLOR_COUNT,
    THEMES,
    isValidPalette,
    themeById,
    type ReportTheme,
} from '@/lib/pbi/themes';
import { uploadPageImage } from '@/lib/pbi/uploadImage';
import { isSingleValueType, visualConfig } from '@/lib/pbi/visualConfig';
import { cn } from '@/lib/utils';
import { CartesianFormat } from './CartesianFormat';
import { ConditionalFormatControl } from './ConditionalFormatDialog';
import { DaxDialog, ManageMeasuresDialog } from './Dialogs';
import {
    ALIGNS,
    Biu,
    ColorInput,
    FONT_OPTIONS,
    NumberInput,
    Section,
    Select,
    TextInput,
    Toggle,
    resolveColor,
    TitleSection,
} from './formatControls';
import { GaugeFormat } from './GaugeFormat';
import { SingleValueFormat } from './SingleValueFormat';

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

/* ------------------------------ Icon set ------------------------------- */
/* The Visualizations pane and Data pane now use Microsoft's own Fluent UI
 * System Icons (@fluentui/react-icons) — the same open-source icon family
 * Power BI, Teams, and the rest of Microsoft 365 are built on — instead of
 * hand-drawn approximations. `npm install @fluentui/react-icons` to pull
 * this in.
 *
 * Fluent doesn't ship a dedicated glyph for every Power BI chart *subtype*
 * (it has one generic bar icon, not separate clustered / stacked / 100%-
 * stacked variants, and nothing for donut, ribbon, filled/shape map, R/
 * Python badges, etc). Those handful of gaps are filled in below with small
 * custom glyphs drawn in the same 20x20, single-color-fill style Fluent
 * icons use, so they sit naturally next to the real ones rather than
 * clashing with a different visual language. */

type IconComponent = React.ComponentType<{ className?: string }>;

function customIcon(paths: React.ReactNode): IconComponent {
    return function Icon({ className }: { className?: string }) {
        return (
            <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
            >
                {paths}
            </svg>
        );
    };
}

// Fluent has one generic DataBarVerticalRegular / DataBarHorizontalRegular —
// no separate stacked / 100%-stacked glyphs. Built to match their corner
// radius and proportions so the set still reads as one family.
const IconStackedColumn = customIcon(
    <>
        <rect x="4" y="11" width="3" height="6" rx="1" />
        <rect x="4" y="6" width="3" height="4.2" rx="1" opacity={0.45} />
        <rect x="9" y="8.5" width="3" height="8.5" rx="1" />
        <rect x="9" y="3" width="3" height="5" rx="1" opacity={0.45} />
        <rect x="14" y="13" width="3" height="4" rx="1" />
        <rect x="14" y="7" width="3" height="5.5" rx="1" opacity={0.45} />
    </>,
);
const IconStacked100Column = customIcon(
    <>
        <rect x="4" y="9" width="3" height="8" rx="1" />
        <rect x="4" y="3" width="3" height="5.5" rx="1" opacity={0.45} />
        <rect x="9" y="12" width="3" height="5" rx="1" />
        <rect x="9" y="3" width="3" height="8.5" rx="1" opacity={0.45} />
        <rect x="14" y="7" width="3" height="10" rx="1" />
        <rect x="14" y="3" width="3" height="3.5" rx="1" opacity={0.45} />
    </>,
);
const IconStackedBar = customIcon(
    <>
        <rect x="3" y="4" width="7" height="3" rx="1" />
        <rect x="10.3" y="4" width="5" height="3" rx="1" opacity={0.45} />
        <rect x="3" y="8.5" width="10" height="3" rx="1" />
        <rect x="13.3" y="8.5" width="4" height="3" rx="1" opacity={0.45} />
        <rect x="3" y="13" width="5" height="3" rx="1" />
        <rect x="8.3" y="13" width="8" height="3" rx="1" opacity={0.45} />
    </>,
);
const IconStacked100Bar = customIcon(
    <>
        <rect x="3" y="4" width="10" height="3" rx="1" />
        <rect x="13.3" y="4" width="4" height="3" rx="1" opacity={0.45} />
        <rect x="3" y="8.5" width="6" height="3" rx="1" />
        <rect x="9.3" y="8.5" width="8" height="3" rx="1" opacity={0.45} />
        <rect x="3" y="13" width="12" height="3" rx="1" />
        <rect x="15.3" y="13" width="2" height="3" rx="1" opacity={0.45} />
    </>,
);
const IconStackedArea = customIcon(
    <>
        <path d="M2 17v-6l3-3 3 2 4-4 4 3v8Z" opacity={0.35} />
        <path d="M2 17v-3l3-3 3 2 4-3.5 4 2.5v5Z" />
    </>,
);

// No donut glyph in Fluent — a ring cut from a disc via fill-rule, same
// technique Fluent's own DataPieRegular uses for its center cut-out.
const IconDonut = customIcon(
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 3.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Z"
    />,
);
// No ribbon-chart glyph — two flowing bands.
const IconRibbon = customIcon(
    <>
        <path
            d="M1 7c2-3 3 3 5 0s3-3 5 0 3 3 5 0v2.4c-2 3-3-3-5 0s-3 3-5 0-3-3-5 0Z"
            opacity={0.35}
        />
        <path d="M1 12c2-3 3 3 5 0s3-3 5 0 3 3 5 0v2.4c-2 3-3-3-5 0s-3 3-5 0-3-3-5 0Z" />
    </>,
);
// No choropleth glyph — a filled region with a few "shaded territory"
// cut-outs.
const IconFilledMap = customIcon(
    <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 2h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm3 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm7 1a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM6 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
    />,
);
// No shape-map glyph — a plain polygon, in keeping with the "shape" name.
const IconShapeMap = customIcon(<path d="M10 1.3 18 6v8l-8 4.7L2 14V6Z" />);

// No input-slicer glyph — an outlined field with a text dash and a cursor.
const IconInputSlicer = customIcon(
    <>
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.5 5A1.5 1.5 0 0 0 2 6.5v7A1.5 1.5 0 0 0 3.5 15h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 16.5 5h-13Zm-.5 1.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-7Z"
        />
        <rect x="5" y="9.2" width="5" height="1.6" rx="0.8" opacity={0.45} />
        <rect x="12.3" y="8.4" width="1.4" height="3.2" rx="0.5" />
    </>,
);

// Fluent has no R / Python logos — a simple language badge, since actual
// trademarked logos aren't ours to embed.
// Field type indicators (Data pane) — Fluent's own symbols for each data
// category, colored to match Power BI's real field icon colors (green # for
// numeric, purple calendar for date, orange "Aa" for text, blue toggle for
// boolean).
const IconFieldNumber = NumberSymbolRegular;
const IconFieldDate = CalendarLtrRegular;
const IconFieldText = TextCaseTitleRegular;
const IconFieldBoolean = ToggleLeftRegular;

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

/* ---------------------------- Fields pane ---------------------------- */

export function FieldsPane({ onCollapse }: { onCollapse?: () => void }) {
    const {
        addFilter,
        selected,
        toggleField,
        tables,
        measures,
        removeMeasure,
        updateMeasure,
    } = usePbi();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const [folderOpen, setFolderOpen] = useState<Record<string, boolean>>({});
    const [menuFor, setMenuFor] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<Field | null>(null);
    const [manageOpen, setManageOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [folderMenuFor, setFolderMenuFor] = useState<string | null>(null);
    const [createCategory, setCreateCategory] = useState<string | null>(null);
    const [renameTarget, setRenameTarget] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [confirmFolderDelete, setConfirmFolderDelete] = useState<
        string | null
    >(null);
    const skipRenameBlur = useRef(false);

    const custom = useMemo(() => measures ?? [], [measures]);
    const measureFields = useMemo(
        () => [
            ...MEASURES.filter((m) => !custom.some((c) => c.name === m.name)),
            ...custom,
        ],
        [custom],
    );

    const measureFolders = useMemo(() => {
        const map = new Map<string, Field[]>();
        for (const m of measureFields) {
            const key = m.category?.trim() || 'Other';
            const arr = map.get(key) ?? [];
            arr.push(m);
            map.set(key, arr);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [measureFields]);

    const del = async (name: string) => {
        const target = custom.find((m) => m.name === name);
        if (busy || !target || target.id == null) return;
        setBusy(true);
        try {
            await removeMeasure(target.id);
            toast.success(`Mesure « ${name} » supprimée`);
            setConfirmDelete(null);
            setMenuFor(null);
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : 'Échec de la suppression de la mesure',
            );
        } finally {
            setBusy(false);
        }
    };

    const customIn = (list: Field[]) => list.filter((m) => m.id != null);

    const renameFolder = async (oldName: string) => {
        if (skipRenameBlur.current) {
            skipRenameBlur.current = false;
            return;
        }
        const newName = renameValue.trim();
        setRenameTarget(null);
        setFolderMenuFor(null);
        if (!newName || newName === oldName) return;
        const target = customIn(
            measureFields.filter(
                (m) => (m.category?.trim() || 'Other') === oldName,
            ),
        );
        if (!target.length) {
            toast.error('Impossible de renommer ce dossier');
            return;
        }
        setBusy(true);
        try {
            await Promise.all(
                target.map((m) =>
                    updateMeasure(
                        m.id!,
                        m.name,
                        m.expression ?? '',
                        newName,
                        m.description ?? null,
                    ),
                ),
            );
            toast.success(`Dossier « ${oldName} » renommé en « ${newName} »`);
            setFolderOpen((o) => {
                const rest = { ...o };
                delete rest[oldName];
                return { ...rest, [newName]: o[oldName] ?? false };
            });
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : 'Échec du renommage du dossier',
            );
        } finally {
            setBusy(false);
        }
    };

    const deleteFolder = async (name: string) => {
        const target = customIn(
            measureFields.filter(
                (m) => (m.category?.trim() || 'Other') === name,
            ),
        );
        if (!target.length) return;
        setBusy(true);
        try {
            await Promise.all(
                target.map((m) =>
                    updateMeasure(
                        m.id!,
                        m.name,
                        m.expression ?? '',
                        null,
                        m.description ?? null,
                    ),
                ),
            );
            toast.success(`Dossier « ${name} » supprimé — mesures déplacées`);
            setFolderMenuFor(null);
            setConfirmFolderDelete(null);
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : 'Échec de la suppression du dossier',
            );
        } finally {
            setBusy(false);
        }
    };

    const measureChecked = (f: Field) =>
        !!selected &&
        [...selected.axis, ...selected.values, ...selected.legend].some(
            (x) => x.name === f.name && x.table === 'Measures',
        );

    const targetWell = (f: Field): WellName => {
        if (!selected) return 'values';
        if (isSingleValueType(selected.type)) return 'values';
        return defaultDropWell(selected.type) === 'axis'
            ? 'axis'
            : f.measure || f.type === 'number'
              ? 'values'
              : 'axis';
    };

    const toggleMeasure = (f: Field) => {
        if (!selected) return;
        toggleField(selected.id, targetWell(f), f.name, 'Measures');
    };

    const groups = tables.map((t) => ({ name: t.name, fields: t.fields }));

    return (
        <div className="flex h-full flex-col">
            <PaneHeader title="Données" onCollapse={onCollapse} />
            <div className="px-2 pb-2">
                <div className="flex items-center gap-1 rounded border border-border bg-background px-2">
                    <Search className="size-3 text-muted-foreground" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher"
                        className="w-full bg-transparent py-1 text-[11px] outline-none"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-auto px-1 pb-2">
                {measureFields.length > 0 && (
                    <div key="Measures">
                        <div className="flex items-center">
                            <button
                                onClick={() =>
                                    setOpen((o) => ({
                                        ...o,
                                        Measures: !o.Measures,
                                    }))
                                }
                                className="flex w-full items-center gap-1 rounded px-1 py-1 text-[12px] font-medium hover:bg-accent"
                            >
                                <ChevronRight
                                    className={cn(
                                        'size-3 transition-transform',
                                        open.Measures && 'rotate-90',
                                    )}
                                />
                                <Sigma className="size-3 text-muted-foreground" />
                                <span className="truncate">Mesures</span>
                            </button>
                            <button
                                onClick={() => setManageOpen(true)}
                                title="Gérer les mesures"
                                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"
                            >
                                <MoreHorizontal className="size-3.5" />
                            </button>
                        </div>
                        {open.Measures &&
                            measureFolders.map(([folder, list]) => {
                                const visible = list.filter((f) =>
                                    [f.name, folder, f.expression ?? ''].some(
                                        (value) =>
                                            value
                                                .toLowerCase()
                                                .includes(query.toLowerCase()),
                                    ),
                                );
                                if (!visible.length) return null;
                                const isOther = folder === 'Other';
                                const named = !isOther;
                                return (
                                    <div key={folder} className="relative">
                                        <div className="ml-4 flex items-center">
                                            {renameTarget === folder ? (
                                                <input
                                                    autoFocus
                                                    value={renameValue}
                                                    onChange={(e) =>
                                                        setRenameValue(
                                                            e.target.value,
                                                        )
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            e.currentTarget.blur();
                                                        } else if (
                                                            e.key === 'Escape'
                                                        ) {
                                                            skipRenameBlur.current = true;
                                                            setRenameTarget(
                                                                null,
                                                            );
                                                            setFolderMenuFor(
                                                                null,
                                                            );
                                                        }
                                                    }}
                                                    onBlur={() =>
                                                        renameFolder(folder)
                                                    }
                                                    className="min-w-0 flex-1 rounded border border-brand bg-background px-1 py-[1px] text-[11px] text-foreground outline-none"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        setFolderOpen((o) => ({
                                                            ...o,
                                                            [folder]:
                                                                !o[folder],
                                                        }))
                                                    }
                                                    className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-[2px] text-[11px] font-medium text-muted-foreground hover:bg-accent"
                                                >
                                                    <ChevronRight
                                                        className={cn(
                                                            'size-2.5 shrink-0 transition-transform',
                                                            folderOpen[
                                                                folder
                                                            ] && 'rotate-90',
                                                        )}
                                                    />
                                                    <Folder className="size-3 shrink-0 text-muted-foreground" />
                                                    <span className="truncate">
                                                        {folder}
                                                    </span>
                                                    <span className="ml-auto shrink-0 pr-1 text-[10px] text-muted-foreground/60">
                                                        {visible.length}
                                                    </span>
                                                </button>
                                            )}
                                            {named && (
                                                <button
                                                    onClick={() =>
                                                        setFolderMenuFor(
                                                            folderMenuFor ===
                                                                folder
                                                                ? null
                                                                : folder,
                                                        )
                                                    }
                                                    title="Actions du dossier"
                                                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent"
                                                >
                                                    <MoreHorizontal className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        {folderMenuFor === folder && (
                                            <div className="absolute top-0 right-5 z-20 w-48 rounded border border-border bg-card py-1 text-[11px] shadow-xl">
                                                {confirmFolderDelete ===
                                                folder ? (
                                                    <div className="px-2 py-1">
                                                        <p className="mb-1 text-muted-foreground">
                                                            Supprimer le dossier{' '}
                                                            <span className="font-mono">
                                                                {folder}
                                                            </span>{' '}
                                                            ? Les mesures seront
                                                            déplacées dans «
                                                            Sans catégorie ».
                                                        </p>
                                                        <div className="flex justify-end gap-1">
                                                            <button
                                                                onClick={() =>
                                                                    setConfirmFolderDelete(
                                                                        null,
                                                                    )
                                                                }
                                                                className="rounded border border-border px-2 py-0.5"
                                                            >
                                                                Non
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    deleteFolder(
                                                                        folder,
                                                                    )
                                                                }
                                                                disabled={busy}
                                                                className="rounded bg-red-600 px-2 py-0.5 text-white disabled:opacity-50"
                                                            >
                                                                Oui
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setFolderMenuFor(
                                                                    null,
                                                                );
                                                                setCreateCategory(
                                                                    folder,
                                                                );
                                                                setFolderOpen(
                                                                    (o) => ({
                                                                        ...o,
                                                                        [folder]: true,
                                                                    }),
                                                                );
                                                            }}
                                                            className="flex w-full items-center gap-2 px-2 py-1 hover:bg-accent"
                                                        >
                                                            <Plus className="size-3" />
                                                            Nouvelle mesure
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setRenameValue(
                                                                    folder,
                                                                );
                                                                setRenameTarget(
                                                                    folder,
                                                                );
                                                                setFolderMenuFor(
                                                                    null,
                                                                );
                                                            }}
                                                            className="flex w-full items-center gap-2 px-2 py-1 hover:bg-accent"
                                                        >
                                                            <Pencil className="size-3" />
                                                            Renommer
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setConfirmFolderDelete(
                                                                    folder,
                                                                )
                                                            }
                                                            className="flex w-full items-center gap-2 px-2 py-1 text-red-500 hover:bg-accent"
                                                        >
                                                            <Trash2 className="size-3" />
                                                            Supprimer
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {folderOpen[folder] &&
                                            visible.map((f) => {
                                                const error = measureError(
                                                    f.name,
                                                );
                                                return (
                                                    <div
                                                        key={f.name}
                                                        className="relative"
                                                    >
                                                        <div
                                                            draggable
                                                            onDragStart={(
                                                                e,
                                                            ) => {
                                                                e.dataTransfer.setData(
                                                                    'text/plain',
                                                                    JSON.stringify(
                                                                        {
                                                                            table: 'Measures',
                                                                            name: f.name,
                                                                            measure: true,
                                                                        },
                                                                    ),
                                                                );
                                                                e.dataTransfer.effectAllowed =
                                                                    e.ctrlKey
                                                                        ? 'copy'
                                                                        : 'move';
                                                            }}
                                                            title={
                                                                f.expression ??
                                                                `[${f.name}]`
                                                            }
                                                            className="ml-5 flex cursor-grab items-center gap-2 rounded px-2 py-[3px] text-[11px] hover:bg-accent active:cursor-grabbing"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={measureChecked(
                                                                    f,
                                                                )}
                                                                onChange={() =>
                                                                    toggleMeasure(
                                                                        f,
                                                                    )
                                                                }
                                                                className="size-3 accent-[var(--brand)]"
                                                            />
                                                            <Sigma className="size-3 text-muted-foreground" />
                                                            <span className="truncate">
                                                                {f.name}
                                                            </span>
                                                            {error && (
                                                                <span
                                                                    className="shrink-0 text-red-500"
                                                                    title={
                                                                        error
                                                                    }
                                                                >
                                                                    <TriangleAlert className="size-3" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                setMenuFor(
                                                                    menuFor ===
                                                                        f.name
                                                                        ? null
                                                                        : f.name,
                                                                )
                                                            }
                                                            title="Actions de la mesure"
                                                            className="absolute top-1 right-1 z-10 rounded p-0.5 text-muted-foreground hover:bg-accent"
                                                        >
                                                            <MoreHorizontal className="size-3.5" />
                                                        </button>
                                                        {menuFor === f.name && (
                                                            <div className="absolute top-0 right-6 z-20 w-40 rounded border border-border bg-card py-1 text-[11px] shadow-xl">
                                                                {confirmDelete ===
                                                                f.name ? (
                                                                    <div className="px-2 py-1">
                                                                        <p className="mb-1 text-muted-foreground">
                                                                            Supprimer{' '}
                                                                            <span className="font-mono">
                                                                                {
                                                                                    f.name
                                                                                }
                                                                            </span>{' '}
                                                                            ?
                                                                        </p>
                                                                        <div className="flex justify-end gap-1">
                                                                            <button
                                                                                onClick={() =>
                                                                                    setConfirmDelete(
                                                                                        null,
                                                                                    )
                                                                                }
                                                                                className="rounded border border-border px-2 py-0.5"
                                                                            >
                                                                                Non
                                                                            </button>
                                                                            <button
                                                                                onClick={() =>
                                                                                    del(
                                                                                        f.name,
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    busy
                                                                                }
                                                                                className="rounded bg-red-600 px-2 py-0.5 text-white disabled:opacity-50"
                                                                            >
                                                                                Oui
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditTarget(
                                                                                    f,
                                                                                );
                                                                                setMenuFor(
                                                                                    null,
                                                                                );
                                                                            }}
                                                                            className="flex w-full items-center gap-2 px-2 py-1 hover:bg-accent"
                                                                        >
                                                                            <Pencil className="size-3" />
                                                                            Modifier
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                setConfirmDelete(
                                                                                    f.name,
                                                                                )
                                                                            }
                                                                            className="flex w-full items-center gap-2 px-2 py-1 text-red-500 hover:bg-accent"
                                                                        >
                                                                            <Trash2 className="size-3" />
                                                                            Supprimer
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })}
                    </div>
                )}
                {groups.map((g) => {
                    const fields = g.fields.filter((f) =>
                        [f.name, g.name, `${g.name}.${f.name}`].some((value) =>
                            value.toLowerCase().includes(query.toLowerCase()),
                        ),
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
                                <Table2 className="size-3 text-muted-foreground" />
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
                                                JSON.stringify({
                                                    table: g.name,
                                                    name: f.name,
                                                    measure: !!f.measure,
                                                }),
                                            );
                                            // Ctrl+drag duplicates a field into another bucket
                                            e.dataTransfer.effectAllowed =
                                                e.ctrlKey ? 'copy' : 'move';
                                        }}
                                        onDoubleClick={() =>
                                            !f.measure &&
                                            addFilter(f.name, g.name)
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
                                                ].some(
                                                    (x) =>
                                                        x.name === f.name &&
                                                        x.table === g.name,
                                                )
                                            }
                                            onChange={() => {
                                                if (!selected) return;
                                                toggleField(
                                                    selected.id,
                                                    targetWell(f),
                                                    f.name,
                                                    g.name,
                                                );
                                            }}
                                            className="size-3 accent-[var(--brand)]"
                                        />
                                        {f.measure ? (
                                            <Sigma className="size-3 text-muted-foreground" />
                                        ) : f.type === 'number' ? (
                                            <IconFieldNumber className="size-3 text-green-600" />
                                        ) : f.type === 'date' ? (
                                            <IconFieldDate className="size-3 text-violet-600" />
                                        ) : f.type === 'boolean' ? (
                                            <IconFieldBoolean className="size-3 text-sky-500" />
                                        ) : (
                                            <IconFieldText className="size-3 text-orange-500" />
                                        )}
                                        <span className="truncate">
                                            {tables.some(
                                                (table) =>
                                                    table.name !== g.name &&
                                                    table.fields.some(
                                                        (field) =>
                                                            field.name ===
                                                            f.name,
                                                    ),
                                            )
                                                ? `${g.name}.${f.name}`
                                                : f.name}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    );
                })}
            </div>
            {manageOpen && (
                <ManageMeasuresDialog onClose={() => setManageOpen(false)} />
            )}
            {editTarget && (
                <DaxDialog
                    key={`edit-${editTarget.id ?? editTarget.name}`}
                    edit={editTarget}
                    onClose={() => setEditTarget(null)}
                />
            )}
            {createCategory !== null && (
                <DaxDialog
                    key={`new-${createCategory}`}
                    createCategory={createCategory}
                    onClose={() => setCreateCategory(null)}
                />
            )}
        </div>
    );
}

/* ------------------------ Visualizations pane ------------------------ */

const VISUAL_GROUPS: {
    group: string;
    items: { type: VisualType; label: string; Icon: IconComponent }[];
}[] = [
    {
        group: 'Comparaison',
        items: [
            {
                type: 'column',
                label: 'Histogramme groupé',
                Icon: DataBarVerticalRegular,
            },
            {
                type: 'stackedColumn',
                label: 'Histogramme empilé',
                Icon: IconStackedColumn,
            },
            {
                type: 'stacked100Column',
                label: 'Histogramme empilé 100 %',
                Icon: IconStacked100Column,
            },
            {
                type: 'bar',
                label: 'Barres groupées',
                Icon: DataBarHorizontalRegular,
            },
            {
                type: 'stackedBar',
                label: 'Barres empilées',
                Icon: IconStackedBar,
            },
            {
                type: 'stacked100Bar',
                label: 'Barres empilées 100 %',
                Icon: IconStacked100Bar,
            },
            { type: 'line', label: 'Courbe', Icon: DataLineRegular },
            { type: 'area', label: 'Aire', Icon: DataAreaRegular },
            {
                type: 'stackedArea',
                label: 'Aire empilée',
                Icon: IconStackedArea,
            },
            {
                type: 'combo',
                label: 'Courbe et histogramme empilé',
                Icon: ChartMultipleRegular,
            },
        ],
    },
    {
        group: 'Part du tout et distribution',
        items: [
            { type: 'pie', label: 'Secteurs', Icon: DataPieRegular },
            { type: 'donut', label: 'Anneau', Icon: IconDonut },
            {
                type: 'treemap',
                label: 'Treemap',
                Icon: DataTreemapRegular,
            },
            { type: 'funnel', label: 'Entonnoir', Icon: DataFunnelRegular },
            { type: 'ribbon', label: 'Ruban', Icon: IconRibbon },
            {
                type: 'waterfall',
                label: 'Cascade',
                Icon: DataWaterfallRegular,
            },
            {
                type: 'scatter',
                label: 'Nuage de points',
                Icon: DataScatterRegular,
            },
            {
                type: 'bubble',
                label: 'Nuage de points (bulles)',
                Icon: BubbleMultipleRegular,
            },
        ],
    },
    {
        group: 'Valeur unique et tabulaire',
        items: [
            { type: 'card', label: 'Carte', Icon: CardUiRegular },
            { type: 'gauge', label: 'Jauge', Icon: GaugeRegular },
            { type: 'table', label: 'Tableau', Icon: TableRegular },
            { type: 'matrix', label: 'Matrice', Icon: GridRegular },
        ],
    },
    {
        group: 'Cartes',
        items: [
            { type: 'map', label: 'Carte', Icon: MapRegular },
            {
                type: 'filledMap',
                label: 'Carte remplie',
                Icon: IconFilledMap,
            },
            {
                type: 'shapeMap',
                label: 'Carte de formes',
                Icon: IconShapeMap,
            },
        ],
    },
    {
        group: 'Segmenteurs',
        items: [
            {
                type: 'slicer',
                label: 'Segmenteur (cases à cocher)',
                Icon: CheckboxCheckedRegular,
            },
            {
                type: 'buttonSlicer',
                label: 'Segmenteur de boutons',
                Icon: ToggleLeftRegular,
            },
            {
                type: 'dropdownSlicer',
                label: 'Segmenteur déroulant',
                Icon: ChevronDownRegular,
            },
            {
                type: 'inputSlicer',
                label: 'Segmenteur de saisie',
                Icon: IconInputSlicer,
            },
            {
                type: 'dateSlicer',
                label: 'Segmenteur de dates',
                Icon: CalendarLtrRegular,
            },
        ],
    },
    {
        group: 'Éléments',
        items: [
            {
                type: 'text',
                label: 'Zone de texte',
                Icon: TextboxRegular,
            },
            { type: 'image', label: 'Image', Icon: ImageRegular },
            { type: 'button', label: 'Bouton', Icon: ButtonRegular },
        ],
    },
];

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
};

const VALUE_AGGREGATION_LABELS: Record<ValueAggregationMode, string> = {
    first: 'Premier',
    latest: 'Dernier',
    count: 'Nombre',
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

/** Number entry used by bound wells (gauge Min/Max/Target, card Target) when
 * no field is dropped; commits a finite number or `undefined` on blur/Enter. */
function BoundValueInput({
    value,
    placeholder,
    onCommit,
}: {
    value?: number;
    placeholder?: string;
    onCommit: (value: number | undefined) => void;
}) {
    const [text, setText] = useState(value === undefined ? '' : String(value));
    const [prevValue, setPrevValue] = useState(value);
    if (value !== prevValue) {
        setPrevValue(value);
        setText(value === undefined ? '' : String(value));
    }

    const commit = () => {
        const trimmed = text.trim();
        if (trimmed === '') {
            onCommit(undefined);
            return;
        }
        const n = Number(trimmed);
        if (Number.isFinite(n)) onCommit(n);
        else setText(value === undefined ? '' : String(value));
    };

    return (
        <input
            type="number"
            step="any"
            value={text}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-brand"
        />
    );
}

export function VisualizationsPane({
    onCollapse,
}: {
    onCollapse?: () => void;
}) {
    const {
        selected,
        addVisual,
        updateVisual,
        dropField,
        removeWellField,
        moveWellField,
        setWellAgg,
        setWellValueAgg,
        toggleAnalytics,
        page,
        pages,
        setPageFormat,
    } = usePbi();
    const [tab, setTab] = useState<'fields' | 'format' | 'analytics'>('fields');
    const [listOpen, setListOpen] = useState(true);
    const [dragOverWell, setDragOverWell] = useState<WellName | null>(null);

    const config = selected ? visualConfig(selected.type) : null;
    // Text/image elements are format-only: no field wells, no analytics.
    const tabs: ('fields' | 'format' | 'analytics')[] = config
        ? [
              ...(config.build.length ? (['fields'] as const) : []),
              'format',
              ...(config.showAnalytics ? (['analytics'] as const) : []),
          ]
        : ['fields', 'format', 'analytics'];
    const activeTab = tabs.includes(tab) ? tab : tabs[0];

    const well = (name: WellName, label: string) => (
        <div className="mb-3">
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                {label}
            </div>
            {(() => {
                const boundInput =
                    (selected?.type === 'gauge' &&
                        (name === 'minimum' ||
                            name === 'maximum' ||
                            name === 'target')) ||
                    (selected?.type === 'card' && name === 'target')
                        ? (
                              {
                                  minimum: {
                                      key: 'minimumValue',
                                      value: selected.minimumValue,
                                  },
                                  maximum: {
                                      key: 'maximumValue',
                                      value: selected.maximumValue,
                                  },
                                  target: {
                                      key: 'targetValue',
                                      value: selected.targetValue,
                                  },
                              } as const
                          )[name]
                        : null;
                return (
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                        }}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            setDragOverWell(name);
                        }}
                        onDragLeave={(e) => {
                            if (
                                e.currentTarget.contains(
                                    e.relatedTarget as Node,
                                )
                            )
                                return;
                            setDragOverWell(null);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOverWell(null);
                            if (!selected) return;
                            const raw = e.dataTransfer.getData('text/plain');
                            try {
                                const payload = JSON.parse(raw);
                                if (
                                    payload?.fromWell &&
                                    payload.fromWell !== name
                                ) {
                                    moveWellField(
                                        selected.id,
                                        payload.fromWell as WellName,
                                        payload.fromIndex as number,
                                        name,
                                    );
                                    return;
                                }
                                if (payload?.name)
                                    dropField(
                                        selected.id,
                                        name,
                                        payload.name,
                                        payload.table,
                                    );
                            } catch {
                                dropField(selected.id, name, raw);
                            }
                        }}
                        className={cn(
                            'min-h-9 rounded border border-dashed border-border bg-background p-1 transition-colors',
                            dragOverWell === name &&
                                'border-brand bg-brand/5 ring-1 ring-brand',
                        )}
                    >
                        {selected?.[name].length ? (
                            selected[name].map((f, i) => {
                                const issue =
                                    name === 'values' &&
                                    config?.format !== 'singleValue'
                                        ? (fieldNumericIssue(f) ??
                                          fieldIssue(f))
                                        : fieldIssue(f);
                                const numericField =
                                    [
                                        'values',
                                        'minimum',
                                        'maximum',
                                        'target',
                                    ].includes(name) &&
                                    fieldType(f.name, f.table) === 'number' &&
                                    !isMeasure(f.name);
                                return (
                                    <div
                                        key={`${f.name}-${i}`}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData(
                                                'text/plain',
                                                JSON.stringify({
                                                    table: f.table,
                                                    name: f.name,
                                                    measure: isMeasure(f.name),
                                                    fromWell: name,
                                                    fromIndex: i,
                                                }),
                                            );
                                            e.dataTransfer.effectAllowed =
                                                'move';
                                        }}
                                        className="mb-1 flex cursor-grab items-center gap-1 rounded bg-muted px-2 py-1 text-[11px] active:cursor-grabbing"
                                    >
                                        {issue && (
                                            <TriangleAlert
                                                className="size-3 shrink-0 text-warning"
                                                aria-label={issue}
                                            />
                                        )}
                                        <span className="flex-1 truncate">
                                            {numericField
                                                ? measureLabel(f)
                                                : fieldLabel(f)}
                                        </span>
                                        {numericField && (
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
                                                        {AGG_LABELS[a]}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        {SINGLE_VALUE_WELLS.has(name) &&
                                            !numericField &&
                                            !isMeasure(f.name) && (
                                                <select
                                                    value={
                                                        f.valueAggregation ??
                                                        'first'
                                                    }
                                                    onChange={(e) =>
                                                        setWellValueAgg(
                                                            selected.id,
                                                            name,
                                                            i,
                                                            e.target
                                                                .value as ValueAggregationMode,
                                                        )
                                                    }
                                                    className="rounded border border-border bg-background text-[10px]"
                                                >
                                                    {VALUE_AGGREGATION_MODES.map(
                                                        (m) => (
                                                            <option
                                                                key={m}
                                                                value={m}
                                                            >
                                                                {
                                                                    VALUE_AGGREGATION_LABELS[
                                                                        m
                                                                    ]
                                                                }
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            )}
                                        {issue && (
                                            <span className="max-w-44 truncate rounded border border-warning/40 bg-warning/10 px-1 py-0.5 text-[9px] text-warning">
                                                {issue}
                                            </span>
                                        )}
                                        <button
                                            onClick={() =>
                                                removeWellField(
                                                    selected.id,
                                                    name,
                                                    i,
                                                )
                                            }
                                        >
                                            <X className="size-3 text-muted-foreground hover:text-destructive" />
                                        </button>
                                    </div>
                                );
                            })
                        ) : boundInput ? (
                            <BoundValueInput
                                value={boundInput.value}
                                placeholder="Saisir une valeur"
                                onCommit={(v) => {
                                    if (selected)
                                        updateVisual(selected.id, {
                                            [boundInput.key]: v,
                                        });
                                }}
                            />
                        ) : (
                            <div className="px-1 py-1 text-[11px] text-muted-foreground">
                                Ajouter des champs de données ici
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );

    return (
        <div className="flex h-full flex-col">
            <PaneHeader title="Visualisations" onCollapse={onCollapse} />
            <button
                onClick={() => setListOpen((o) => !o)}
                className="flex w-full items-center justify-between border-b border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase hover:bg-accent"
            >
                <span>Types de visuels</span>
                <ChevronDown
                    className={cn(
                        'size-3 transition-transform',
                        listOpen && 'rotate-180',
                    )}
                />
            </button>
            {listOpen && (
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
                                            'flex h-7 items-center justify-center rounded border border-border text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground',
                                            selected?.type === v.type &&
                                                'border-brand bg-brand/15 text-brand',
                                        )}
                                    >
                                        <v.Icon className="size-3.5" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!selected ? (
                <div className="flex-1 overflow-auto p-3 text-[11px]">
                    <div className="mb-2 font-semibold">
                        Format de la page — {page.name}
                    </div>
                    <label className="mb-2 block">
                        <span className="mb-1 block text-muted-foreground">
                            Taille de la zone de dessin
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
                                Largeur (px)
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
                                Hauteur (px)
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
                    <ColorInput
                        label="Arrière-plan de la page"
                        value={page.format.background}
                        onChange={(v) =>
                            setPageFormat(page.id, {
                                background: v,
                            })
                        }
                    />
                    <label className="mb-2 flex items-center justify-between">
                        <span>Utiliser comme page d’info-bulle</span>
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
                        <span>Masquer la page</span>
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
                        Sélectionnez un visuel sur la zone de dessin pour
                        modifier ses champs, son formatage et ses analyses.
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex border-b border-border text-[11px]">
                        {tabs.map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={cn(
                                    'flex-1 py-1.5 capitalize',
                                    activeTab === t
                                        ? 'border-b-2 border-brand font-semibold'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {t === 'fields'
                                    ? 'Créer le visuel'
                                    : t === 'format'
                                      ? 'Formatage'
                                      : 'Analyses'}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                        {activeTab === 'fields' && config && (
                            <>
                                {config.build.map(
                                    ({ well: wellName, label }) => (
                                        <Fragment key={wellName}>
                                            {well(
                                                wellName,
                                                wellName === 'axis' &&
                                                    selected.type
                                                        .toLowerCase()
                                                        .includes('slicer')
                                                    ? 'Champ'
                                                    : label,
                                            )}
                                        </Fragment>
                                    ),
                                )}
                                {config.build.some(
                                    (w) => w.well === 'tooltips',
                                ) && (
                                    <label className="block text-[11px]">
                                        <span className="mb-1 block text-muted-foreground">
                                            Page d’info-bulle
                                        </span>
                                        <select
                                            value={selected.tooltipPageId ?? ''}
                                            onChange={(e) =>
                                                updateVisual(selected.id, {
                                                    tooltipPageId:
                                                        e.target.value ||
                                                        undefined,
                                                })
                                            }
                                            className="w-full rounded border border-border bg-background px-2 py-1"
                                        >
                                            <option value="">Par défaut</option>
                                            {pages.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                            </>
                        )}

                        {activeTab === 'format' &&
                            (config?.format === 'singleValue' ? (
                                <SingleValueFormat visual={selected} />
                            ) : config?.format === 'cartesian' ? (
                                <CartesianFormat visual={selected} />
                            ) : config?.format === 'gauge' ? (
                                <GaugeFormat visual={selected} />
                            ) : config?.format === 'element' ? (
                                <TextImageFormat visual={selected} />
                            ) : (
                                <GenericFormat visual={selected} />
                            ))}

                        {activeTab === 'analytics' && config?.showAnalytics && (
                            <div className="space-y-2 text-[11px]">
                                {config.analyticsKinds.map((k) => (
                                    <label
                                        key={k}
                                        className="flex items-center justify-between capitalize"
                                    >
                                        <span>{k} ligne</span>
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
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/** Shared "General" block for text/image elements: background, border (color,
 * width, radius), shadow and position/size. No chart-only options. */
function ElementGeneral({ visual }: { visual: Visual }) {
    const { updateVisual } = usePbi();
    return (
        <Section title="Général" defaultOpen>
            <ColorInput
                label="Arrière-plan"
                value={visual.background}
                onChange={(v) => updateVisual(visual.id, { background: v })}
            />
            <Toggle
                label="Bordure"
                checked={visual.border}
                onChange={(v) => updateVisual(visual.id, { border: v })}
            />
            {visual.border && (
                <div className="grid grid-cols-3 gap-2">
                    <ColorInput
                        label="Couleur"
                        value={visual.borderColor}
                        onChange={(v) =>
                            updateVisual(visual.id, { borderColor: v })
                        }
                    />
                    <NumberInput
                        label="Largeur"
                        min={1}
                        max={8}
                        value={visual.borderWidth ?? 1}
                        onChange={(v) =>
                            updateVisual(visual.id, { borderWidth: v })
                        }
                    />
                    <NumberInput
                        label="Rayon"
                        min={0}
                        max={24}
                        value={visual.radius ?? 0}
                        onChange={(v) => updateVisual(visual.id, { radius: v })}
                    />
                </div>
            )}
            <Toggle
                label="Ombre"
                checked={visual.shadow}
                onChange={(v) => updateVisual(visual.id, { shadow: v })}
            />
            <div className="grid grid-cols-2 gap-2">
                {(['x', 'y', 'w', 'h'] as const).map((k) => (
                    <NumberInput
                        key={k}
                        label={
                            k === 'w'
                                ? 'Largeur'
                                : k === 'h'
                                  ? 'Hauteur'
                                  : `${k.toUpperCase()} px`
                        }
                        value={visual[k]}
                        onChange={(v) => updateVisual(visual.id, { [k]: v })}
                    />
                ))}
            </div>
        </Section>
    );
}

/** The Format pane for text boxes and images: content + look only. */
function TextImageFormat({ visual }: { visual: Visual }) {
    const { updateVisual } = usePbi();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { pageId } = usePage().props as unknown as { pageId: number };

    const uploadImage = async (file: File) => {
        try {
            const url = await uploadPageImage(pageId, file);
            updateVisual(visual.id, { imageUrl: url });
            toast.success('Image téléversée');
        } catch {
            toast.error("Échec du téléversement de l'image");
        }
    };

    return (
        <div className="space-y-3 text-[11px]">
            {visual.type === 'text' && (
                <>
                    <Section title="Texte" defaultOpen>
                        <label className="block">
                            <span className="mb-1 block text-muted-foreground">
                                Content
                            </span>
                            <textarea
                                value={visual.text ?? ''}
                                onChange={(e) =>
                                    updateVisual(visual.id, {
                                        text: e.target.value,
                                    })
                                }
                                className="h-20 w-full rounded border border-border bg-background px-2 py-1"
                            />
                        </label>
                    </Section>
                    <Section title="Font" defaultOpen>
                        <Select
                            label="Font family"
                            value={visual.fontFamily ?? ''}
                            options={FONT_OPTIONS}
                            onChange={(v) =>
                                updateVisual(visual.id, {
                                    fontFamily: v || undefined,
                                })
                            }
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <NumberInput
                                label="Size"
                                min={8}
                                max={48}
                                value={visual.fontSize ?? 14}
                                onChange={(v) =>
                                    updateVisual(visual.id, {
                                        fontSize: v,
                                    })
                                }
                            />
                            <ColorInput
                                label="Color"
                                value={visual.fontColor}
                                onChange={(v) =>
                                    updateVisual(visual.id, { fontColor: v })
                                }
                            />
                        </div>
                        <Biu
                            label="Font style"
                            bold={visual.fontBold}
                            italic={visual.fontItalic}
                            underline={visual.fontUnderline}
                            onChange={(p) =>
                                updateVisual(visual.id, {
                                    fontBold: p.bold,
                                    fontItalic: p.italic,
                                    fontUnderline: p.underline,
                                })
                            }
                        />
                        <Select
                            label="Horizontal alignment"
                            value={visual.textAlign ?? 'left'}
                            options={ALIGNS}
                            onChange={(v) =>
                                updateVisual(visual.id, {
                                    textAlign:
                                        v === 'left' ||
                                        v === 'center' ||
                                        v === 'right'
                                            ? v
                                            : undefined,
                                })
                            }
                        />
                    </Section>
                </>
            )}
            {visual.type === 'image' && (
                <Section title="Image" defaultOpen>
                    <TextInput
                        label="Image URL"
                        value={visual.imageUrl ?? ''}
                        onChange={(v) =>
                            updateVisual(visual.id, { imageUrl: v })
                        }
                    />
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Upload image
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadImage(file);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground hover:bg-accent"
                        >
                            <Upload className="size-3.5" />
                            Choose file…
                        </button>
                    </label>
                    {visual.imageUrl && (
                        <div className="flex items-center justify-center rounded border border-border bg-background p-1">
                            <img
                                src={visual.imageUrl}
                                alt="Preview"
                                className="max-h-24 object-contain"
                            />
                        </div>
                    )}
                    <TextInput
                        label="Alt text (accessibility)"
                        value={visual.altText ?? ''}
                        onChange={(v) =>
                            updateVisual(visual.id, { altText: v })
                        }
                    />
                </Section>
            )}
            <ElementGeneral visual={visual} />
        </div>
    );
}

function GenericFormat({ visual }: { visual: Visual }) {
    const selected = visual;
    const { updateVisual } = usePbi();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { pageId } = usePage().props as unknown as { pageId: number };

    const uploadImage = async (file: File) => {
        try {
            const url = await uploadPageImage(pageId, file);
            updateVisual(selected.id, { imageUrl: url });
            toast.success('Image téléversée');
        } catch {
            toast.error("Échec du téléversement de l'image");
        }
    };

    return (
        <div className="space-y-3 text-[11px]">
            <TitleSection
                visual={selected}
                onPatch={(p) => updateVisual(selected.id, p)}
            />
            {CONDITIONAL_FORMAT_TYPES.has(selected.type) && (
                <ConditionalFormatControl visual={selected} />
            )}
            {(selected.type === 'text' || selected.type === 'button') && (
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
                <>
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
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Upload image
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadImage(file);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground hover:bg-accent"
                        >
                            <Upload className="size-3.5" />
                            Choose file…
                        </button>
                    </label>
                    {selected.imageUrl && (
                        <div className="flex items-center justify-center rounded border border-border bg-background p-1">
                            <img
                                src={selected.imageUrl}
                                alt="Preview"
                                className="max-h-24 object-contain"
                            />
                        </div>
                    )}
                </>
            )}
            {selected.type === 'shape' && (
                <>
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Shape
                        </span>
                        <select
                            value={selected.shape ?? 'rectangle'}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    shape: e.target.value as ShapeKind,
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        >
                            {SHAPE_KINDS.map((k) => (
                                <option key={k} value={k}>
                                    {SHAPES[k].label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <ColorInput
                        label="Outline color"
                        value={selected.background}
                        onChange={(v) =>
                            updateVisual(selected.id, {
                                background: v,
                            })
                        }
                    />
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Rotation (deg)
                        </span>
                        <input
                            type="number"
                            min={-180}
                            max={180}
                            value={selected.rotation ?? 0}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    rotation: Number(e.target.value),
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                    {selected.shape !== 'line' && (
                        <label className="block">
                            <span className="mb-1 block text-muted-foreground">
                                Corner radius
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={40}
                                value={selected.radius ?? 0}
                                onChange={(e) =>
                                    updateVisual(selected.id, {
                                        radius: Number(e.target.value),
                                    })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1"
                            />
                        </label>
                    )}
                </>
            )}
            {(
                [
                    ['showLegend', 'Show legend'],
                    ['showLabels', 'Data labels'],
                    ['border', 'Border'],
                    ['shadow', 'Shadow'],
                    ['subtotals', 'Totals / subtotals'],
                ] as const
            )
                .filter(
                    ([key]) =>
                        selected.type !== 'shape' ||
                        key === 'border' ||
                        key === 'shadow',
                )
                .map(([key, label]) => (
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
            {selected.type !== 'shape' && (
                <ColorInput
                    label="Background"
                    value={selected.background}
                    onChange={(v) =>
                        updateVisual(selected.id, {
                            background: v,
                        })
                    }
                />
            )}
            {selected.type !== 'shape' && (
                <>
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Font
                        </span>
                        <select
                            value={selected.fontFamily ?? ''}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    fontFamily: e.target.value || undefined,
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        >
                            <option value="">Report font</option>
                            <option value="ui-sans-serif, system-ui, sans-serif">
                                Sans-serif
                            </option>
                            <option value="Georgia, 'Times New Roman', serif">
                                Serif
                            </option>
                            <option value="ui-monospace, monospace">
                                Monospace
                            </option>
                        </select>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <label className="block">
                                <span className="mb-1 block text-muted-foreground">
                                    Size
                                </span>
                                <input
                                    type="number"
                                    min={8}
                                    max={24}
                                    value={selected.fontSize ?? 10}
                                    onChange={(e) =>
                                        updateVisual(selected.id, {
                                            fontSize: Number(e.target.value),
                                        })
                                    }
                                    className="w-full rounded border border-border bg-background px-2 py-1"
                                />
                            </label>
                            <ColorInput
                                label="Color"
                                value={selected.fontColor}
                                onChange={(v) =>
                                    updateVisual(selected.id, {
                                        fontColor: v,
                                    })
                                }
                            />
                        </div>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Number format
                        </span>
                        <select
                            value={selected.numberFormat ?? 'auto'}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    numberFormat:
                                        (e.target.value as NumberFormat) ||
                                        undefined,
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        >
                            {NUMBER_FORMATS.map((f) => (
                                <option key={f} value={f}>
                                    {f}
                                </option>
                            ))}
                        </select>
                    </label>
                </>
            )}
            {selected.border && (
                <div className="grid grid-cols-3 gap-2">
                    <ColorInput
                        label="Border"
                        value={selected.borderColor}
                        onChange={(v) =>
                            updateVisual(selected.id, {
                                borderColor: v,
                            })
                        }
                    />
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Width
                        </span>
                        <input
                            type="number"
                            min={1}
                            max={8}
                            value={selected.borderWidth ?? 1}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    borderWidth: Number(e.target.value),
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                    {selected.type !== 'shape' && (
                        <label className="block">
                            <span className="mb-1 block text-muted-foreground">
                                Radius
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={24}
                                value={selected.radius ?? 0}
                                onChange={(e) =>
                                    updateVisual(selected.id, {
                                        radius: Number(e.target.value),
                                    })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1"
                            />
                        </label>
                    )}
                </div>
            )}
            <label className="block">
                <span className="mb-1 block text-muted-foreground">
                    Data colors (palette offset)
                </span>
                <input
                    type="range"
                    min={0}
                    max={7}
                    value={selected.colorIndex ?? 0}
                    onChange={(e) =>
                        updateVisual(selected.id, {
                            colorIndex: Number(e.target.value),
                        })
                    }
                    className="w-full accent-[var(--brand)]"
                />
                p
            </label>
            <label className="block">
                <span className="mb-1 block text-muted-foreground">
                    Alt text (accessibility)
                </span>
                <input
                    value={selected.altText ?? ''}
                    onChange={(e) =>
                        updateVisual(selected.id, {
                            altText: e.target.value,
                        })
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1"
                />
            </label>
            {![
                'card',
                'table',
                'matrix',
                'scatter',
                'bubble',
                'text',
                'image',
                'button',
                'shape',
            ].includes(selected.type) && (
                <label className="block">
                    <span className="mb-1 block text-muted-foreground">
                        Max categories (extra rolled into "Other")
                    </span>
                    <input
                        type="number"
                        min={2}
                        value={selected.maxCategories}
                        onChange={(e) =>
                            updateVisual(selected.id, {
                                maxCategories: Number(e.target.value),
                            })
                        }
                        className="w-full rounded border border-border bg-background px-2 py-1"
                    />
                </label>
            )}
            <div className="grid grid-cols-2 gap-2">
                {(['x', 'y', 'w', 'h'] as const).map((k) => (
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
                                updateVisual(selected.id, {
                                    [k]: Number(e.target.value),
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------ Themes pane ------------------------------ */

export function ThemesPane({ onCollapse }: { onCollapse?: () => void }) {
    const {
        theme,
        customThemes,
        setTheme,
        saveTheme,
        updateTheme,
        removeTheme,
        togglePane,
    } = usePbi();
    const [name, setName] = useState('');
    const active = customThemes.find((t) => t.id === theme) ?? themeById(theme);

    const allThemes: ReportTheme[] = [
        ...THEMES,
        ...customThemes.filter((t) => !THEMES.some((b) => b.id === t.id)),
    ];

    const paletteEditor = (t: ReportTheme, onChange: (p: string[]) => void) => (
        <div className="grid grid-cols-8 gap-1">
            {t.palette.slice(0, THEME_COLOR_COUNT).map((c, i) => (
                <ColorInput
                    key={i}
                    value={c}
                    onChange={(v) => {
                        const next = [...t.palette];
                        next[i] = v;
                        onChange(next);
                    }}
                    className="h-5 w-full"
                    ariaLabel={`Couleur ${i + 1} de ${t.name}`}
                />
            ))}
        </div>
    );

    const paletteSwatch = (t: ReportTheme) => (
        <div className="grid grid-cols-8 gap-1">
            {t.palette.slice(0, THEME_COLOR_COUNT).map((c, i) => (
                <span
                    key={i}
                    className="h-5 rounded border border-border"
                    style={{ backgroundColor: resolveColor(c) }}
                />
            ))}
        </div>
    );

    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Thèmes"
                right={
                    <button
                        onClick={() => togglePane('themes')}
                        aria-label="Fermer le volet des thèmes"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
                onCollapse={onCollapse}
            />
            <div className="flex-1 space-y-3 overflow-auto px-3 pb-3 text-[11px]">
                <div className="text-muted-foreground">
                    Les couleurs s’appliquent instantanément à chaque visuel.
                </div>
                {allThemes.map((t) => {
                    const isActive = active?.id === t.id;
                    const isCustom = customThemes.some((c) => c.id === t.id);
                    return (
                        <div
                            key={t.id}
                            className="rounded border border-border p-2"
                        >
                            <button
                                onClick={() => setTheme(t.id)}
                                className="flex w-full items-center justify-between"
                            >
                                <span className="font-medium">{t.name}</span>
                                <span
                                    className={
                                        isActive
                                            ? 'text-[var(--brand)]'
                                            : 'text-muted-foreground'
                                    }
                                >
                                    {isActive ? 'Active' : 'Appliquer'}
                                </span>
                            </button>
                            <div className="mt-2">
                                {isCustom
                                    ? paletteEditor(t, (p) =>
                                          updateTheme(t.id, { palette: p }),
                                      )
                                    : paletteSwatch(t)}
                            </div>
                            {isCustom && (
                                <button
                                    onClick={() => removeTheme(t.id)}
                                    className="mt-2 flex items-center gap-1 text-destructive"
                                >
                                    <Trash2 className="size-3" /> Supprimer
                                </button>
                            )}
                        </div>
                    );
                })}
                <div className="rounded border border-border p-2">
                    <div className="mb-1 font-medium">
                        Enregistrer le thème actuel
                    </div>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nom du thème"
                        className="w-full rounded border border-border bg-background px-2 py-1"
                    />
                    <button
                        onClick={() => {
                            if (!isValidPalette(active.palette)) return;
                            saveTheme(name, active.palette, active.fontFamily);
                            setName('');
                        }}
                        disabled={
                            !name.trim() || !isValidPalette(active.palette)
                        }
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded bg-[var(--brand)] py-1 text-background disabled:opacity-50"
                    >
                        <Plus className="size-3" /> Enregistrer le thème
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------------------------- Filters pane ---------------------------- */

export function FiltersPane({ onCollapse }: { onCollapse?: () => void }) {
    const {
        filters,
        addFilter,
        toggleFilterValue,
        setFilterValues,
        removeFilter,
        setFilterScope,
        setFilterType,
        setFilterQuery,
        setFilterRange,
        setFilterRelative,
        setFilterTopN,
        tables,
        tableRows,
        measures,
    } = usePbi();
    const columns = tables.flatMap((t) =>
        t.fields
            .filter((f) => f.type !== 'number' && f.type !== 'boolean')
            .map((f) => ({ name: f.name, table: t.name })),
    );
    const numericColumns = useMemo(
        () => [
            ...tables.flatMap((t) =>
                t.fields
                    .filter((f) => f.type === 'number')
                    .map((f) => ({ name: f.name, table: t.name })),
            ),
            ...(measures ?? []).map((m) => ({ name: m.name, table: m.table })),
        ],
        [tables, measures],
    );

    const [dragOver, setDragOver] = useState(false);

    const rowsFor = (f: (typeof filters)[number]) =>
        (f.table && tableRows[f.table]) || [];

    const filterTypes: { value: FilterType; label: string }[] = [
        { value: 'list', label: 'Liste' },
        { value: 'dropdown', label: 'Liste déroulante' },
        { value: 'search', label: 'Recherche' },
        { value: 'dateRange', label: 'Période' },
        { value: 'relativeDate', label: 'Période relative' },
        { value: 'topN', label: 'N premiers' },
    ];

    const relativePresets: { value: RelativePreset; label: string }[] = [
        { value: 'today', label: "Aujourd'hui" },
        { value: 'yesterday', label: 'Hier' },
        { value: 'last7days', label: '7 derniers jours' },
        { value: 'last30days', label: '30 derniers jours' },
        { value: 'last90days', label: '90 derniers jours' },
        { value: 'thisMonth', label: 'Ce mois-ci' },
        { value: 'lastMonth', label: 'Le mois dernier' },
        { value: 'thisYear', label: 'Cette année' },
        { value: 'lastYear', label: "L'année dernière" },
        { value: 'ytd', label: 'Depuis le début de l’année' },
    ];

    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Filtres"
                right={<Filter className="size-3 text-muted-foreground" />}
                onCollapse={onCollapse}
            />
            <div className="px-3 pb-2">
                <select
                    value=""
                    onChange={(e) => {
                        const [table, name] = e.target.value.split('::');
                        if (name) addFilter(name, table);
                    }}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                >
                    <option value="">Ajouter un champ de filtre…</option>
                    {columns.map((c) => (
                        <option
                            key={`${c.table}::${c.name}`}
                            value={`${c.table}::${c.name}`}
                        >
                            {c.name} ({c.table})
                        </option>
                    ))}
                </select>
            </div>
            <div
                className={cn(
                    'flex-1 space-y-2 overflow-auto px-3 pb-3',
                    dragOver && 'bg-brand/5 ring-2 ring-brand ring-inset',
                )}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
                }}
                onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node))
                        return;
                    setDragOver(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const raw = e.dataTransfer.getData('text/plain');
                    try {
                        const payload = JSON.parse(raw);
                        if (payload?.name && !payload.measure)
                            addFilter(payload.name, payload.table);
                    } catch {
                        // ignore non-field drops
                    }
                }}
            >
                {!filters.length && (
                    <p className="text-[11px] text-muted-foreground">
                        Filtres sur toutes les pages. Glissez un champ ici ou
                        double-cliquez sur un champ du volet Données pour
                        l’ajouter.
                    </p>
                )}
                {filters.map((f) => (
                    <div
                        key={`${f.table ?? ''}::${f.column}`}
                        className="rounded border border-border bg-background p-2"
                    >
                        <div className="mb-1 flex items-center justify-between text-[11px] font-medium">
                            <span>
                                {f.column}
                                <span className="text-muted-foreground">
                                    {' '}
                                    {f.type === 'search' && f.query
                                        ? `“${f.query}”`
                                        : f.type === 'topN'
                                          ? `N premiers : ${f.topN}`
                                          : f.type === 'relativeDate'
                                            ? (relativePresets.find(
                                                  (p) => p.value === f.relative,
                                              )?.label ?? 'Période relative')
                                            : f.type === 'dateRange'
                                              ? `${f.from ?? '…'} → ${f.to ?? '…'}`
                                              : f.values.length
                                                ? f.values.join(', ')
                                                : '(Tous)'}
                                </span>
                            </span>
                            <button
                                onClick={() => removeFilter(f.column, f.table)}
                            >
                                <X className="size-3 text-muted-foreground hover:text-destructive" />
                            </button>
                        </div>
                        <select
                            aria-label={`Type de filtre pour ${f.column}`}
                            value={f.type}
                            onChange={(e) =>
                                setFilterType(
                                    f.column,
                                    f.table,
                                    e.target.value as FilterType,
                                )
                            }
                            className="mb-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                        >
                            {filterTypes.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label={`Portée du filtre pour ${f.column}`}
                            value={f.scope}
                            onChange={(e) =>
                                setFilterScope(
                                    f.column,
                                    f.table,
                                    e.target.value as 'page' | 'report',
                                )
                            }
                            className="mb-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                        >
                            <option value="report">Toutes les pages</option>
                            <option value="page">Page actuelle</option>
                        </select>

                        {f.type === 'search' && (
                            <input
                                type="text"
                                value={f.query ?? ''}
                                onChange={(e) =>
                                    setFilterQuery(
                                        f.column,
                                        f.table,
                                        e.target.value,
                                    )
                                }
                                placeholder={`Rechercher ${f.column}…`}
                                className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                            />
                        )}

                        {f.type === 'dateRange' && (
                            <div className="flex items-center gap-1 text-[10px]">
                                <input
                                    type="date"
                                    value={f.from ?? ''}
                                    onChange={(e) =>
                                        setFilterRange(
                                            f.column,
                                            f.table,
                                            e.target.value || undefined,
                                            f.to,
                                        )
                                    }
                                    className="w-full rounded border border-border bg-background px-1 py-0.5"
                                />
                                <span className="text-muted-foreground">→</span>
                                <input
                                    type="date"
                                    value={f.to ?? ''}
                                    onChange={(e) =>
                                        setFilterRange(
                                            f.column,
                                            f.table,
                                            f.from,
                                            e.target.value || undefined,
                                        )
                                    }
                                    className="w-full rounded border border-border bg-background px-1 py-0.5"
                                />
                            </div>
                        )}

                        {f.type === 'relativeDate' && (
                            <>
                                <select
                                    value={f.relative ?? 'last7days'}
                                    onChange={(e) =>
                                        setFilterRelative(
                                            f.column,
                                            f.table,
                                            e.target.value as RelativePreset,
                                        )
                                    }
                                    className="mb-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                                >
                                    {relativePresets.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-muted-foreground">
                                    {(() => {
                                        const r = relativeDateRange(
                                            f.relative ?? 'last7days',
                                        );
                                        return `${r.from} → ${r.to}`;
                                    })()}
                                </p>
                            </>
                        )}

                        {f.type === 'topN' && (
                            <div className="flex items-center gap-1 text-[10px]">
                                <input
                                    type="number"
                                    min={1}
                                    value={f.topN ?? 10}
                                    onChange={(e) => {
                                        const n = Math.max(
                                            1,
                                            Number(e.target.value) || 10,
                                        );
                                        setFilterTopN(
                                            f.column,
                                            f.table,
                                            n,
                                            f.topNBy ?? {
                                                name:
                                                    numericColumns[0]?.name ??
                                                    '',
                                                agg: 'sum',
                                                table: numericColumns[0]?.table,
                                            },
                                        );
                                    }}
                                    className="w-14 rounded border border-border bg-background px-1 py-0.5"
                                />
                                <select
                                    aria-label={`Mesure pour le N premiers de ${f.column}`}
                                    value={f.topNBy?.name ?? ''}
                                    onChange={(e) =>
                                        setFilterTopN(
                                            f.column,
                                            f.table,
                                            f.topN ?? 10,
                                            {
                                                name: e.target.value,
                                                agg: 'sum',
                                                table: numericColumns.find(
                                                    (c) =>
                                                        c.name ===
                                                        e.target.value,
                                                )?.table,
                                            },
                                        )
                                    }
                                    className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-0.5"
                                >
                                    {numericColumns.map((c) => (
                                        <option key={c.name} value={c.name}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(f.type === 'list' || f.type === 'dropdown') && (
                            <div className="max-h-36 overflow-auto">
                                {f.type === 'dropdown' && (
                                    <select
                                        aria-label={`Valeur de la liste déroulante pour ${f.column}`}
                                        value={
                                            f.values.length
                                                ? f.values[0]
                                                : '__all__'
                                        }
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setFilterValues(
                                                f.column,
                                                f.table,
                                                v === '__all__' ? [] : [v],
                                            );
                                        }}
                                        className="mb-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                                    >
                                        <option value="__all__">(Tous)</option>
                                        {distinctValues(
                                            f.column,
                                            rowsFor(f),
                                        ).map((v) => (
                                            <option key={v} value={v}>
                                                {v}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {f.type === 'dropdown'
                                    ? null
                                    : distinctValues(f.column, rowsFor(f)).map(
                                          (v) => (
                                              <label
                                                  key={v}
                                                  className="flex items-center gap-2 py-[1px] text-[11px]"
                                              >
                                                  <input
                                                      type="checkbox"
                                                      checked={f.values.includes(
                                                          v,
                                                      )}
                                                      onChange={() =>
                                                          toggleFilterValue(
                                                              f.column,
                                                              v,
                                                              f.table,
                                                          )
                                                      }
                                                      className="size-3 accent-[var(--brand)]"
                                                  />
                                                  <span className="truncate">
                                                      {v}
                                                  </span>
                                              </label>
                                          ),
                                      )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* --------------------------- Selection pane --------------------------- */

export function SelectionPane({ onCollapse }: { onCollapse?: () => void }) {
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
                title="Sélection"
                right={
                    <button
                        onClick={() => togglePane('selection')}
                        aria-label="Fermer le volet de sélection"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
                onCollapse={onCollapse}
            />
            <p className="px-3 pb-1 text-[10px] text-muted-foreground">
                Ordre des couches (avant → arrière) · ordre des onglets
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
                        Aucun objet sur cette page.
                    </p>
                )}
            </div>
        </div>
    );
}

/* --------------------------- Bookmarks pane --------------------------- */

export function BookmarksPane({ onCollapse }: { onCollapse?: () => void }) {
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
                title="Signets"
                right={
                    <button
                        onClick={() => togglePane('bookmarks')}
                        aria-label="Fermer le volet des signets"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
                onCollapse={onCollapse}
            />
            <div className="px-3 pb-2">
                <button
                    onClick={() =>
                        addBookmark(window.prompt('Nom du signet') ?? '')
                    }
                    className="flex w-full items-center justify-center gap-1 rounded border border-border py-1 text-[11px] hover:bg-accent"
                >
                    <Plus className="size-3" /> Ajouter un signet
                </button>
            </div>
            <div className="flex-1 overflow-auto px-2 pb-2">
                {!bookmarks.length && (
                    <p className="px-1 text-[11px] text-muted-foreground">
                        Les signets capturent les filtres, les sélections des
                        segments, les filtres croisés et la visibilité des
                        visuels.
                    </p>
                )}
                {bookmarks.map((b) => (
                    <div
                        key={b.id}
                        className="mb-1 flex items-center gap-1 rounded px-1 py-1 text-[11px] hover:bg-accent"
                    >
                        <Bookmark className="size-3 text-muted-foreground" />
                        <button
                            onClick={() => applyBookmark(b.id)}
                            className="min-w-0 flex-1 truncate text-left"
                        >
                            {b.name}
                        </button>
                        <button
                            onClick={() => removeBookmark(b.id)}
                            aria-label="Supprimer le signet"
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

export function SyncSlicersPane({ onCollapse }: { onCollapse?: () => void }) {
    const { page, pages, slicerSync, setSlicerSync, togglePane } = usePbi();
    const slicers = page.visuals.filter((v) =>
        v.type.toLowerCase().includes('slicer'),
    );
    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Synchroniser les segments"
                right={
                    <button
                        onClick={() => togglePane('syncSlicers')}
                        aria-label="Fermer le volet de synchronisation des segments"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
                onCollapse={onCollapse}
            />
            <div className="flex-1 overflow-auto px-3 pb-3 text-[11px]">
                {!slicers.length && (
                    <p className="text-muted-foreground">
                        Ajoutez un segment à cette page pour le synchroniser.
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
