import {
    CalendarLtrRegular,
    NumberSymbolRegular,
    TextCaseTitleRegular,
    ToggleLeftRegular,
} from '@fluentui/react-icons';

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

export type IconComponent = React.ComponentType<{ className?: string }>;

// Office chart-gallery palette (Excel/PowerPoint "Insert Chart" colors) —
// hardcoded, not currentColor, so these read as live chart thumbnails
// rather than themed UI glyphs. Same across light/dark mode, like Office's
// own gallery.
export const CHART_COLORS = {
    blue: '#4472C4',
    orange: '#ED7D31',
    gray: '#A5A5A5',
    gold: '#FFC000',
} as const;

export function chartPreviewIcon(paths: React.ReactNode): IconComponent {
    return function Icon({ className }: { className?: string }) {
        return (
            <svg
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
            >
                {paths}
            </svg>
        );
    };
}

export const IconColumnPreview = chartPreviewIcon(
    <>
        <rect x="2" y="10" width="2" height="7" fill={CHART_COLORS.blue} />
        <rect x="4.3" y="6" width="2" height="11" fill={CHART_COLORS.orange} />
        <rect x="7.3" y="4" width="2" height="13" fill={CHART_COLORS.blue} />
        <rect x="9.6" y="9" width="2" height="8" fill={CHART_COLORS.orange} />
        <rect x="12.6" y="7" width="2" height="10" fill={CHART_COLORS.blue} />
        <rect x="14.9" y="2" width="2" height="15" fill={CHART_COLORS.orange} />
    </>,
);

export const IconStackedColumnPreview = chartPreviewIcon(
    <>
        <rect x="3" y="10" width="3" height="7" fill={CHART_COLORS.blue} />
        <rect x="8.5" y="2" width="3" height="15" fill={CHART_COLORS.orange} />
        <rect x="14" y="5" width="3" height="12" fill={CHART_COLORS.gray} />
    </>,
);

export const IconStacked100ColumnPreview = chartPreviewIcon(
    <>
        <rect x="3" y="9" width="3" height="8" fill={CHART_COLORS.blue} />
        <rect x="3" y="5" width="3" height="4" fill={CHART_COLORS.orange} />
        <rect x="3" y="3" width="3" height="2" fill={CHART_COLORS.gray} />
        <rect x="8.5" y="12" width="3" height="5" fill={CHART_COLORS.blue} />
        <rect x="8.5" y="6" width="3" height="6" fill={CHART_COLORS.orange} />
        <rect x="8.5" y="3" width="3" height="3" fill={CHART_COLORS.gray} />
        <rect x="14" y="7" width="3" height="10" fill={CHART_COLORS.blue} />
        <rect x="14" y="4" width="3" height="3" fill={CHART_COLORS.orange} />
        <rect x="14" y="3" width="3" height="1" fill={CHART_COLORS.gray} />
    </>,
);

export const IconBarPreview = chartPreviewIcon(
    <>
        <rect x="3" y="3" width="8" height="1.8" fill={CHART_COLORS.blue} />
        <rect
            x="3"
            y="5.2"
            width="13"
            height="1.8"
            fill={CHART_COLORS.orange}
        />
        <rect x="3" y="8" width="12" height="1.8" fill={CHART_COLORS.blue} />
        <rect
            x="3"
            y="10.2"
            width="6"
            height="1.8"
            fill={CHART_COLORS.orange}
        />
        <rect x="3" y="13" width="5" height="1.8" fill={CHART_COLORS.blue} />
        <rect
            x="3"
            y="15.2"
            width="10"
            height="1.8"
            fill={CHART_COLORS.orange}
        />
    </>,
);

export const IconLinePreview = chartPreviewIcon(
    <>
        <polyline
            points="2,14 6,8 10,11 14,5 18,9"
            fill="none"
            stroke={CHART_COLORS.blue}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <polyline
            points="2,10 6,13 10,6 14,10 18,4"
            fill="none"
            stroke={CHART_COLORS.orange}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </>,
);

export const IconAreaPreview = chartPreviewIcon(
    <>
        <path
            d="M2 17v-6l3-3 3 2 4-4 4 3v8Z"
            fill={CHART_COLORS.blue}
            fillOpacity={0.85}
        />
        <path
            d="M2 17v-3l3-3 3 2 4-3.5 4 2.5v5Z"
            fill={CHART_COLORS.orange}
            fillOpacity={0.9}
        />
    </>,
);

export const IconPiePreview = chartPreviewIcon(
    <>
        <path
            d="M10 10 L10 2 A8 8 0 0 1 14.70 16.47 Z"
            fill={CHART_COLORS.blue}
        />
        <path
            d="M10 10 L14.70 16.47 A8 8 0 0 1 3.53 14.70 Z"
            fill={CHART_COLORS.orange}
        />
        <path
            d="M10 10 L3.53 14.70 A8 8 0 0 1 3.53 5.30 Z"
            fill={CHART_COLORS.gray}
        />
        <path
            d="M10 10 L3.53 5.30 A8 8 0 0 1 10 2 Z"
            fill={CHART_COLORS.gold}
        />
    </>,
);

export const IconDonutPreview = chartPreviewIcon(
    <>
        <path
            d="M10 2 A8 8 0 0 1 14.70 16.47 L12.06 12.83 A3.5 3.5 0 0 0 10 6.5 Z"
            fill={CHART_COLORS.blue}
        />
        <path
            d="M14.70 16.47 A8 8 0 0 1 3.53 14.70 L7.17 12.06 A3.5 3.5 0 0 0 12.06 12.83 Z"
            fill={CHART_COLORS.orange}
        />
        <path
            d="M3.53 14.70 A8 8 0 0 1 3.53 5.30 L7.17 7.94 A3.5 3.5 0 0 0 7.17 12.06 Z"
            fill={CHART_COLORS.gray}
        />
        <path
            d="M3.53 5.30 A8 8 0 0 1 10 2 L10 6.5 A3.5 3.5 0 0 0 7.17 7.94 Z"
            fill={CHART_COLORS.gold}
        />
    </>,
);

export const IconStackedBarPreview = chartPreviewIcon(
    <>
        <rect x="3" y="4" width="4" height="3" fill={CHART_COLORS.blue} />
        <rect x="7" y="4" width="3" height="3" fill={CHART_COLORS.orange} />
        <rect x="10" y="4" width="2" height="3" fill={CHART_COLORS.gray} />
        <rect x="3" y="8.5" width="6" height="3" fill={CHART_COLORS.blue} />
        <rect x="9" y="8.5" width="4" height="3" fill={CHART_COLORS.orange} />
        <rect x="13" y="8.5" width="2" height="3" fill={CHART_COLORS.gray} />
        <rect x="3" y="13" width="2" height="3" fill={CHART_COLORS.blue} />
        <rect x="5" y="13" width="6" height="3" fill={CHART_COLORS.orange} />
        <rect x="11" y="13" width="4" height="3" fill={CHART_COLORS.gray} />
    </>,
);

export const IconStacked100BarPreview = chartPreviewIcon(
    <>
        <rect x="3" y="4" width="8" height="3" fill={CHART_COLORS.blue} />
        <rect x="11" y="4" width="4" height="3" fill={CHART_COLORS.orange} />
        <rect x="15" y="4" width="2" height="3" fill={CHART_COLORS.gray} />
        <rect x="3" y="8.5" width="5" height="3" fill={CHART_COLORS.blue} />
        <rect x="8" y="8.5" width="6" height="3" fill={CHART_COLORS.orange} />
        <rect x="14" y="8.5" width="3" height="3" fill={CHART_COLORS.gray} />
        <rect x="3" y="13" width="10" height="3" fill={CHART_COLORS.blue} />
        <rect x="13" y="13" width="3" height="3" fill={CHART_COLORS.orange} />
        <rect x="16" y="13" width="1" height="3" fill={CHART_COLORS.gray} />
    </>,
);

export const IconStackedAreaPreview = chartPreviewIcon(
    <>
        <path
            d="M2 17 L2 14 L6 12 L10 15 L14 11 L18 14 L18 17 Z"
            fill={CHART_COLORS.blue}
        />
        <path
            d="M2 12 L6 9 L10 11 L14 9 L18 11 L18 14 L14 11 L10 15 L6 12 L2 14 Z"
            fill={CHART_COLORS.orange}
        />
        <path
            d="M2 10 L6 7 L10 8 L14 6 L18 9 L18 11 L14 9 L10 11 L6 9 L2 12 Z"
            fill={CHART_COLORS.gray}
        />
    </>,
);

export const IconComboPreview = chartPreviewIcon(
    <>
        <rect x="3" y="11" width="3" height="6" fill={CHART_COLORS.blue} />
        <rect x="3" y="6" width="3" height="5" fill={CHART_COLORS.orange} />
        <rect x="8.5" y="9" width="3" height="8" fill={CHART_COLORS.blue} />
        <rect x="8.5" y="4" width="3" height="5" fill={CHART_COLORS.orange} />
        <rect x="14" y="13" width="3" height="4" fill={CHART_COLORS.blue} />
        <rect x="14" y="7" width="3" height="6" fill={CHART_COLORS.orange} />
        <polyline
            points="4.5,8 10,5 15.5,9"
            fill="none"
            stroke={CHART_COLORS.gold}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="4.5" cy="8" r="1" fill={CHART_COLORS.gold} />
        <circle cx="10" cy="5" r="1" fill={CHART_COLORS.gold} />
        <circle cx="15.5" cy="9" r="1" fill={CHART_COLORS.gold} />
    </>,
);

export const IconParetoPreview = chartPreviewIcon(
    <>
        <rect x="2.5" y="11" width="2.4" height="6" fill={CHART_COLORS.blue} />
        <rect x="5.6" y="7" width="2.4" height="10" fill={CHART_COLORS.blue} />
        <rect
            x="8.7"
            y="4.5"
            width="2.4"
            height="12.5"
            fill={CHART_COLORS.blue}
        />
        <rect
            x="11.8"
            y="2.5"
            width="2.4"
            height="14.5"
            fill={CHART_COLORS.orange}
        />
        <rect x="14.9" y="6" width="2.4" height="11" fill={CHART_COLORS.gray} />
        <polyline
            points="2.5,15.8 6.8,12.5 11,12.9 15.1,9.6"
            fill="none"
            stroke={CHART_COLORS.gold}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="2.5" cy="15.8" r="1" fill={CHART_COLORS.gold} />
        <circle cx="6.8" cy="12.5" r="1" fill={CHART_COLORS.gold} />
        <circle cx="11" cy="12.9" r="1" fill={CHART_COLORS.gold} />
        <circle cx="15.1" cy="9.6" r="1" fill={CHART_COLORS.gold} />
    </>,
);

export const IconTreemapPreview = chartPreviewIcon(
    <>
        <rect x="2" y="2" width="9" height="8" fill={CHART_COLORS.blue} />
        <rect x="12" y="2" width="6" height="8" fill={CHART_COLORS.orange} />
        <rect x="2" y="11" width="6" height="6" fill={CHART_COLORS.gray} />
        <rect x="9" y="11" width="9" height="6" fill={CHART_COLORS.gold} />
    </>,
);

export const IconFunnelPreview = chartPreviewIcon(
    <>
        <path d="M2 2 L18 2 L16 6 L4 6 Z" fill={CHART_COLORS.blue} />
        <path d="M4 6 L16 6 L14 10 L6 10 Z" fill={CHART_COLORS.orange} />
        <path d="M6 10 L14 10 L12 14 L8 14 Z" fill={CHART_COLORS.gray} />
        <path d="M8 14 L12 14 L11 17 L9 17 Z" fill={CHART_COLORS.gold} />
    </>,
);

export const IconRibbonPreview = chartPreviewIcon(
    <>
        <path
            d="M1 7c2-3 3 3 5 0s3-3 5 0 3 3 5 0v2.4c-2 3-3-3-5 0s-3 3-5 0-3-3-5 0Z"
            fill={CHART_COLORS.blue}
        />
        <path
            d="M1 12c2-3 3 3 5 0s3-3 5 0 3 3 5 0v2.4c-2 3-3-3-5 0s-3 3-5 0-3-3-5 0Z"
            fill={CHART_COLORS.orange}
        />
    </>,
);

export const IconWaterfallPreview = chartPreviewIcon(
    <>
        <rect x="2" y="10" width="2.6" height="7" fill={CHART_COLORS.gray} />
        <rect x="5.2" y="5" width="2.6" height="5" fill={CHART_COLORS.blue} />
        <rect x="8.4" y="5" width="2.6" height="3" fill={CHART_COLORS.orange} />
        <rect x="11.6" y="4" width="2.6" height="4" fill={CHART_COLORS.blue} />
        <rect x="14.8" y="4" width="2.6" height="13" fill={CHART_COLORS.gray} />
        <line
            x1="4.6"
            y1="10"
            x2="5.2"
            y2="10"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.6"
        />
        <line
            x1="7.8"
            y1="5"
            x2="8.4"
            y2="5"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.6"
        />
        <line
            x1="11"
            y1="8"
            x2="11.6"
            y2="8"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.6"
        />
        <line
            x1="14.2"
            y1="4"
            x2="14.8"
            y2="4"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.6"
        />
    </>,
);

export const IconScatterPreview = chartPreviewIcon(
    <>
        <circle cx="4" cy="14" r="1.2" fill={CHART_COLORS.blue} />
        <circle cx="7" cy="8" r="1.1" fill={CHART_COLORS.blue} />
        <circle cx="10" cy="15" r="1.3" fill={CHART_COLORS.orange} />
        <circle cx="13" cy="6" r="1.1" fill={CHART_COLORS.blue} />
        <circle cx="16" cy="11" r="1" fill={CHART_COLORS.orange} />
        <circle cx="14" cy="16" r="1" fill={CHART_COLORS.blue} />
    </>,
);

export const IconBubblePreview = chartPreviewIcon(
    <>
        <circle
            cx="6"
            cy="12"
            r="3"
            fill={CHART_COLORS.blue}
            fillOpacity={0.75}
        />
        <circle
            cx="13"
            cy="7"
            r="4"
            fill={CHART_COLORS.orange}
            fillOpacity={0.7}
        />
        <circle
            cx="15"
            cy="14"
            r="2.2"
            fill={CHART_COLORS.gray}
            fillOpacity={0.8}
        />
        <circle
            cx="4"
            cy="5"
            r="2.5"
            fill={CHART_COLORS.gold}
            fillOpacity={0.75}
        />
    </>,
);

/* ---- Valeur unique et tabulaire ---- */

export const IconCardPreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="2"
            width="16"
            height="16"
            rx="1.5"
            fill="none"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.6"
        />
        <rect
            x="5"
            y="6"
            width="10"
            height="5"
            rx="1"
            fill={CHART_COLORS.blue}
        />
        <rect
            x="5"
            y="13"
            width="6"
            height="2"
            rx="1"
            fill={CHART_COLORS.gray}
            fillOpacity={0.7}
        />
    </>,
);

export const IconGaugePreview = chartPreviewIcon(
    <>
        <path
            d="M2 15 A8 8 0 0 1 6 8.07"
            fill="none"
            stroke={CHART_COLORS.blue}
            strokeWidth="2.6"
        />
        <path
            d="M6 8.07 A8 8 0 0 1 14 8.07"
            fill="none"
            stroke={CHART_COLORS.gold}
            strokeWidth="2.6"
        />
        <path
            d="M14 8.07 A8 8 0 0 1 18 15"
            fill="none"
            stroke={CHART_COLORS.orange}
            strokeWidth="2.6"
        />
        <line
            x1="10"
            y1="15"
            x2="9.13"
            y2="10.08"
            stroke={CHART_COLORS.gray}
            strokeWidth="1"
        />
        <circle cx="10" cy="15" r="1.2" fill={CHART_COLORS.gray} />
    </>,
);

export const IconTablePreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="3"
            width="16"
            height="14"
            fill="none"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.5"
        />
        <rect x="2" y="3" width="16" height="3" fill={CHART_COLORS.blue} />
        <rect
            x="2"
            y="9"
            width="16"
            height="3"
            fill={CHART_COLORS.gray}
            fillOpacity={0.15}
        />
        <rect
            x="2"
            y="15"
            width="16"
            height="2"
            fill={CHART_COLORS.gray}
            fillOpacity={0.15}
        />
        <line
            x1="8"
            y1="3"
            x2="8"
            y2="17"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.4"
        />
        <line
            x1="13"
            y1="3"
            x2="13"
            y2="17"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.4"
        />
    </>,
);

export const IconMatrixPreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="2"
            width="16"
            height="15"
            fill="none"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.5"
        />
        <rect x="2" y="2" width="5" height="3" fill={CHART_COLORS.gray} />
        <rect x="7" y="2" width="11" height="3" fill={CHART_COLORS.blue} />
        <rect
            x="2"
            y="5"
            width="5"
            height="12"
            fill={CHART_COLORS.orange}
            fillOpacity={0.75}
        />
        <line
            x1="11"
            y1="2"
            x2="11"
            y2="17"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.4"
        />
        <line
            x1="15"
            y1="2"
            x2="15"
            y2="17"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.4"
        />
        <line
            x1="7"
            y1="8"
            x2="18"
            y2="8"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.4"
        />
        <line
            x1="7"
            y1="13"
            x2="18"
            y2="13"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.4"
        />
    </>,
);

/* ---- Cartes ---- */

export const IconMapPreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="2"
            width="16"
            height="16"
            rx="2"
            fill={CHART_COLORS.gray}
            fillOpacity={0.15}
        />
        <circle cx="7" cy="10" r="2.2" fill={CHART_COLORS.blue} />
        <path d="M5.3 11.3 L8.7 11.3 L7 15 Z" fill={CHART_COLORS.blue} />
        <circle cx="14" cy="8" r="1.8" fill={CHART_COLORS.orange} />
        <path d="M12.6 9.2 L15.4 9.2 L14 12 Z" fill={CHART_COLORS.orange} />
        <circle cx="11" cy="4.5" r="1.4" fill={CHART_COLORS.gold} />
        <path d="M9.9 5.5 L12.1 5.5 L11 7 Z" fill={CHART_COLORS.gold} />
    </>,
);

export const IconFilledMapPreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="2"
            width="16"
            height="16"
            rx="2"
            fill={CHART_COLORS.blue}
        />
        <circle cx="6" cy="7.5" r="2" fill={CHART_COLORS.orange} />
        <circle cx="13" cy="8.5" r="2.5" fill={CHART_COLORS.gray} />
        <circle cx="6" cy="14" r="3" fill={CHART_COLORS.gold} />
    </>,
);

export const IconShapeMapPreview = chartPreviewIcon(
    <>
        <polygon
            points="12,10 9.5,14.33 4.5,14.33 2,10 4.5,5.67 9.5,5.67"
            fill={CHART_COLORS.blue}
        />
        <polygon
            points="17.5,6 15.75,9.03 12.25,9.03 10.5,6 12.25,2.97 15.75,2.97"
            fill={CHART_COLORS.orange}
        />
        <polygon
            points="17.2,14 15.6,16.77 12.4,16.77 10.8,14 12.4,11.23 15.6,11.23"
            fill={CHART_COLORS.gray}
        />
    </>,
);

/* ---- Segmenteurs ---- */

export const IconSlicerPreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="2"
            width="16"
            height="16"
            rx="1.5"
            fill="none"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.5"
        />
        <rect x="2" y="2" width="16" height="3.5" fill={CHART_COLORS.blue} />
        <rect x="4" y="8" width="2" height="2" fill={CHART_COLORS.blue} />
        <rect
            x="7"
            y="8.5"
            width="8"
            height="1.2"
            fill={CHART_COLORS.gray}
            fillOpacity={0.5}
        />
        <rect
            x="4"
            y="11.5"
            width="2"
            height="2"
            fill="none"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.5"
        />
        <rect
            x="7"
            y="12"
            width="6"
            height="1.2"
            fill={CHART_COLORS.gray}
            fillOpacity={0.4}
        />
        <rect x="4" y="15" width="2" height="2" fill={CHART_COLORS.blue} />
        <rect
            x="7"
            y="15.5"
            width="9"
            height="1.2"
            fill={CHART_COLORS.gray}
            fillOpacity={0.5}
        />
    </>,
);

export const IconButtonSlicerPreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="8"
            width="5"
            height="4"
            rx="1"
            fill={CHART_COLORS.blue}
        />
        <rect
            x="8"
            y="8"
            width="5"
            height="4"
            rx="1"
            fill="none"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.5"
        />
        <rect
            x="14"
            y="8"
            width="4"
            height="4"
            rx="1"
            fill="none"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.5"
        />
    </>,
);

export const IconDropdownSlicerPreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="7"
            width="16"
            height="6"
            rx="1"
            fill="none"
            stroke={CHART_COLORS.blue}
            strokeWidth="0.7"
        />
        <rect
            x="4"
            y="9.2"
            width="8"
            height="1.6"
            rx="0.5"
            fill={CHART_COLORS.gray}
            fillOpacity={0.5}
        />
        <path d="M14 9 L16 9 L15 11 Z" fill={CHART_COLORS.blue} />
    </>,
);

export const IconInputSlicerPreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="5"
            width="16"
            height="10"
            rx="1.5"
            fill="none"
            stroke={CHART_COLORS.blue}
            strokeWidth="0.7"
        />
        <rect
            x="5"
            y="9.2"
            width="5"
            height="1.6"
            rx="0.8"
            fill={CHART_COLORS.gray}
            fillOpacity={0.5}
        />
        <rect
            x="12.3"
            y="8.4"
            width="1.4"
            height="3.2"
            rx="0.5"
            fill={CHART_COLORS.orange}
        />
    </>,
);

export const IconDateSlicerPreview = chartPreviewIcon(
    <>
        <rect
            x="3"
            y="4"
            width="14"
            height="13"
            rx="1"
            fill="none"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.5"
        />
        <rect x="3" y="4" width="14" height="3" fill={CHART_COLORS.blue} />
        <rect x="6" y="2" width="1" height="3" fill={CHART_COLORS.gray} />
        <rect x="13" y="2" width="1" height="3" fill={CHART_COLORS.gray} />
        <rect
            x="5"
            y="9"
            width="1.8"
            height="1.8"
            fill={CHART_COLORS.gray}
            fillOpacity={0.25}
        />
        <rect
            x="9"
            y="9"
            width="1.8"
            height="1.8"
            fill={CHART_COLORS.gray}
            fillOpacity={0.25}
        />
        <rect
            x="13"
            y="9"
            width="1.8"
            height="1.8"
            fill={CHART_COLORS.gray}
            fillOpacity={0.25}
        />
        <rect
            x="5"
            y="12"
            width="1.8"
            height="1.8"
            fill={CHART_COLORS.gray}
            fillOpacity={0.25}
        />
        <rect x="9" y="12" width="1.8" height="1.8" fill={CHART_COLORS.gold} />
        <rect
            x="13"
            y="12"
            width="1.8"
            height="1.8"
            fill={CHART_COLORS.gray}
            fillOpacity={0.25}
        />
    </>,
);

/* ---- Éléments ---- */

export const IconTextPreview = chartPreviewIcon(
    <>
        <rect x="3" y="5" width="14" height="1.6" fill={CHART_COLORS.blue} />
        <rect
            x="3"
            y="8.5"
            width="14"
            height="1.3"
            fill={CHART_COLORS.gray}
            fillOpacity={0.4}
        />
        <rect
            x="3"
            y="11"
            width="11"
            height="1.3"
            fill={CHART_COLORS.gray}
            fillOpacity={0.4}
        />
        <rect
            x="3"
            y="13.5"
            width="13"
            height="1.3"
            fill={CHART_COLORS.gray}
            fillOpacity={0.4}
        />
    </>,
);

export const IconImagePreview = chartPreviewIcon(
    <>
        <rect
            x="2"
            y="3"
            width="16"
            height="14"
            rx="1"
            fill="none"
            stroke={CHART_COLORS.gray}
            strokeWidth="0.6"
        />
        <circle cx="6" cy="7" r="1.8" fill={CHART_COLORS.gold} />
        <path
            d="M2 15 L7 9 L11 13 L14 10 L18 15 L18 17 L2 17 Z"
            fill={CHART_COLORS.gray}
        />
        <path d="M2 17 L6 12 L10 15 L13 12 L18 17 Z" fill={CHART_COLORS.blue} />
    </>,
);

export const IconButtonPreview = chartPreviewIcon(
    <>
        <rect
            x="3"
            y="7"
            width="14"
            height="6"
            rx="2"
            fill={CHART_COLORS.blue}
        />
        <rect
            x="6"
            y="9.2"
            width="8"
            height="1.6"
            rx="0.8"
            fill="white"
            fillOpacity={0.9}
        />
    </>,
);

export const IconClockPreview = chartPreviewIcon(
    <>
        <circle
            cx="10"
            cy="10"
            r="7.5"
            fill="none"
            stroke={CHART_COLORS.blue}
            strokeWidth="1.1"
        />
        <path
            d="M10 5.5 V10 L13.2 12"
            fill="none"
            stroke={CHART_COLORS.blue}
            strokeWidth="1.3"
            strokeLinecap="round"
        />
        <circle cx="10" cy="10" r="1.1" fill={CHART_COLORS.orange} />
    </>,
);

// Fluent has no R / Python logos — a simple language badge, since actual
// trademarked logos aren't ours to embed.
// Field type indicators (Data pane) — Fluent's own symbols for each data
// category, colored to match Power BI's real field icon colors (green # for
// numeric, purple calendar for date, orange "Aa" for text, blue toggle for
// boolean).
export const IconFieldNumber = NumberSymbolRegular;
export const IconFieldDate = CalendarLtrRegular;
export const IconFieldText = TextCaseTitleRegular;
export const IconFieldBoolean = ToggleLeftRegular;
