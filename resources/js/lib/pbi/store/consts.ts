import type { RelativePreset } from '../filters';
import type { VisualType } from '../model';

export type WellName =
    | 'axis'
    | 'legend'
    | 'values'
    | 'tooltips'
    | 'smallMultiples'
    | 'drillFields'
    | 'minimum'
    | 'maximum'
    | 'target';

export function defaultDropWell(type: VisualType): WellName {
    return [
        'slicer',
        'buttonSlicer',
        'dropdownSlicer',
        'inputSlicer',
        'dateSlicer',
    ].includes(type)
        ? 'axis'
        : 'values';
}

export function isSlicerType(type: VisualType): boolean {
    return [
        'slicer',
        'buttonSlicer',
        'dropdownSlicer',
        'inputSlicer',
        'dateSlicer',
    ].includes(type);
}

export type SlicerDateMode = 'between' | 'before' | 'after' | 'relative';

export type SlicerDateRange = {
    mode?: SlicerDateMode;
    from?: string;
    to?: string;
    relative?: RelativePreset;
};

export type PaneName =
    | 'filters'
    | 'visualizations'
    | 'data'
    | 'selection'
    | 'bookmarks'
    | 'syncSlicers'
    | 'analytics'
    | 'themes';

export const VISUAL_TYPE_LABELS: Record<string, string> = {
    column: 'Histogramme groupé',
    stackedColumn: 'Histogramme empilé',
    stacked100Column: 'Histogramme empilé 100 %',
    bar: 'Barres groupées',
    stackedBar: 'Barres empilées',
    stacked100Bar: 'Barres empilées 100 %',
    line: 'Courbe',
    area: 'Aire',
    stackedArea: 'Aire empilée',
    combo: 'Courbe et histogramme empilé',
    pareto: 'Pareto',
    ribbon: 'Ruban',
    waterfall: 'Cascade',
    pie: 'Secteurs',
    donut: 'Anneau',
    treemap: 'Treemap',
    funnel: 'Entonnoir',
    scatter: 'Nuage de points',
    bubble: 'Nuage de points (bulles)',
    card: 'Carte',
    gauge: 'Jauge',
    table: 'Tableau',
    matrix: 'Matrice',
    slicer: 'Segmenteur (cases à cocher)',
    buttonSlicer: 'Segmenteur de boutons',
    dropdownSlicer: 'Segmenteur déroulant',
    inputSlicer: 'Segmenteur de saisie',
    dateSlicer: 'Segmenteur de dates',
    map: 'Carte',
    filledMap: 'Carte remplie',
    shapeMap: 'Carte de formes',
    decompositionTree: 'Arbre de décomposition',
    keyInfluencers: 'Facteurs d’influence',
    smartNarrative: 'Récit dynamique',
    qna: 'Q&A',
    rVisual: 'Visuel R',
    pythonVisual: 'Visuel Python',
    text: 'Zone de texte',
    image: 'Image',
    button: 'Bouton',
    clock: 'Horloge',
    shape: 'Forme',
};

export function visualTypeLabel(type: VisualType) {
    return (
        VISUAL_TYPE_LABELS[type] ??
        type
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (c) => c.toUpperCase())
            .trim()
    );
}

export const WELL_KEYS = [
    'axis',
    'legend',
    'values',
    'tooltips',
    'smallMultiples',
    'drillFields',
    'minimum',
    'maximum',
    'target',
] as const;

export const CARTESIAN_TYPES: VisualType[] = [
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
    'pareto',
];
