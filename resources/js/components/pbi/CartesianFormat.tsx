import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import {
    DISPLAY_UNITS,
    distinctValues,
    measureLabel,
    normalizeAxes,
    normalizeAxisStyle,
    normalizeBarStyle,
    normalizeDataLabelStyle,
    normalizeGridlinesStyle,
    normalizeLegendStyle,
    normalizePlotAreaStyle,
    STACKED_EMPTY_FILL,
    type AxisDef,
    type AxisPosition,
    type AxisStyle,
    type BarStyle,
    type DataLabelContent,
    type DataLabelPosition,
    type DataLabelSeriesOverride,
    type DataLabelStyle,
    type DisplayUnit,
    type GridlineStyle,
    type GridlinesStyle,
    type LegendPosition,
    type LegendStyle,
    type NumberFormat,
    type PlotAreaStyle,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { ConditionalFormatControl } from './ConditionalFormatDialog';
import {
    Biu,
    ColorInput,
    FontStyleControls,
    NumberInput,
    OptionalNumberInput,
    Section,
    Select,
    Stepper,
    TextInput,
    TitleSection,
    Toggle,
} from './formatControls';

/** Horizontal (bar) family — the value axis sits on X, categories on Y. */
const HORIZONTAL_TYPES = ['bar', 'stackedBar', 'stacked100Bar'];

/** Stacked family — bars pile up, so the empty space above them can be
 * filled via the value axis' `emptyColor`. */
const STACKED_TYPES = [
    'stackedColumn',
    'stacked100Column',
    'stackedBar',
    'stacked100Bar',
    'stackedArea',
    'ribbon',
];

const DISPLAY_UNIT_LABELS: Record<DisplayUnit, string> = {
    auto: 'Auto',
    none: 'Aucune',
    thousands: 'Milliers (K)',
    millions: 'Millions (M)',
    billions: 'Milliards (B)',
    percent: 'Pourcentage (%)',
    currency: 'Devise ($)',
};

const LABEL_POSITIONS: {
    value: DataLabelPosition;
    label: string;
}[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'insideEnd', label: 'Fin intérieure' },
    { value: 'outsideEnd', label: 'Fin extérieure' },
    { value: 'insideCenter', label: 'Centre intérieur' },
    { value: 'insideBase', label: 'Base intérieure' },
];

const DATA_LABEL_CONTENTS: { value: DataLabelContent; label: string }[] = [
    { value: 'category', label: 'Catégorie' },
    { value: 'value', label: 'Valeur' },
    { value: 'percentOfTotal', label: '% du total' },
    { value: 'categoryValue', label: 'Catégorie + valeur' },
    { value: 'categoryPercent', label: 'Catégorie + %' },
    { value: 'valuePercent', label: 'Valeur + %' },
    { value: 'all', label: 'Tous les détails' },
];

const GRIDLINE_STYLES: { value: GridlineStyle; label: string }[] = [
    { value: 'solid', label: 'Plein' },
    { value: 'dashed', label: 'Tirets' },
    { value: 'dotted', label: 'Points' },
];

const LEGEND_POSITIONS: { value: LegendPosition; label: string }[] = [
    { value: 'top', label: 'Haut' },
    { value: 'bottom', label: 'Bas' },
    { value: 'left', label: 'Gauche' },
    { value: 'right', label: 'Droite' },
];

/** Vertical charts place the value axis on the left/right; the horizontal
 * (bar) family runs it along the bottom/top, so only the matching pair is
 * offered. */
const AXIS_POSITIONS_VERTICAL: { value: AxisPosition; label: string }[] = [
    { value: 'left', label: 'Gauche' },
    { value: 'right', label: 'Droite' },
];

const AXIS_POSITIONS_HORIZONTAL: { value: AxisPosition; label: string }[] = [
    { value: 'bottom', label: 'Bas' },
    { value: 'top', label: 'Haut' },
];

const NUMBER_FORMATS: { value: NumberFormat; label: string }[] = [
    { value: 'auto', label: 'Auto (champ)' },
    { value: 'int', label: 'Entier' },
    { value: '1dec', label: '1 décimale' },
    { value: '2dec', label: '2 décimales' },
    { value: 'compact', label: 'Compact' },
    { value: 'percent', label: 'Pourcentage' },
    { value: 'currency', label: 'Devise' },
];

/** One axis section. Numeric-axis-only controls (units, range) render only
 * when the axis is the value axis. */
function AxisSection({
    title,
    axis,
    isValue,
    onPatch,
    showEmptyFill,
}: {
    title: string;
    axis: AxisStyle;
    isValue: boolean;
    onPatch: (patch: Partial<AxisStyle>) => void;
    /** Stacked bar/column charts: offer the empty-space fill behind the bars. */
    showEmptyFill?: boolean;
}) {
    return (
        <Section title={title}>
            <Toggle
                label="Afficher l'axe"
                checked={axis.show}
                onChange={(v) => onPatch({ show: v })}
            />
            {axis.show && (
                <>
                    <TextInput
                        label="Titre"
                        value={axis.title ?? ''}
                        placeholder="Aucun"
                        onChange={(v) => onPatch({ title: v })}
                    />
                    <Toggle
                        label="Afficher le titre"
                        checked={axis.showTitle !== false}
                        onChange={(v) => onPatch({ showTitle: v })}
                    />
                    <FontStyleControls
                        label="Police du titre"
                        font={axis.titleFont}
                        onChange={(p) =>
                            onPatch({
                                titleFont: { ...axis.titleFont, ...p },
                            })
                        }
                    />
                    <Stepper
                        label="Décalage du titre (px)"
                        value={axis.titleOffset ?? 0}
                        min={-40}
                        max={80}
                        onChange={(v) => onPatch({ titleOffset: v })}
                    />
                    <Stepper
                        label="Décalage de l'axe (px)"
                        value={axis.gap ?? 0}
                        min={-30}
                        max={80}
                        onChange={(v) => onPatch({ gap: v })}
                    />
                    <Toggle
                        label="Afficher la ligne"
                        checked={axis.showLine !== false}
                        onChange={(v) => onPatch({ showLine: v })}
                    />
                    <Toggle
                        label="Afficher les valeurs"
                        checked={axis.showLabels !== false}
                        onChange={(v) => onPatch({ showLabels: v })}
                    />
                    <ColorInput
                        label="Couleur"
                        value={axis.color || 'default'}
                        onChange={(v) =>
                            onPatch({ color: v === 'default' ? '' : v })
                        }
                    />
                    <FontStyleControls
                        label="Police des valeurs"
                        font={axis.labelsFont}
                        onChange={(p) =>
                            onPatch({
                                labelsFont: { ...axis.labelsFont, ...p },
                            })
                        }
                    />
                    {isValue && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <Select
                                    label="Unités d'affichage"
                                    value={axis.displayUnits}
                                    options={DISPLAY_UNITS.map((u) => ({
                                        value: u,
                                        label: DISPLAY_UNIT_LABELS[u],
                                    }))}
                                    onChange={(v) =>
                                        onPatch({
                                            displayUnits: v as DisplayUnit,
                                        })
                                    }
                                />
                                <TextInput
                                    label="Suffixe"
                                    placeholder="ex. kW"
                                    value={axis.suffix ?? ''}
                                    onChange={(v) =>
                                        onPatch({
                                            suffix: v.trim() || undefined,
                                        })
                                    }
                                />
                            </div>
                            <NumberInput
                                label="Décimales des valeurs"
                                min={0}
                                max={10}
                                value={axis.decimals ?? 1}
                                onChange={(v) => onPatch({ decimals: v })}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <OptionalNumberInput
                                    label="Min"
                                    value={axis.min}
                                    onChange={(v) => onPatch({ min: v })}
                                />
                                <OptionalNumberInput
                                    label="Max"
                                    value={axis.max}
                                    onChange={(v) => onPatch({ max: v })}
                                />
                            </div>
                            {showEmptyFill && (
                                <ColorInput
                                    label="Espace vide des barres"
                                    value={
                                        axis.emptyColor ?? STACKED_EMPTY_FILL
                                    }
                                    onChange={(v) =>
                                        onPatch({
                                            emptyColor:
                                                v === 'default' ? undefined : v,
                                        })
                                    }
                                />
                            )}
                        </>
                    )}
                </>
            )}
        </Section>
    );
}

/** Shared control block under a label "Afficher les étiquettes" toggle —
 * reused for bar/column data labels and the Pareto cumulative-% line. */
function DataLabelsForm({
    labels,
    onPatch,
    seriesNames,
}: {
    labels: DataLabelStyle;
    onPatch: (patch: Partial<DataLabelStyle>) => void;
    seriesNames: string[];
}) {
    return (
        <>
            <Select
                label="Appliquer les réglages à"
                value={labels.applyTo}
                options={[
                    { value: 'all', label: 'Toutes les séries' },
                    { value: 'perSeries', label: 'Par série' },
                ]}
                onChange={(v) =>
                    onPatch({ applyTo: v as DataLabelStyle['applyTo'] })
                }
            />
            {labels.applyTo === 'perSeries' && (
                <div className="space-y-2">
                    <div className="text-muted-foreground">
                        Remplacements de série — vide garde le style partagé
                        (position, contenu et unités ci-dessous).
                    </div>
                    {seriesNames.length === 0 && (
                        <p className="text-[10px] text-muted-foreground">
                            Ajoutez un champ Légende ou Valeurs pour voir les
                            séries.
                        </p>
                    )}
                    {seriesNames.map((name) => {
                        const ov = labels.seriesStyles?.[name] ?? {};
                        const patch = (p: Partial<DataLabelSeriesOverride>) => {
                            const next = { ...(labels.seriesStyles ?? {}) };
                            next[name] = {
                                ...labels.seriesStyles?.[name],
                                ...p,
                            };
                            onPatch({ seriesStyles: next });
                        };
                        return (
                            <div
                                key={name}
                                className="rounded border border-border p-2"
                            >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                        {name}
                                    </span>
                                    <ColorInput
                                        value={ov.color ?? labels.font?.color}
                                        onChange={(v) => patch({ color: v })}
                                        className="h-5 w-8"
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <Biu
                                            label="Style de police"
                                            bold={ov.font?.bold}
                                            italic={ov.font?.italic}
                                            underline={ov.font?.underline}
                                            onChange={(p) =>
                                                patch({
                                                    font: {
                                                        ...(ov.font ?? {}),
                                                        ...p,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="w-20">
                                        <NumberInput
                                            label="Taille"
                                            min={8}
                                            max={48}
                                            value={ov.font?.fontSize ?? 9}
                                            onChange={(v) =>
                                                patch({
                                                    font: {
                                                        ...(ov.font ?? {}),
                                                        fontSize: v,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <Select
                label="Position"
                value={labels.position}
                options={LABEL_POSITIONS}
                onChange={(v) => onPatch({ position: v as DataLabelPosition })}
            />
            <Select
                label="Contenu"
                value={labels.content ?? 'value'}
                options={DATA_LABEL_CONTENTS}
                onChange={(v) => onPatch({ content: v as DataLabelContent })}
            />
            <div className="grid grid-cols-2 gap-2">
                <Select
                    label="Unités d'affichage"
                    value={labels.displayUnits}
                    options={DISPLAY_UNITS.map((u) => ({
                        value: u,
                        label: DISPLAY_UNIT_LABELS[u],
                    }))}
                    onChange={(v) =>
                        onPatch({ displayUnits: v as DisplayUnit })
                    }
                />
                <TextInput
                    label="Suffixe"
                    placeholder="ex. kW"
                    value={labels.suffix ?? ''}
                    onChange={(v) => onPatch({ suffix: v.trim() || undefined })}
                />
            </div>
            <NumberInput
                label="Décimales des valeurs"
                min={0}
                max={10}
                value={labels.decimals ?? 1}
                onChange={(v) => onPatch({ decimals: v })}
            />
            {labels.applyTo === 'all' && (
                <FontStyleControls
                    label="Police des étiquettes"
                    font={labels.font}
                    onChange={(p) => onPatch({ font: { ...labels.font, ...p } })}
                />
            )}
        </>
    );
}

/** Pareto cumulative-% line: color + optional data labels persisted on the
 * locked 0–100 % axis (`lineColor` / `lineLabels`). */
function ParetoLineSection({
    axes,
    patchAxisDef,
    seriesNames,
}: {
    axes: AxisDef[];
    patchAxisDef: (axisId: string, patch: Partial<AxisDef>) => void;
    seriesNames: string[];
}) {
    const locked = axes.find((a) => a.lockRange);
    const lineLabels = normalizeDataLabelStyle(locked?.lineLabels);
    const patchLineLabels = (patch: Partial<DataLabelStyle>) => {
        if (!locked) return;
        patchAxisDef(locked.id, {
            lineLabels: { ...lineLabels, ...patch },
        });
    };
    return (
        <Section title="Courbe cumulée">
            <ColorInput
                label="Couleur"
                value={locked?.lineColor ?? 'default'}
                onChange={(v) => {
                    if (!locked) return;
                    patchAxisDef(locked.id, {
                        lineColor: v === 'default' ? undefined : v,
                    });
                }}
            />
            <Toggle
                label="Afficher les étiquettes"
                checked={lineLabels.show}
                onChange={(v) => patchLineLabels({ show: v })}
            />
            {lineLabels.show && (
                <DataLabelsForm
                    labels={lineLabels}
                    onPatch={patchLineLabels}
                    seriesNames={seriesNames}
                />
            )}
            <p className="text-[10px] text-muted-foreground">
                Couleur et étiquettes de la courbe du pourcentage cumulé.
            </p>
        </Section>
    );
}

/** Editor for the value axes of a cartesian visual: one collapsible block
 * per axis with range, format and placement controls. Position options follow
 * the chart orientation (bottom/top for horizontal bars, left/right for
 * vertical columns). */
function ValueAxesSection({
    title,
    axes,
    horizontal,
    patchAxisDef,
    stackedFamily,
    visualId,
}: {
    title: string;
    axes: AxisDef[];
    horizontal: boolean;
    patchAxisDef: (axisId: string, patch: Partial<AxisDef>) => void;
    stackedFamily: boolean;
    visualId: string;
}) {
    const { addValueAxis, removeValueAxis, moveValueAxis } = usePbi();
    return (
        <Section title={title} defaultOpen={axes.length > 1}>
            {axes.map((a, i) => (
                <div
                    key={a.id}
                    className="space-y-1.5 rounded border border-dashed border-border/60 p-2"
                >
                    <div className="flex items-center gap-1">
                        <span className="flex-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                            Axe {i + 1}
                        </span>
                        {axes.length > 1 && (
                            <>
                                <button
                                    onClick={() =>
                                        moveValueAxis(visualId, a.id, -1)
                                    }
                                    disabled={i === 0}
                                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Monter"
                                >
                                    ↑
                                </button>
                                <button
                                    onClick={() =>
                                        moveValueAxis(visualId, a.id, 1)
                                    }
                                    disabled={i === axes.length - 1}
                                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Descendre"
                                >
                                    ↓
                                </button>
                                <button
                                    onClick={() =>
                                        removeValueAxis(visualId, a.id)
                                    }
                                    className="text-muted-foreground hover:text-destructive"
                                    title="Supprimer l'axe"
                                >
                                    ×
                                </button>
                            </>
                        )}
                    </div>
                    <Toggle
                        label="Afficher l'axe"
                        checked={a.showLine || a.showLabels}
                        onChange={(v) =>
                            patchAxisDef(a.id, {
                                showLine: v,
                                showLabels: v,
                            })
                        }
                    />
                    <TextInput
                        label="Titre"
                        value={a.title}
                        placeholder="Aucun"
                        onChange={(v) => patchAxisDef(a.id, { title: v })}
                    />
                    <Toggle
                        label="Afficher le titre"
                        checked={a.showTitle}
                        onChange={(v) =>
                            patchAxisDef(a.id, { showTitle: v })
                        }
                    />
                    <Stepper
                        label="Décalage du titre (px)"
                        value={a.titleOffset ?? 0}
                        min={-40}
                        max={80}
                        onChange={(v) =>
                            patchAxisDef(a.id, { titleOffset: v })
                        }
                    />
                    <Stepper
                        label="Décalage de l'axe (px)"
                        value={a.gap ?? 0}
                        min={-30}
                        max={80}
                        onChange={(v) => patchAxisDef(a.id, { gap: v })}
                    />
                    <Toggle
                        label="Afficher la ligne"
                        checked={a.showLine}
                        onChange={(v) =>
                            patchAxisDef(a.id, { showLine: v })
                        }
                    />
                    <Toggle
                        label="Afficher les valeurs"
                        checked={a.showLabels}
                        onChange={(v) =>
                            patchAxisDef(a.id, { showLabels: v })
                        }
                    />
                    {!a.lockRange && (
                        <>
                            <Toggle
                                label="Échelle automatique"
                                checked={a.auto}
                                onChange={(v) =>
                                    patchAxisDef(a.id, {
                                        auto: v,
                                        ...(v
                                            ? {
                                                  min: undefined,
                                                  max: undefined,
                                              }
                                            : {}),
                                    })
                                }
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <OptionalNumberInput
                                    label="Min"
                                    value={a.min}
                                    onChange={(v) =>
                                        patchAxisDef(a.id, {
                                            min: v,
                                            auto:
                                                v === undefined &&
                                                a.max === undefined,
                                        })
                                    }
                                />
                                <OptionalNumberInput
                                    label="Max"
                                    value={a.max}
                                    onChange={(v) =>
                                        patchAxisDef(a.id, {
                                            max: v,
                                            auto:
                                                v === undefined &&
                                                a.min === undefined,
                                        })
                                    }
                                />
                            </div>
                        </>
                    )}
                    <Select
                        label="Position"
                        value={a.position}
                        options={
                            horizontal
                                ? AXIS_POSITIONS_HORIZONTAL
                                : AXIS_POSITIONS_VERTICAL
                        }
                        onChange={(v) =>
                            patchAxisDef(a.id, {
                                position: v as AxisPosition,
                            })
                        }
                    />
                    <ColorInput
                        label="Couleur"
                        value={a.color || 'default'}
                        onChange={(v) =>
                            patchAxisDef(a.id, {
                                color: v === 'default' ? '' : v,
                            })
                        }
                    />
                    {stackedFamily && (
                        <ColorInput
                            label="Espace vide des barres"
                            value={a.emptyColor ?? STACKED_EMPTY_FILL}
                            onChange={(v) =>
                                patchAxisDef(a.id, {
                                    emptyColor:
                                        v === 'default' ? undefined : v,
                                })
                            }
                        />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <Select
                            label="Format"
                            value={a.numberFormat}
                            options={NUMBER_FORMATS}
                            onChange={(v) =>
                                patchAxisDef(a.id, {
                                    numberFormat: v as NumberFormat,
                                })
                            }
                        />
                        <Select
                            label="Unités"
                            value={a.displayUnits}
                            options={DISPLAY_UNITS.map((u) => ({
                                value: u,
                                label: DISPLAY_UNIT_LABELS[u],
                            }))}
                            onChange={(v) =>
                                patchAxisDef(a.id, {
                                    displayUnits: v as DisplayUnit,
                                })
                            }
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <TextInput
                            label="Suffixe"
                            placeholder="ex. kW"
                            value={a.suffix ?? ''}
                            onChange={(v) =>
                                patchAxisDef(a.id, {
                                    suffix: v.trim() || undefined,
                                })
                            }
                        />
                        <NumberInput
                            label="Décimales"
                            min={0}
                            max={10}
                            value={a.decimals ?? 1}
                            onChange={(v) =>
                                patchAxisDef(a.id, { decimals: v })
                            }
                        />
                    </div>
                    {a.lockRange && (
                        <p className="text-[10px] text-muted-foreground">
                            Échelle verrouillée (0–100 %) pour cet axe.
                        </p>
                    )}
                </div>
            ))}
            <button
                onClick={() => addValueAxis(visualId)}
                className="mt-2 rounded border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground hover:border-brand hover:text-brand"
            >
                + Ajouter un axe
            </button>
        </Section>
    );
}

/** Format tab for the bar/column family: axes, gridlines, bars, data labels,
 * legend, plot area and general. Each section is collapsible. */
export function CartesianFormat({ visual }: { visual: Visual }) {
    const { updateVisual, tables } = usePbi();
    const horizontal = HORIZONTAL_TYPES.includes(visual.type);
    const stackedFamily = STACKED_TYPES.includes(visual.type);
    const xAxis = normalizeAxisStyle(visual.xAxis);
    const yAxis = normalizeAxisStyle(visual.yAxis);
    const gridlines = normalizeGridlinesStyle(visual.gridlines);
    const bars = normalizeBarStyle(visual.bars);
    const dataLabels = normalizeDataLabelStyle(visual.dataLabels);
    const legend = normalizeLegendStyle(visual.legendStyle);
    const plotArea = normalizePlotAreaStyle(visual.plotArea);

    const axes = useMemo(
        () => (visual.axes?.length ? normalizeAxes(visual.axes) : []),
        [visual.axes],
    );
    const setAxes = (next: AxisDef[]) =>
        updateVisual(visual.id, { axes: next });
    const patchAxisDef = (axisId: string, patch: Partial<AxisDef>) =>
        setAxes(axes.map((a) => (a.id === axisId ? { ...a, ...patch } : a)));

    const patchAxis = (key: 'xAxis' | 'yAxis', patch: Partial<AxisStyle>) =>
        updateVisual(visual.id, {
            [key]: { ...(key === 'xAxis' ? xAxis : yAxis), ...patch },
        });
    const patchGridlines = (patch: Partial<GridlinesStyle>) =>
        updateVisual(visual.id, {
            gridlines: { ...gridlines, ...patch },
        });
    const patchBars = (patch: Partial<BarStyle>) =>
        updateVisual(visual.id, { bars: { ...bars, ...patch } });
    const patchDataLabels = (patch: Partial<DataLabelStyle>) =>
        updateVisual(visual.id, {
            dataLabels: { ...dataLabels, ...patch },
        });
    const patchLegend = (patch: Partial<LegendStyle>) =>
        updateVisual(visual.id, { legendStyle: { ...legend, ...patch } });
    const patchPlotArea = (patch: Partial<PlotAreaStyle>) =>
        updateVisual(visual.id, { plotArea: { ...plotArea, ...patch } });

    /** Distinct category values from the visual's axis field. */
    const categories = useMemo(() => {
        const wf = visual.axis[0];
        if (!wf?.name) return [];
        const table =
            tables.find((t) => t.name === wf.table) ??
            tables.find((t) => t.fields.some((f) => f.name === wf.name));
        if (!table) return [];
        return distinctValues(wf.name, table.rows);
    }, [visual.axis, tables]);

    const hasLegendField = visual.legend.length > 0;

    /** Series names as `buildChartData` renders them: distinct legend values,
     * or the value fields' measure labels when no legend field is set. */
    const seriesNames = useMemo(() => {
        const wf = visual.legend[0] ?? visual.values[0];
        if (!wf?.name) return [];
        const table =
            tables.find((t) => t.name === wf.table) ??
            tables.find((t) => t.fields.some((f) => f.name === wf.name));
        if (!table) return [];
        return hasLegendField
            ? distinctValues(visual.legend[0]!.name, table.rows)
            : visual.values.map(measureLabel);
    }, [visual.legend, visual.values, hasLegendField, tables]);

    return (
        <div className="space-y-3 text-[11px]">
            <TitleSection
                visual={visual}
                onPatch={(p) => updateVisual(visual.id, p)}
            />

            {axes.length > 0 ? (
                horizontal ? (
                    <>
                        <ValueAxesSection
                            title="Axe X"
                            axes={axes}
                            horizontal={horizontal}
                            patchAxisDef={patchAxisDef}
                            stackedFamily={stackedFamily}
                            visualId={visual.id}
                        />
                        {visual.type === 'pareto' && (
                            <ParetoLineSection
                                axes={axes}
                                patchAxisDef={patchAxisDef}
                                seriesNames={seriesNames}
                            />
                        )}
                        <AxisSection
                            title="Axe Y"
                            axis={yAxis}
                            isValue={false}
                            onPatch={(p) => patchAxis('yAxis', p)}
                        />
                    </>
                ) : (
                    <>
                        <AxisSection
                            title="Axe X"
                            axis={xAxis}
                            isValue={false}
                            onPatch={(p) => patchAxis('xAxis', p)}
                        />
                        {visual.type === 'pareto' && (
                            <ParetoLineSection
                                axes={axes}
                                patchAxisDef={patchAxisDef}
                                seriesNames={seriesNames}
                            />
                        )}
                        <ValueAxesSection
                            title="Axe Y"
                            axes={axes}
                            horizontal={horizontal}
                            patchAxisDef={patchAxisDef}
                            stackedFamily={stackedFamily}
                            visualId={visual.id}
                        />
                    </>
                )
            ) : (
                <>
                    <AxisSection
                        title="Axe X"
                        axis={xAxis}
                        isValue={horizontal}
                        showEmptyFill={stackedFamily && horizontal}
                        onPatch={(p) => patchAxis('xAxis', p)}
                    />
                    {visual.type === 'pareto' && (
                        <ParetoLineSection
                            axes={axes}
                            patchAxisDef={patchAxisDef}
                            seriesNames={seriesNames}
                        />
                    )}
                    <AxisSection
                        title="Axe Y"
                        axis={yAxis}
                        isValue={!horizontal}
                        showEmptyFill={stackedFamily && !horizontal}
                        onPatch={(p) => patchAxis('yAxis', p)}
                    />
                </>
            )}

            <Section title="Repères">
                <Toggle
                    label="Horizontal"
                    checked={gridlines.horizontal}
                    onChange={(v) => patchGridlines({ horizontal: v })}
                />
                <Toggle
                    label="Vertical"
                    checked={gridlines.vertical}
                    onChange={(v) => patchGridlines({ vertical: v })}
                />
                <ColorInput
                    label="Couleur"
                    value={gridlines.color}
                    onChange={(v) => patchGridlines({ color: v })}
                />
                <Select
                    label="Style"
                    value={gridlines.style}
                    options={GRIDLINE_STYLES}
                    onChange={(v) =>
                        patchGridlines({ style: v as GridlineStyle })
                    }
                />
            </Section>

            <Section title="Barres" defaultOpen>
                <Select
                    label="Appliquer les réglages à"
                    value={bars.applyTo}
                    options={[
                        { value: 'all', label: 'Toutes les catégories' },
                        { value: 'perCategory', label: 'Par catégorie' },
                    ]}
                    onChange={(v) =>
                        patchBars({
                            applyTo: v as BarStyle['applyTo'],
                        })
                    }
                />
                {bars.applyTo === 'all' && (
                    <ColorInput
                        label="Couleur"
                        value={bars.color}
                        onChange={(v) => patchBars({ color: v })}
                    />
                )}
                {bars.applyTo === 'perCategory' && (
                    <div className="space-y-2">
                        <div className="text-muted-foreground">
                            Couleurs de catégorie — laissez vide pour garder la
                            couleur de la palette.
                        </div>
                        {categories.length === 0 && (
                            <p className="text-[10px] text-muted-foreground">
                                Ajoutez un champ sur l'axe X pour voir les
                                catégories.
                            </p>
                        )}
                        {categories.map((cat) => (
                            <div key={cat} className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 truncate">
                                    {cat}
                                </span>
                                <ColorInput
                                    value={bars.categoryColors[cat]}
                                    onChange={(v) => {
                                        const next = {
                                            ...bars.categoryColors,
                                        };
                                        next[cat] = v;
                                        patchBars({ categoryColors: next });
                                    }}
                                    className="h-6 w-9"
                                />
                            </div>
                        ))}
                    </div>
                )}
                <div className="rounded border border-border">
                    <ConditionalFormatControl visual={visual} />
                </div>
                <div>
                    <div className="mb-1 flex items-center justify-between text-muted-foreground">
                        <span>Transparence</span>
                        <span className="tabular-nums">
                            {bars.transparency}%
                        </span>
                    </div>
                    <Slider
                        value={[bars.transparency]}
                        max={100}
                        step={1}
                        onValueChange={([v]) =>
                            patchBars({ transparency: v ?? 0 })
                        }
                        aria-label="Transparence des barres"
                    />
                </div>
                <NumberInput
                    label="Rayon des coins (px)"
                    min={0}
                    max={24}
                    value={bars.radius ?? 2}
                    onChange={(v) => patchBars({ radius: v })}
                />
            </Section>

            <Section title="Étiquettes de données">
                <Toggle
                    label="Afficher les étiquettes"
                    checked={dataLabels.show}
                    onChange={(v) =>
                        updateVisual(visual.id, {
                            showLabels: v,
                            dataLabels: { ...dataLabels, show: v },
                        })
                    }
                />
                {dataLabels.show && (
                    <DataLabelsForm
                        labels={dataLabels}
                        onPatch={patchDataLabels}
                        seriesNames={seriesNames}
                    />
                )}
            </Section>

            <Section title="Légende">
                <Toggle
                    label="Afficher la légende"
                    checked={legend.show}
                    onChange={(v) =>
                        updateVisual(visual.id, {
                            showLegend: v,
                            legendStyle: { ...legend, show: v },
                        })
                    }
                />
                {legend.show && (
                    <>
                        <Select
                            label="Position"
                            value={legend.position}
                            options={LEGEND_POSITIONS}
                            onChange={(v) =>
                                patchLegend({
                                    position: v as LegendPosition,
                                })
                            }
                        />
                        <FontStyleControls
                            label="Police de la légende"
                            font={legend.font}
                            onChange={(p) =>
                                patchLegend({ font: { ...legend.font, ...p } })
                            }
                        />
                        {!hasLegendField && (
                            <p className="text-[10px] text-muted-foreground">
                                Ajoutez un champ Légende pour afficher la
                                légende.
                            </p>
                        )}
                    </>
                )}
            </Section>

            <Section title="Zone de tracé">
                <ColorInput
                    label="Arrière-plan"
                    value={plotArea.background}
                    onChange={(v) => patchPlotArea({ background: v })}
                />
                <Toggle
                    label="Bordure"
                    checked={plotArea.border}
                    onChange={(v) => patchPlotArea({ border: v })}
                />
                {plotArea.border && (
                    <div className="grid grid-cols-2 gap-2">
                        <ColorInput
                            label="Couleur de bordure"
                            value={plotArea.borderColor}
                            onChange={(v) => patchPlotArea({ borderColor: v })}
                        />
                        <NumberInput
                            label="Épaisseur de bordure"
                            min={1}
                            max={8}
                            value={plotArea.borderWidth ?? 1}
                            onChange={(v) => patchPlotArea({ borderWidth: v })}
                        />
                    </div>
                )}
            </Section>

            <Section title="Général">
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
                <Toggle
                    label="Ombre"
                    checked={visual.shadow}
                    onChange={(v) => updateVisual(visual.id, { shadow: v })}
                />
                <TextInput
                    label="Texte alternatif (accessibilité)"
                    value={visual.altText}
                    onChange={(v) => updateVisual(visual.id, { altText: v })}
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
                            onChange={(v) =>
                                updateVisual(visual.id, { [k]: v })
                            }
                        />
                    ))}
                </div>
            </Section>
        </div>
    );
}
