import {
    PAGE_PRESETS,
    defaultAxes,
    defaultGaugeStyle,
    fieldType,
    findTableForField,
    isMeasure,
    lockedPctAxis,
    measureColumnRefs,
    normalizeWellField,
    visualTable,
    type Agg,
    type Page,
    type PageFormat,
    type TableDef,
    type Visual,
    type VisualType,
    type WellField,
} from '../model';
import { CARTESIAN_TYPES, visualTypeLabel } from './consts';

let seq = 0;
export function uid(prefix = 'v') {
    seq += 1;
    return `${prefix}${Date.now().toString(36)}${seq}`;
}

let zTop = 100;
export function takeZTop(floor = 0): number {
    if (floor >= zTop) zTop = floor;
    zTop += 1;
    return zTop;
}

export function wf(
    name: unknown,
    table?: string,
    agg: Agg = 'sum',
    label?: string,
): WellField {
    const reference = normalizeWellField({ name, table, agg, label }, table);
    if (!reference) throw new Error('Invalid PBI field reference');
    const resolvedName = reference.name;
    const resolved = isMeasure(resolvedName)
        ? 'Measures'
        : (reference.table ?? findTableForField(resolvedName));
    return {
        table: resolved,
        name: resolvedName,
        agg: fieldType(resolvedName, resolved) === 'number' ? agg : 'count',
        ...(reference.label ? { label: reference.label } : {}),
    };
}

export const defaultPageFormat = (): PageFormat => ({
    preset: '16:9',
    width: PAGE_PRESETS[0]!.width,
    height: PAGE_PRESETS[0]!.height,
    background: 'var(--card)',
    wallpaper: 'var(--muted)',
    tooltip: false,
    hidden: false,
});

/** Field keys of a visual that can carry measure fields. */
function visualMeasureFields(visual: Visual): WellField[] {
    return (
        [
            'axis',
            'legend',
            'values',
            'tooltips',
            'smallMultiples',
            'drillFields',
            'minimum',
            'maximum',
            'target',
        ] as const
    ).flatMap((key) => {
        const value = (visual as Record<string, unknown>)[key];
        return Array.isArray(value) ? (value as WellField[]) : [];
    });
}

/**
 * The dataset a visual should read its rows from. For visuals whose wells
 * reference only measures, falls back to the first table referenced by the
 * bound measure expressions instead of the first endpoint dataset.
 */
export function visualDataTable(
    visual: Visual,
    measures: { name: string; expression?: string }[],
): string {
    const primary = visualTable(visual);
    if (primary && primary !== 'Measures') return primary;

    const bound = new Set(
        visualMeasureFields(visual)
            .filter((f) => f.table === 'Measures' || isMeasure(f.name))
            .map((f) => f.name),
    );
    for (const m of measures) {
        if (!bound.has(m.name) || !m.expression) continue;
        for (const ref of measureColumnRefs(m.expression)) {
            const table = ref.table || findTableForField(ref.column);
            if (table && table !== 'Measures') return table;
        }
    }
    return primary;
}

export function mkVisual(
    type: VisualType,
    x: number,
    y: number,
    w: number,
    h: number,
    init: Partial<Visual> = {},
): Visual {
    return {
        id: uid(),
        type,
        name: init.name ?? init.title ?? visualTypeLabel(type),
        title: init.title ?? '',
        x,
        y,
        w,
        h,
        z: takeZTop(),
        hidden: false,
        axis: [],
        legend: [],
        values: [],
        tooltips: [],
        smallMultiples: [],
        drillFields: [],
        minimum: [],
        maximum: [],
        target: [],
        showTitle: true,
        showLegend: true,
        showLabels: false,
        background: 'var(--card)',
        border: true,
        shadow: false,
        altText: '',
        colorIndex: 0,
        analytics: [],
        conditionalFormat: false,
        subtotals: true,
        drillLevel: 0,
        maxCategories: 200,
        rotation: 0,
        ...(CARTESIAN_TYPES.includes(type) ? cartesianStyleDefaults() : {}),
        ...(type === 'pareto' ? paretoStyleDefaults() : {}),
        ...(type === 'gauge' ? gaugeStyleDefaults() : {}),
        ...init,
    };
}

/** Default cartesian style blocks for new bar/column visuals. */
function cartesianStyleDefaults(): Partial<Visual> {
    return {
        xAxis: {
            show: true,
            title: '',
            displayUnits: 'auto',
        },
        yAxis: {
            show: true,
            title: '',
            displayUnits: 'auto',
        },
        axes: defaultAxes(),
        seriesType: 'auto',
        gridlines: {
            horizontal: true,
            vertical: false,
            color: 'var(--border)',
            style: 'solid',
        },
        bars: {
            applyTo: 'all',
            categoryColors: {},
            transparency: 0,
        },
        dataLabels: {
            show: false,
            applyTo: 'all',
            position: 'auto',
            content: 'value',
            displayUnits: 'auto',
            decimals: 1,
        },
        legendStyle: {
            show: true,
            position: 'top',
            font: { fontSize: 10 },
        },
        plotArea: {
            border: false,
            borderWidth: 1,
        },
    };
}

/** Default pareto style block: a primary left axis for the bars + a locked
 * right-side 0–100 % axis for the cumulative line. */
function paretoStyleDefaults(): Partial<Visual> {
    return {
        axes: [defaultAxes()[0], lockedPctAxis()],
    };
}

/** Default gauge style block for new gauge visuals. */
function gaugeStyleDefaults(): Partial<Visual> {
    return {
        gauge: defaultGaugeStyle(),
    };
}

export const defaultVisuals = (tables: TableDef[]): Visual[] => {
    const primary = tables[0];
    if (!primary) return [];
    const numCols = primary.fields.filter((f) => f.type === 'number');
    const textCols = primary.fields.filter((f) => f.type === 'text');
    const dateCols = primary.fields.filter((f) => f.type === 'date');
    const by = (textCols[0] ?? dateCols[0] ?? numCols[1])?.name;
    const val = numCols[0]?.name;

    const out: Visual[] = [];
    if (val) {
        out.push(
            mkVisual('card', 16, 16, 250, 120, {
                values: [wf(val, primary.name)],
                title: val,
                name: `Carte — ${val}`,
                z: 1,
            }),
        );
    }
    if (by && val) {
        out.push(
            mkVisual('column', 16, 148, 512, 260, {
                axis: [wf(by, primary.name)],
                values: [wf(val, primary.name)],
                title: `${val} par ${by}`,
                name: `Histogramme — ${val} par ${by}`,
                z: 3,
            }),
        );
        out.push(
            mkVisual('buttonSlicer', 540, 16, 460, 120, {
                axis: [wf(by, primary.name)],
                title: by,
                name: `Segmenteur — ${by}`,
                z: 4,
            }),
        );
    }
    return out;
};

export const mkPage = (
    id: string,
    name: string,
    visuals: Visual[] = [],
): Page => ({
    id,
    name,
    visuals,
    format: defaultPageFormat(),
    mobile: {},
    tabOrder: visuals.map((v) => v.id),
});