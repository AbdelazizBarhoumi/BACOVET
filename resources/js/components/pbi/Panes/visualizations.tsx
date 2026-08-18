import { ChevronDown, TriangleAlert, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    ANALYTICS_DEFAULT_COLOR,
    LIST_AGG_NUMERIC_MODES,
    PAGE_PRESETS,
    VALUE_AGGREGATION_MODES,
    fieldIssue,
    fieldLabel,
    fieldNumericIssue,
    fieldType,
    isListMeasure,
    isMeasure,
    listAggIgnoredCount,
    listMeasureValue,
    measureLabel,
    normalizeAxes,
    type Agg,
    type AxisDef,
    type ValueAggregationMode,
    type VisualType,
    type WellField,
} from '@/lib/pbi/model';
import { usePbi, type WellName } from '@/lib/pbi/store';
import { CARTESIAN_TYPES } from '@/lib/pbi/store/consts';
import { visualConfig } from '@/lib/pbi/visualConfig';
import { cn } from '@/lib/utils';
import { CartesianFormat } from '../CartesianFormat';
import { ClockFormat } from '../ClockFormat';
import { ColorInput } from '../formatControls';
import { GaugeFormat } from '../GaugeFormat';
import { SingleValueFormat } from '../SingleValueFormat';
import { GenericFormat, TextImageFormat } from './format';
import {
    IconAreaPreview,
    IconBarPreview,
    IconBubblePreview,
    IconButtonPreview,
    IconButtonSlicerPreview,
    IconCardPreview,
    IconClockPreview,
    IconColumnPreview,
    IconComboPreview,
    IconDateSlicerPreview,
    IconDonutPreview,
    IconDropdownSlicerPreview,
    IconFilledMapPreview,
    IconFunnelPreview,
    IconGaugePreview,
    IconImagePreview,
    IconInputSlicerPreview,
    IconLinePreview,
    IconMapPreview,
    IconMatrixPreview,
    IconParetoPreview,
    IconPiePreview,
    IconRibbonPreview,
    IconScatterPreview,
    IconShapeMapPreview,
    IconSlicerPreview,
    IconStacked100BarPreview,
    IconStacked100ColumnPreview,
    IconStackedAreaPreview,
    IconStackedBarPreview,
    IconStackedColumnPreview,
    IconTablePreview,
    IconTextPreview,
    IconTreemapPreview,
    IconWaterfallPreview,
    type IconComponent,
} from './icons';
import {
    AGG_LABELS,
    AGGS,
    PaneHeader,
    SINGLE_VALUE_WELLS,
    VALUE_AGGREGATION_LABELS,
} from './shared';

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
                Icon: IconColumnPreview,
            },
            {
                type: 'stackedColumn',
                label: 'Histogramme empilé',
                Icon: IconStackedColumnPreview,
            },
            {
                type: 'stacked100Column',
                label: 'Histogramme empilé 100 %',
                Icon: IconStacked100ColumnPreview,
            },
            {
                type: 'bar',
                label: 'Barres groupées',
                Icon: IconBarPreview,
            },
            {
                type: 'stackedBar',
                label: 'Barres empilées',
                Icon: IconStackedBarPreview,
            },
            {
                type: 'stacked100Bar',
                label: 'Barres empilées 100 %',
                Icon: IconStacked100BarPreview,
            },
            { type: 'line', label: 'Courbe', Icon: IconLinePreview },
            { type: 'area', label: 'Aire', Icon: IconAreaPreview },
            {
                type: 'stackedArea',
                label: 'Aire empilée',
                Icon: IconStackedAreaPreview,
            },
            {
                type: 'combo',
                label: 'Courbe et histogramme empilé',
                Icon: IconComboPreview,
            },
            {
                type: 'pareto',
                label: 'Pareto',
                Icon: IconParetoPreview,
            },
        ],
    },
    {
        group: 'Part du tout et distribution',
        items: [
            { type: 'pie', label: 'Secteurs', Icon: IconPiePreview },
            { type: 'donut', label: 'Anneau', Icon: IconDonutPreview },
            {
                type: 'treemap',
                label: 'Treemap',
                Icon: IconTreemapPreview,
            },
            { type: 'funnel', label: 'Entonnoir', Icon: IconFunnelPreview },
            { type: 'ribbon', label: 'Ruban', Icon: IconRibbonPreview },
            {
                type: 'waterfall',
                label: 'Cascade',
                Icon: IconWaterfallPreview,
            },
            {
                type: 'scatter',
                label: 'Nuage de points',
                Icon: IconScatterPreview,
            },
            {
                type: 'bubble',
                label: 'Nuage de points (bulles)',
                Icon: IconBubblePreview,
            },
        ],
    },
    {
        group: 'Valeur unique et tabulaire',
        items: [
            { type: 'card', label: 'Carte', Icon: IconCardPreview },
            { type: 'gauge', label: 'Jauge', Icon: IconGaugePreview },
            { type: 'table', label: 'Tableau', Icon: IconTablePreview },
            { type: 'matrix', label: 'Matrice', Icon: IconMatrixPreview },
        ],
    },
    {
        group: 'Cartes',
        items: [
            { type: 'map', label: 'Carte', Icon: IconMapPreview },
            {
                type: 'filledMap',
                label: 'Carte remplie',
                Icon: IconFilledMapPreview,
            },
            {
                type: 'shapeMap',
                label: 'Carte de formes',
                Icon: IconShapeMapPreview,
            },
        ],
    },
    {
        group: 'Segmenteurs',
        items: [
            {
                type: 'slicer',
                label: 'Segmenteur (cases à cocher)',
                Icon: IconSlicerPreview,
            },
            {
                type: 'buttonSlicer',
                label: 'Segmenteur de boutons',
                Icon: IconButtonSlicerPreview,
            },
            {
                type: 'dropdownSlicer',
                label: 'Segmenteur déroulant',
                Icon: IconDropdownSlicerPreview,
            },
            {
                type: 'inputSlicer',
                label: 'Segmenteur de saisie',
                Icon: IconInputSlicerPreview,
            },
            {
                type: 'dateSlicer',
                label: 'Segmenteur de dates',
                Icon: IconDateSlicerPreview,
            },
        ],
    },
    {
        group: 'Éléments',
        items: [
            {
                type: 'text',
                label: 'Zone de texte',
                Icon: IconTextPreview,
            },
            { type: 'image', label: 'Image', Icon: IconImagePreview },
            { type: 'button', label: 'Bouton', Icon: IconButtonPreview },
            { type: 'clock', label: 'Horloge', Icon: IconClockPreview },
        ],
    },
];

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
            className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] outline-none placeholder:text-muted-foreground/50 focus:border-brand"
        />
    );
}

/** Small controlled integer input for the single-value list options (Nth
 * position, window size). Commits live as you type; blur / Enter finalize and
 * snap invalid text back to the last committed value. */
function InlineIntInput({
    value,
    min = 1,
    placeholder,
    onCommit,
}: {
    value: number | undefined;
    min?: number;
    placeholder?: string;
    onCommit: (value: number | undefined) => void;
}) {
    const [text, setText] = useState(value === undefined ? '' : String(value));
    const [prev, setPrev] = useState(value);
    if (value !== prev) {
        setPrev(value);
        setText(value === undefined ? '' : String(value));
    }

    const apply = (raw: string) => {
        const trimmed = raw.trim();
        if (trimmed === '') {
            onCommit(undefined);
            return;
        }
        const n = Math.floor(Number(trimmed));
        if (Number.isFinite(n) && n >= min) onCommit(n);
    };

    const finalize = () => {
        const trimmed = text.trim();
        const n = Math.floor(Number(trimmed));
        if (trimmed !== '' && Number.isFinite(n) && n >= min) onCommit(n);
        else setText(value === undefined ? '' : String(value));
    };

    return (
        <input
            type="number"
            min={min}
            value={text}
            placeholder={placeholder}
            onChange={(e) => {
                setText(e.target.value);
                apply(e.target.value);
            }}
            onBlur={finalize}
            onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="w-14 rounded border border-border bg-background px-1 py-0.5 text-[10px] outline-none placeholder:text-muted-foreground/50 focus:border-brand"
        />
    );
}

/** Dropdowns for one cartesian value field: the draw style (bar/line/area)
 * and the value axis it plots on. The axis list offers the visual's current
 * axes plus a "+ nouvel axe" entry that lazily creates an extra axis. */
function ValueFieldControls({
    visualId,
    field,
    index,
    patchWellField,
}: {
    visualId: string;
    field: WellField;
    index: number;
    patchWellField: (
        visualId: string,
        well: WellName,
        index: number,
        patch: Partial<WellField>,
    ) => void;
}) {
    return (
        <select
            title="Style de la série"
            value={field.seriesType ?? 'auto'}
            onChange={(e) =>
                patchWellField(visualId, 'values', index, {
                    seriesType:
                        e.target.value === 'auto'
                            ? undefined
                            : (e.target.value as WellField['seriesType']),
                })
            }
            data-testid={`series-type-select-${index}`}
            className="rounded border border-border bg-background text-[10px]"
        >
            {(['auto', 'bar', 'line', 'area'] as const).map((t) => (
                <option key={t} value={t}>
                    {t === 'auto'
                        ? 'Barres'
                        : t === 'bar'
                          ? 'Barres'
                          : t === 'line'
                            ? 'Courbe'
                            : 'Aires'}
                </option>
            ))}
        </select>
    );
}

function ValueAxisSelect({
    visualId,
    axes,
    field,
    index,
    addValueAxis,
    patchWellField,
}: {
    visualId: string;
    axes: AxisDef[];
    field: WellField;
    index: number;
    addValueAxis: (id: string) => string | undefined;
    patchWellField: (
        visualId: string,
        well: WellName,
        index: number,
        patch: Partial<WellField>,
    ) => void;
}) {
    const normalized = useMemo(() => normalizeAxes(axes), [axes]);
    const current = field.axisId ?? normalized[0]?.id ?? 'y0';
    return (
        <select
            title="Axe des valeurs"
            value={current}
            onChange={(e) => {
                if (e.target.value === '__new__') {
                    const id = addValueAxis(visualId);
                    if (id)
                        patchWellField(visualId, 'values', index, {
                            axisId: id,
                        });
                    return;
                }
                patchWellField(visualId, 'values', index, {
                    axisId: e.target.value,
                });
            }}
            data-testid={`axis-select-${index}`}
            className="w-36 rounded border border-border bg-background text-[10px]"
        >
            {normalized.map((a) => (
                <option key={a.id} value={a.id}>
                    Axe {a.order + 1} {a.title ? `— ${a.title}` : ''}
                </option>
            ))}
            <option value="__new__">+ Nouvel axe</option>
        </select>
    );
}

export function VisualizationsPane({
    onCollapse,
}: {
    onCollapse?: () => void;
}) {
    const {
        selected,
        selectedIds,
        addVisual,
        updateVisualSingle,
        dropField,
        removeWellField,
        moveWellField,
        setWellAgg,
        setWellValueAgg,
        patchWellField,
        addValueAxis,
        toggleAnalytics,
        setAnalyticsValue,
        setAnalyticsValue2,
        setAnalyticsCategory,
        setAnalyticsAxes,
        setAnalyticsColor,
        setAnalyticsAxisColor,
        setAnalyticsAxisValue,
        page,
        pages,
        setPageFormat,
        filteredTables,
    } = usePbi();
    const [tab, setTab] = useState<'fields' | 'format' | 'analytics'>('fields');
    const [listOpen, setListOpen] = useState(true);
    const [dragOverWell, setDragOverWell] = useState<WellName | null>(null);
    const [listAggConfirm, setListAggConfirm] = useState<{
        visualId: string;
        well: WellName;
        index: number;
        mode: Agg;
        ignored: number;
    } | null>(null);

    const listCodes = (f: WellField) =>
        isListMeasure(f.name)
            ? listMeasureValue([], f.name, { tables: filteredTables })
            : [];

    const handleListAggChange = (
        visualId: string,
        well: WellName,
        index: number,
        f: WellField,
        raw: string,
    ) => {
        if (raw === 'list') {
            patchWellField(visualId, well, index, { listAgg: undefined });
            return;
        }
        const mode = raw as Agg;
        const codes = listCodes(f);
        const ignored = listAggIgnoredCount(codes, mode);
        if (
            LIST_AGG_NUMERIC_MODES.includes(mode) &&
            ignored > 0 &&
            codes.length
        ) {
            setListAggConfirm({ visualId, well, index, mode, ignored });
            return;
        }
        patchWellField(visualId, well, index, { listAgg: mode });
    };

    const config = selected ? visualConfig(selected.type) : null;
    /** Distinct category labels of the primary axis field, for the analytics
     * "category" line input (datalist suggestions). */
    const categoryOptions = (() => {
        const field = selected?.axis[0];
        if (!field) return [] as string[];
        const table = filteredTables.find((t) => t.name === field.table);
        if (!table) return [] as string[];
        const seen = new Set<string>();
        for (const row of table.rows) {
            const v = String(row[field.name] ?? '');
            if (v) seen.add(v);
        }
        return [...seen];
    })();
    /** The visual's value axes, for per-axis analytics toggles. */
    const paneAxes = useMemo(
        () => (selected ? normalizeAxes(selected.axes ?? []) : []),
        [selected],
    );
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
                                const tableValueWell =
                                    name === 'values' &&
                                    (selected.type === 'table' ||
                                        selected.type === 'matrix');
                                // Row-detail mode: raw per-row values. Text
                                // defaults to it (unless an explicit collapse
                                // choice is set); numeric opts in via detail.
                                const detailOn =
                                    tableValueWell &&
                                    !isMeasure(f.name) &&
                                    (f.detail === true ||
                                        (!numericField &&
                                            f.valueAggregation === undefined));
                                const valueRow =
                                    name === 'values' &&
                                    CARTESIAN_TYPES.includes(selected.type);
                                const aggSelect =
                                    numericField && !detailOn ? (
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
                                            data-testid={`agg-select-${name}-${i}`}
                                            className="w-16 rounded border border-border bg-background text-[10px]"
                                        >
                                            {AGGS.map((a) => (
                                                <option key={a} value={a}>
                                                    {AGG_LABELS[a]}
                                                </option>
                                            ))}
                                        </select>
                                    ) : null;
                                return (
                                    <Fragment key={`${f.name}-${i}`}>
                                        <div
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData(
                                                    'text/plain',
                                                    JSON.stringify({
                                                        table: f.table,
                                                        name: f.name,
                                                        measure: isMeasure(
                                                            f.name,
                                                        ),
                                                        fromWell: name,
                                                        fromIndex: i,
                                                    }),
                                                );
                                                e.dataTransfer.effectAllowed =
                                                    'move';
                                            }}
                                            className="mb-0.5 cursor-grab rounded bg-muted px-2 py-1 text-[11px] active:cursor-grabbing"
                                        >
                                            <div className="flex flex-wrap items-center gap-1">
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
                                                {!valueRow && aggSelect}
                                                {SINGLE_VALUE_WELLS.has(name) &&
                                                    !numericField &&
                                                    !isMeasure(f.name) &&
                                                    !detailOn && (
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
                                                            data-testid={`value-agg-select-${name}-${i}`}
                                                            className="rounded border border-border bg-background text-[10px]"
                                                        >
                                                            {VALUE_AGGREGATION_MODES.map(
                                                                (m) => (
                                                                    <option
                                                                        key={m}
                                                                        value={
                                                                            m
                                                                        }
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
                                                {SINGLE_VALUE_WELLS.has(name) &&
                                                    isListMeasure(f.name) && (
                                                        <select
                                                            title="Traitement de la liste"
                                                            aria-label="Traitement de la liste"
                                                            value={
                                                                f.listAgg ??
                                                                'list'
                                                            }
                                                            onChange={(e) =>
                                                                handleListAggChange(
                                                                    selected.id,
                                                                    name,
                                                                    i,
                                                                    f,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="rounded border border-border bg-background text-[10px]"
                                                        >
                                                            <option value="list">
                                                                Liste
                                                            </option>
                                                            <option value="count">
                                                                {
                                                                    AGG_LABELS.count
                                                                }
                                                            </option>
                                                            <option value="distinct">
                                                                {
                                                                    AGG_LABELS.distinct
                                                                }
                                                            </option>
                                                            <option value="first">
                                                                {
                                                                    AGG_LABELS.first
                                                                }
                                                            </option>
                                                            <option value="latest">
                                                                {
                                                                    AGG_LABELS.latest
                                                                }
                                                            </option>
                                                            <option value="raw">
                                                                {AGG_LABELS.raw}
                                                            </option>
                                                            <option value="nth">
                                                                {AGG_LABELS.nth}
                                                            </option>
                                                            <option value="sum">
                                                                {AGG_LABELS.sum}
                                                            </option>
                                                            <option value="avg">
                                                                {AGG_LABELS.avg}
                                                            </option>
                                                            <option value="min">
                                                                {AGG_LABELS.min}
                                                            </option>
                                                            <option value="max">
                                                                {AGG_LABELS.max}
                                                            </option>
                                                        </select>
                                                    )}
                                                {issue && (
                                                    <span className="max-w-44 truncate rounded border border-warning/40 bg-warning/10 px-1 py-0.5 text-[9px] text-warning">
                                                        {issue}
                                                    </span>
                                                )}
                                                {!valueRow && (
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
                                                )}
                                            </div>
                                            {valueRow && aggSelect && (
                                                <div className="mt-1 flex items-center gap-1 border-t border-border/40 pt-1">
                                                    {aggSelect}
                                                </div>
                                            )}
                                            {valueRow && (
                                                <div className="mt-1 flex items-center gap-1 border-t border-border/40 pt-1">
                                                    <ValueFieldControls
                                                        visualId={selected.id}
                                                        field={f}
                                                        index={i}
                                                        patchWellField={
                                                            patchWellField
                                                        }
                                                    />
                                                    <ValueAxisSelect
                                                        visualId={selected.id}
                                                        axes={
                                                            selected.axes ?? []
                                                        }
                                                        field={f}
                                                        index={i}
                                                        addValueAxis={
                                                            addValueAxis
                                                        }
                                                        patchWellField={
                                                            patchWellField
                                                        }
                                                    />
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
                                            )}
                                        </div>
                                        {SINGLE_VALUE_WELLS.has(name) &&
                                            !isMeasure(f.name) && (
                                                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 rounded border border-dashed border-border/60 bg-background/60 px-2 py-1 text-[10px] text-muted-foreground">
                                                    {tableValueWell && (
                                                        <label
                                                            className="flex cursor-pointer items-center gap-1"
                                                            title="Afficher chaque ligne de données avec sa valeur brute (désactive la synthèse par groupe)"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                data-testid={`detail-toggle-${name}-${i}`}
                                                                checked={
                                                                    detailOn
                                                                }
                                                                onChange={() =>
                                                                    detailOn
                                                                        ? patchWellField(
                                                                              selected.id,
                                                                              name,
                                                                              i,
                                                                              numericField
                                                                                  ? {
                                                                                        detail: false,
                                                                                    }
                                                                                  : {
                                                                                        detail: false,
                                                                                        valueAggregation:
                                                                                            'first',
                                                                                        index: undefined,
                                                                                        window: undefined,
                                                                                        windowDir:
                                                                                            undefined,
                                                                                    },
                                                                          )
                                                                        : patchWellField(
                                                                              selected.id,
                                                                              name,
                                                                              i,
                                                                              {
                                                                                  detail: true,
                                                                                  valueAggregation:
                                                                                      undefined,
                                                                                  index: undefined,
                                                                                  window: undefined,
                                                                                  windowDir:
                                                                                      undefined,
                                                                              },
                                                                          )
                                                                }
                                                            />
                                                            Détail des lignes
                                                        </label>
                                                    )}
                                                    {!detailOn &&
                                                        ((numericField &&
                                                            f.agg === 'nth') ||
                                                            (!numericField &&
                                                                (f.valueAggregation ??
                                                                    'first') ===
                                                                    'nth')) && (
                                                            <label className="flex items-center gap-1">
                                                                Position
                                                                <InlineIntInput
                                                                    value={
                                                                        f.index
                                                                    }
                                                                    min={1}
                                                                    placeholder="1"
                                                                    onCommit={(
                                                                        v,
                                                                    ) =>
                                                                        patchWellField(
                                                                            selected.id,
                                                                            name,
                                                                            i,
                                                                            {
                                                                                index: v,
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                            </label>
                                                        )}
                                                    {!detailOn && (
                                                        <label className="flex items-center gap-1">
                                                            <select
                                                                value={
                                                                    f.windowDir ??
                                                                    'last'
                                                                }
                                                                onChange={(e) =>
                                                                    patchWellField(
                                                                        selected.id,
                                                                        name,
                                                                        i,
                                                                        {
                                                                            windowDir:
                                                                                e
                                                                                    .target
                                                                                    .value as
                                                                                    | 'first'
                                                                                    | 'last',
                                                                        },
                                                                    )
                                                                }
                                                                className="rounded border border-border bg-background text-[10px]"
                                                            >
                                                                <option value="last">
                                                                    Derniers
                                                                </option>
                                                                <option value="first">
                                                                    Premiers
                                                                </option>
                                                            </select>
                                                            <InlineIntInput
                                                                value={f.window}
                                                                min={1}
                                                                placeholder="toutes"
                                                                onCommit={(v) =>
                                                                    patchWellField(
                                                                        selected.id,
                                                                        name,
                                                                        i,
                                                                        {
                                                                            window: v,
                                                                        },
                                                                    )
                                                                }
                                                            />
                                                            <span>lignes</span>
                                                        </label>
                                                    )}
                                                </div>
                                            )}
                                    </Fragment>
                                );
                            })
                        ) : boundInput ? (
                            <BoundValueInput
                                value={boundInput.value}
                                placeholder="Saisir une valeur"
                                onCommit={(v) => {
                                    if (selected)
                                        updateVisualSingle(selected.id, {
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
                                                ? updateVisualSingle(
                                                      selected.id,
                                                      {
                                                          type: v.type,
                                                      },
                                                  )
                                                : addVisual(v.type)
                                        }
                                        className={cn(
                                            'flex h-8 items-center justify-center rounded border border-border text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground',
                                            selected?.type === v.type &&
                                                'border-brand bg-brand/15 text-brand',
                                        )}
                                    >
                                        <v.Icon className="size-5" />
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
                        {selectedIds.length > 1 && (
                            <div className="mb-2 rounded border border-brand/30 bg-brand/10 px-2 py-1.5 text-[11px] text-foreground">
                                {selectedIds.length} visuels sélectionnés — les
                                modifications s’appliquent à toute la sélection.
                            </div>
                        )}
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
                                                updateVisualSingle(
                                                    selected.id,
                                                    {
                                                        tooltipPageId:
                                                            e.target.value ||
                                                            undefined,
                                                    },
                                                )
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
                            ) : config?.format === 'clock' ? (
                                <ClockFormat visual={selected} />
                            ) : (
                                <GenericFormat visual={selected} />
                            ))}

                        {activeTab === 'analytics' && config?.showAnalytics && (
                            <div className="space-y-2 text-[11px]">
                                {config.analyticsKinds.map((k) => {
                                    const line = selected.analytics.find(
                                        (a) => a.kind === k,
                                    );
                                    const enabled = !!line;
                                    const valueEditable =
                                        k === 'constant' ||
                                        k === 'max' ||
                                        k === 'min';
                                    return (
                                        <div key={k}>
                                            <label className="flex items-center justify-between capitalize">
                                                <span>{k} ligne</span>
                                                <input
                                                    type="checkbox"
                                                    checked={enabled}
                                                    onChange={() =>
                                                        toggleAnalytics(
                                                            selected.id,
                                                            k,
                                                        )
                                                    }
                                                    className="accent-[var(--brand)]"
                                                />
                                            </label>
                                            {enabled && (
                                                <div className="mt-1 flex items-center gap-2">
                                                    <ColorInput
                                                        value={
                                                            line.color ??
                                                            ANALYTICS_DEFAULT_COLOR[
                                                                k
                                                            ]
                                                        }
                                                        onChange={(v) =>
                                                            setAnalyticsColor(
                                                                selected.id,
                                                                k,
                                                                v,
                                                            )
                                                        }
                                                        ariaLabel={`Couleur ${k}`}
                                                        className="h-5 w-8"
                                                    />
                                                    <span className="flex-1 text-muted-foreground">
                                                        Couleur
                                                    </span>
                                                    {line.color && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setAnalyticsColor(
                                                                    selected.id,
                                                                    k,
                                                                    undefined,
                                                                )
                                                            }
                                                            className="text-enabled hover:text-destructive"
                                                        >
                                                            Défaut
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {enabled &&
                                                valueEditable &&
                                                paneAxes.length <= 1 && (
                                                    <input
                                                        type="number"
                                                        value={line.value ?? ''}
                                                        onChange={(e) =>
                                                            setAnalyticsValue(
                                                                selected.id,
                                                                k,
                                                                e.target
                                                                    .value ===
                                                                    ''
                                                                    ? undefined
                                                                    : Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      ),
                                                            )
                                                        }
                                                        placeholder="Valeur"
                                                        className="mt-1 w-full rounded border border-border bg-background px-2 py-1"
                                                    />
                                                )}
                                            {enabled && k === 'band' && (
                                                <div className="mt-1 flex gap-1">
                                                    <input
                                                        type="number"
                                                        value={line.value ?? ''}
                                                        onChange={(e) =>
                                                            setAnalyticsValue(
                                                                selected.id,
                                                                k,
                                                                e.target
                                                                    .value ===
                                                                    ''
                                                                    ? undefined
                                                                    : Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      ),
                                                            )
                                                        }
                                                        placeholder="Min"
                                                        className="w-full rounded border border-border bg-background px-2 py-1"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={
                                                            line.value2 ?? ''
                                                        }
                                                        onChange={(e) =>
                                                            setAnalyticsValue2(
                                                                selected.id,
                                                                k,
                                                                e.target
                                                                    .value ===
                                                                    ''
                                                                    ? undefined
                                                                    : Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      ),
                                                            )
                                                        }
                                                        placeholder="Max"
                                                        className="w-full rounded border border-border bg-background px-2 py-1"
                                                    />
                                                </div>
                                            )}
                                            {enabled && k === 'category' && (
                                                <input
                                                    type="text"
                                                    list={`analytics-cat-${selected.id}`}
                                                    value={line.category ?? ''}
                                                    onChange={(e) =>
                                                        setAnalyticsCategory(
                                                            selected.id,
                                                            k,
                                                            e.target.value ||
                                                                undefined,
                                                        )
                                                    }
                                                    placeholder="Catégorie"
                                                    className="mt-1 w-full rounded border border-border bg-background px-2 py-1"
                                                />
                                            )}
                                            {enabled &&
                                                paneAxes.length > 1 &&
                                                [
                                                    'constant',
                                                    'average',
                                                    'min',
                                                    'max',
                                                    'median',
                                                    'band',
                                                ].includes(k) && (
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                        <span className="text-muted-foreground">
                                                            Axes&nbsp;:
                                                        </span>
                                                        {paneAxes.map((a) => {
                                                            const current =
                                                                line.axes ??
                                                                paneAxes.map(
                                                                    (x) => x.id,
                                                                );
                                                            const checked =
                                                                current.includes(
                                                                    a.id,
                                                                );
                                                            return (
                                                                <div
                                                                    key={a.id}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <label className="flex items-center gap-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={
                                                                                checked
                                                                            }
                                                                            onChange={() => {
                                                                                const all =
                                                                                    paneAxes.map(
                                                                                        (
                                                                                            x,
                                                                                        ) =>
                                                                                            x.id,
                                                                                    );
                                                                                const next =
                                                                                    checked
                                                                                        ? current.filter(
                                                                                              (
                                                                                                  i,
                                                                                              ) =>
                                                                                                  i !==
                                                                                                  a.id,
                                                                                          )
                                                                                        : [
                                                                                              ...current,
                                                                                              a.id,
                                                                                          ];
                                                                                setAnalyticsAxes(
                                                                                    selected.id,
                                                                                    k,
                                                                                    next.length ===
                                                                                        all.length
                                                                                        ? undefined
                                                                                        : next,
                                                                                );
                                                                            }}
                                                                            className="accent-[var(--brand)]"
                                                                        />
                                                                        Axe{' '}
                                                                        {a.order +
                                                                            1}
                                                                        {a.title
                                                                            ? ` — ${a.title}`
                                                                            : ''}
                                                                    </label>
                                                                    <ColorInput
                                                                        value={
                                                                            line
                                                                                .axisColors?.[
                                                                                a
                                                                                    .id
                                                                            ] ??
                                                                            line.color ??
                                                                            ANALYTICS_DEFAULT_COLOR[
                                                                                k
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            v,
                                                                        ) =>
                                                                            setAnalyticsAxisColor(
                                                                                selected.id,
                                                                                k,
                                                                                a.id,
                                                                                v ===
                                                                                    (line.color ??
                                                                                        ANALYTICS_DEFAULT_COLOR[
                                                                                            k
                                                                                        ])
                                                                                    ? undefined
                                                                                    : v,
                                                                            )
                                                                        }
                                                                        ariaLabel={`Couleur axe ${a.order + 1} ${k}`}
                                                                        className="h-4 w-6"
                                                                    />
                                                                    {valueEditable && (
                                                                        <input
                                                                            type="number"
                                                                            value={
                                                                                line
                                                                                    .axisValues?.[
                                                                                    a
                                                                                        .id
                                                                                ] ??
                                                                                line.value ??
                                                                                ''
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setAnalyticsAxisValue(
                                                                                    selected.id,
                                                                                    k,
                                                                                    a.id,
                                                                                    e
                                                                                        .target
                                                                                        .value ===
                                                                                        ''
                                                                                        ? undefined
                                                                                        : Number(
                                                                                              e
                                                                                                  .target
                                                                                                  .value,
                                                                                          ),
                                                                                )
                                                                            }
                                                                            placeholder={
                                                                                line.value !==
                                                                                undefined
                                                                                    ? String(
                                                                                          line.value,
                                                                                      )
                                                                                    : '—'
                                                                            }
                                                                            aria-label={`Valeur axe ${a.order + 1} ${k}`}
                                                                            className="h-4 w-14 rounded border border-border bg-background px-1 text-[10px]"
                                                                        />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                        </div>
                                    );
                                })}
                                {categoryOptions.length > 0 && (
                                    <datalist
                                        id={`analytics-cat-${selected.id}`}
                                    >
                                        {categoryOptions.map((c) => (
                                            <option key={c} value={c} />
                                        ))}
                                    </datalist>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
            <AlertDialog
                open={listAggConfirm !== null}
                onOpenChange={(o) => {
                    if (!o) setListAggConfirm(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Codes non numériques ignorés
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {listAggConfirm
                                ? `${listAggConfirm.ignored} code(s) non numérique(s) seront ignorés. Continuer ?`
                                : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!listAggConfirm) return;
                                const { visualId, well, index, mode } =
                                    listAggConfirm;
                                patchWellField(visualId, well, index, {
                                    listAgg: mode,
                                });
                                setListAggConfirm(null);
                            }}
                        >
                            Continuer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
