// Report themes: named palettes that drive the chart CSS variables
// (`--chart-1..8`) plus an optional report font. Themes are applied at the
// canvas root so every visual re-colors instantly, and saved themes live in
// the layout state alongside the built-in registry.

export type ReportTheme = {
    id: string;
    name: string;
    /** exactly 8 colors; maps to `--chart-1..8` */
    palette: string[];
    fontFamily?: string;
};

export const THEME_COLOR_COUNT = 8;

export const THEMES: ReportTheme[] = [
    {
        id: 'default',
        name: 'Défaut',
        palette: [
            'oklch(0.62 0.17 70)',
            'oklch(0.62 0.17 145)',
            'oklch(0.58 0.22 25)',
            'oklch(0.55 0.15 230)',
            'oklch(0.65 0.14 300)',
            'oklch(0.7 0.12 180)',
            'oklch(0.6 0.1 10)',
            'oklch(0.55 0.08 260)',
        ],
    },
    {
        id: 'ocean',
        name: 'Océan',
        palette: [
            'oklch(0.6 0.13 220)',
            'oklch(0.55 0.16 245)',
            'oklch(0.72 0.12 190)',
            'oklch(0.48 0.14 265)',
            'oklch(0.75 0.09 175)',
            'oklch(0.42 0.12 285)',
            'oklch(0.66 0.14 210)',
            'oklch(0.8 0.08 160)',
        ],
    },
    {
        id: 'forest',
        name: 'Forêt',
        palette: [
            'oklch(0.55 0.13 145)',
            'oklch(0.62 0.12 120)',
            'oklch(0.48 0.15 165)',
            'oklch(0.7 0.13 105)',
            'oklch(0.42 0.12 175)',
            'oklch(0.75 0.11 95)',
            'oklch(0.58 0.14 130)',
            'oklch(0.8 0.1 85)',
        ],
    },
    {
        id: 'sunset',
        name: 'Coucher de soleil',
        palette: [
            'oklch(0.62 0.17 45)',
            'oklch(0.66 0.16 65)',
            'oklch(0.58 0.19 25)',
            'oklch(0.7 0.14 50)',
            'oklch(0.55 0.2 10)',
            'oklch(0.76 0.12 55)',
            'oklch(0.64 0.18 35)',
            'oklch(0.82 0.1 60)',
        ],
    },
    {
        id: 'monochrome',
        name: 'Monochrome',
        palette: [
            'oklch(0.45 0.01 0)',
            'oklch(0.55 0.01 0)',
            'oklch(0.62 0.01 0)',
            'oklch(0.7 0.01 0)',
            'oklch(0.78 0.01 0)',
            'oklch(0.4 0.01 0)',
            'oklch(0.85 0.01 0)',
            'oklch(0.32 0.01 0)',
        ],
    },
];

export function themeById(id: string | undefined): ReportTheme {
    return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Flattens a theme into the CSS custom-property map used by the canvas. */
export function themeCssVars(theme: ReportTheme): Record<string, string> {
    const vars: Record<string, string> = {};
    theme.palette.forEach((color, i) => {
        vars[`--chart-${i + 1}`] = color;
    });
    if (theme.fontFamily) vars['--chart-font'] = theme.fontFamily;
    return vars;
}

export function isValidPalette(palette: string[]): boolean {
    return (
        Array.isArray(palette) &&
        palette.length === THEME_COLOR_COUNT &&
        palette.every((c) => typeof c === 'string' && c.trim().length > 0)
    );
}
