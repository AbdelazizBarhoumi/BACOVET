import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import {
    DISPLAY_UNITS,
    distinctValues,
    measureLabel,
    normalizeAxisStyle,
    normalizeBarStyle,
    normalizeDataLabelStyle,
    normalizeGridlinesStyle,
    normalizeLegendStyle,
    normalizePlotAreaStyle,
    type AxisStyle,
    type BarStyle,
    type DataLabelPosition,
    type DataLabelSeriesOverride,
    type DataLabelStyle,
    type DisplayUnit,
    type GridlineStyle,
    type GridlinesStyle,
    type LegendPosition,
    type LegendStyle,
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
    TextInput,
    TitleSection,
    Toggle,
} from './formatControls';

/** Horizontal (bar) family — the value axis sits on X, categories on Y. */
const HORIZONTAL_TYPES = ['bar', 'stackedBar', 'stacked100Bar'];

const DISPLAY_UNIT_LABELS: Record<DisplayUnit, string> = {
    auto: 'Auto',
    none: 'None',
    thousands: 'Thousands (K)',
    millions: 'Millions (M)',
    billions: 'Billions (B)',
    percent: 'Percent (%)',
    currency: 'Currency ($)',
};

const LABEL_POSITIONS: {
    value: DataLabelPosition;
    label: string;
}[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'insideEnd', label: 'Inside end' },
    { value: 'outsideEnd', label: 'Outside end' },
    { value: 'insideCenter', label: 'Inside center' },
    { value: 'insideBase', label: 'Inside base' },
];

const GRIDLINE_STYLES: { value: GridlineStyle; label: string }[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
];

const LEGEND_POSITIONS: { value: LegendPosition; label: string }[] = [
    { value: 'top', label: 'Top' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
];

/** One axis section. Numeric-axis-only controls (units, range) render only
 * when the axis is the value axis. */
function AxisSection({
    title,
    axis,
    isValue,
    onPatch,
}: {
    title: string;
    axis: AxisStyle;
    isValue: boolean;
    onPatch: (patch: Partial<AxisStyle>) => void;
}) {
    return (
        <Section title={title}>
            <Toggle
                label="Show axis"
                checked={axis.show}
                onChange={(v) => onPatch({ show: v })}
            />
            {axis.show && (
                <>
                    <TextInput
                        label="Title"
                        value={axis.title ?? ''}
                        placeholder="None"
                        onChange={(v) => onPatch({ title: v })}
                    />
                    <FontStyleControls
                        label="Title font"
                        font={axis.titleFont}
                        onChange={(p) => onPatch({ titleFont: p })}
                    />
                    <FontStyleControls
                        label="Values font"
                        font={axis.labelsFont}
                        onChange={(p) => onPatch({ labelsFont: p })}
                    />
                    {isValue && (
                        <>
                            <Select
                                label="Display units"
                                value={axis.displayUnits}
                                options={DISPLAY_UNITS.map((u) => ({
                                    value: u,
                                    label: DISPLAY_UNIT_LABELS[u],
                                }))}
                                onChange={(v) =>
                                    onPatch({ displayUnits: v as DisplayUnit })
                                }
                            />
                            <NumberInput
                                label="Value decimal places"
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
                        </>
                    )}
                </>
            )}
        </Section>
    );
}

/** Format tab for the bar/column family: axes, gridlines, bars, data labels,
 * legend, plot area and general. Each section is collapsible. */
export function CartesianFormat({ visual }: { visual: Visual }) {
    const { updateVisual, tables } = usePbi();
    const horizontal = HORIZONTAL_TYPES.includes(visual.type);
    const xAxis = normalizeAxisStyle(visual.xAxis);
    const yAxis = normalizeAxisStyle(visual.yAxis);
    const gridlines = normalizeGridlinesStyle(visual.gridlines);
    const bars = normalizeBarStyle(visual.bars);
    const dataLabels = normalizeDataLabelStyle(visual.dataLabels);
    const legend = normalizeLegendStyle(visual.legendStyle);
    const plotArea = normalizePlotAreaStyle(visual.plotArea);

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

            <AxisSection
                title="X-axis"
                axis={xAxis}
                isValue={horizontal}
                onPatch={(p) => patchAxis('xAxis', p)}
            />
            <AxisSection
                title="Y-axis"
                axis={yAxis}
                isValue={!horizontal}
                onPatch={(p) => patchAxis('yAxis', p)}
            />

            <Section title="Gridlines">
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
                    label="Color"
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

            <Section title="Bars" defaultOpen>
                <Select
                    label="Apply settings to"
                    value={bars.applyTo}
                    options={[
                        { value: 'all', label: 'All categories' },
                        { value: 'perCategory', label: 'Per category' },
                    ]}
                    onChange={(v) =>
                        patchBars({
                            applyTo: v as BarStyle['applyTo'],
                        })
                    }
                />
                {bars.applyTo === 'all' && (
                    <ColorInput
                        label="Color"
                        value={bars.color}
                        onChange={(v) => patchBars({ color: v })}
                    />
                )}
                {bars.applyTo === 'perCategory' && (
                    <div className="space-y-2">
                        <div className="text-muted-foreground">
                            Category colors — empty keeps the palette color.
                        </div>
                        {categories.length === 0 && (
                            <p className="text-[10px] text-muted-foreground">
                                Add an X-axis field to see categories.
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
                        <span>Transparency</span>
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
                        aria-label="Bar transparency"
                    />
                </div>
                <NumberInput
                    label="Corner radius (px)"
                    min={0}
                    max={24}
                    value={bars.radius ?? 2}
                    onChange={(v) => patchBars({ radius: v })}
                />
            </Section>

            <Section title="Data labels">
                <Toggle
                    label="Show labels"
                    checked={dataLabels.show}
                    onChange={(v) =>
                        updateVisual(visual.id, {
                            showLabels: v,
                            dataLabels: { ...dataLabels, show: v },
                        })
                    }
                />
                {dataLabels.show && (
                    <>
                        <Select
                            label="Apply settings to"
                            value={dataLabels.applyTo}
                            options={[
                                { value: 'all', label: 'All series' },
                                { value: 'perSeries', label: 'Per series' },
                            ]}
                            onChange={(v) =>
                                patchDataLabels({
                                    applyTo: v as DataLabelStyle['applyTo'],
                                })
                            }
                        />
                        {dataLabels.applyTo === 'perSeries' && (
                            <div className="space-y-2">
                                <div className="text-muted-foreground">
                                    Series overrides — empty keeps the shared
                                    label style below.
                                </div>
                                {seriesNames.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground">
                                        Add a Legend or Values field to see
                                        series.
                                    </p>
                                )}
                                {seriesNames.map((name) => {
                                    const ov =
                                        dataLabels.seriesStyles?.[name] ?? {};
                                    const patch = (
                                        p: Partial<DataLabelSeriesOverride>,
                                    ) => {
                                        const next = {
                                            ...(dataLabels.seriesStyles ?? {}),
                                        };
                                        next[name] = {
                                            ...dataLabels.seriesStyles?.[name],
                                            ...p,
                                        };
                                        patchDataLabels({
                                            seriesStyles: next,
                                        });
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
                                                    value={
                                                        ov.color ??
                                                        dataLabels.font?.color
                                                    }
                                                    onChange={(v) =>
                                                        patch({ color: v })
                                                    }
                                                    className="h-5 w-8"
                                                />
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <Biu
                                                        label="Font style"
                                                        bold={ov.font?.bold}
                                                        italic={ov.font?.italic}
                                                        underline={
                                                            ov.font?.underline
                                                        }
                                                        onChange={(p) =>
                                                            patch({
                                                                font: {
                                                                    ...(ov.font ??
                                                                        {}),
                                                                    ...p,
                                                                },
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="w-20">
                                                    <NumberInput
                                                        label="Size"
                                                        min={8}
                                                        max={48}
                                                        value={
                                                            ov.font?.fontSize ??
                                                            9
                                                        }
                                                        onChange={(v) =>
                                                            patch({
                                                                font: {
                                                                    ...(ov.font ??
                                                                        {}),
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
                            value={dataLabels.position}
                            options={LABEL_POSITIONS}
                            onChange={(v) =>
                                patchDataLabels({
                                    position: v as DataLabelPosition,
                                })
                            }
                        />
                        <Select
                            label="Display units"
                            value={dataLabels.displayUnits}
                            options={DISPLAY_UNITS.map((u) => ({
                                value: u,
                                label: DISPLAY_UNIT_LABELS[u],
                            }))}
                            onChange={(v) =>
                                patchDataLabels({
                                    displayUnits: v as DisplayUnit,
                                })
                            }
                        />
                        <NumberInput
                            label="Value decimal places"
                            min={0}
                            max={10}
                            value={dataLabels.decimals ?? 1}
                            onChange={(v) => patchDataLabels({ decimals: v })}
                        />
                        <FontStyleControls
                            label="Label font"
                            font={dataLabels.font}
                            onChange={(p) => patchDataLabels({ font: p })}
                        />
                    </>
                )}
            </Section>

            <Section title="Legend">
                <Toggle
                    label="Show legend"
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
                            label="Legend font"
                            font={legend.font}
                            onChange={(p) => patchLegend({ font: p })}
                        />
                        {!hasLegendField && (
                            <p className="text-[10px] text-muted-foreground">
                                Add a Legend field to show the legend.
                            </p>
                        )}
                    </>
                )}
            </Section>

            <Section title="Plot area">
                <ColorInput
                    label="Background"
                    value={plotArea.background}
                    onChange={(v) => patchPlotArea({ background: v })}
                />
                <Toggle
                    label="Border"
                    checked={plotArea.border}
                    onChange={(v) => patchPlotArea({ border: v })}
                />
                {plotArea.border && (
                    <div className="grid grid-cols-2 gap-2">
                        <ColorInput
                            label="Border color"
                            value={plotArea.borderColor}
                            onChange={(v) => patchPlotArea({ borderColor: v })}
                        />
                        <NumberInput
                            label="Border width"
                            min={1}
                            max={8}
                            value={plotArea.borderWidth ?? 1}
                            onChange={(v) => patchPlotArea({ borderWidth: v })}
                        />
                    </div>
                )}
            </Section>

            <Section title="General">
                <ColorInput
                    label="Background"
                    value={visual.background}
                    onChange={(v) => updateVisual(visual.id, { background: v })}
                />
                <Toggle
                    label="Border"
                    checked={visual.border}
                    onChange={(v) => updateVisual(visual.id, { border: v })}
                />
                <Toggle
                    label="Shadow"
                    checked={visual.shadow}
                    onChange={(v) => updateVisual(visual.id, { shadow: v })}
                />
                <TextInput
                    label="Alt text (accessibility)"
                    value={visual.altText}
                    onChange={(v) => updateVisual(visual.id, { altText: v })}
                />
                <div className="grid grid-cols-2 gap-2">
                    {(['x', 'y', 'w', 'h'] as const).map((k) => (
                        <NumberInput
                            key={k}
                            label={
                                k === 'w'
                                    ? 'Width'
                                    : k === 'h'
                                      ? 'Height'
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
