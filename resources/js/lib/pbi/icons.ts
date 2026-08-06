import type { CfRule } from './model';

export type CFIcon = {
    /** Stable id within a set, e.g. 'up' / 'red' / 'circle-filled'. */
    id: string;
    /** Human-readable label shown in the picker. */
    label: string;
    /** Glyph to render when no Fluent icon is resolved. */
    unicode: string;
    /** Optional icon name from @fluentui/react-icons for crisper rendering. */
    fluent?: string;
    /** Color applied to the glyph (hex). */
    color: string;
};

export type CFIconSet = {
    /** Stable id, e.g. 'directional-colored'. */
    id: string;
    label: string;
    /** Category heading used to group sets in the picker. */
    category: string;
    /** Icons ordered from "positive/high" (rule index 0) to "negative/low". */
    icons: CFIcon[];
};

export const CF_ICON_SETS: CFIconSet[] = [
    // ── Directionnel ──────────────────────────────────────────────
    {
        id: 'directional-colored',
        label: 'Directionnel (couleurs)',
        category: 'Directionnel',
        icons: [
            {
                id: 'up',
                label: 'Flèche haut',
                unicode: '↑',
                fluent: 'ArrowUp',
                color: '#16a34a',
            },
            {
                id: 'side',
                label: 'Flèche latérale',
                unicode: '→',
                fluent: 'ArrowRight',
                color: '#4b5563',
            },
            {
                id: 'down',
                label: 'Flèche bas',
                unicode: '↓',
                fluent: 'ArrowDown',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'directional-gray',
        label: 'Directionnel (gris)',
        category: 'Directionnel',
        icons: [
            {
                id: 'up',
                label: 'Flèche haut',
                unicode: '↑',
                fluent: 'ArrowUp',
                color: '#4b5563',
            },
            {
                id: 'side',
                label: 'Flèche latérale',
                unicode: '→',
                fluent: 'ArrowRight',
                color: '#4b5563',
            },
            {
                id: 'down',
                label: 'Flèche bas',
                unicode: '↓',
                fluent: 'ArrowDown',
                color: '#4b5563',
            },
        ],
    },
    {
        id: 'directional-double',
        label: 'Flèches doubles',
        category: 'Directionnel',
        icons: [
            {
                id: 'up-up',
                label: 'Double haut',
                unicode: '⇈',
                color: '#15803d',
            },
            {
                id: 'right-right',
                label: 'Double latéral',
                unicode: '⇉',
                color: '#4b5563',
            },
            {
                id: 'down-down',
                label: 'Double bas',
                unicode: '⇊',
                color: '#b91c1c',
            },
        ],
    },
    {
        id: 'directional-triple',
        label: 'Flèches triples',
        category: 'Directionnel',
        icons: [
            {
                id: 'up3',
                label: 'Triple haut',
                unicode: '⭧',
                color: '#15803d',
            },
            {
                id: 'right3',
                label: 'Triple latéral',
                unicode: '⭨',
                color: '#4b5563',
            },
            {
                id: 'down3',
                label: 'Triple bas',
                unicode: '⭩',
                color: '#b91c1c',
            },
        ],
    },

    // ── Feux de circulation ───────────────────────────────────────
    {
        id: 'traffic-rimmed',
        label: '3 feux de circulation (cerclés)',
        category: 'Feux de circulation',
        icons: [
            {
                id: 'go',
                label: 'Feu vert',
                unicode: '🟢',
                color: '#16a34a',
            },
            {
                id: 'caution',
                label: 'Feu jaune',
                unicode: '🟡',
                color: '#ca8a04',
            },
            {
                id: 'stop',
                label: 'Feu rouge',
                unicode: '🔴',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'traffic-unrimmed',
        label: '3 feux de circulation (non cerclés)',
        category: 'Feux de circulation',
        icons: [
            {
                id: 'go',
                label: 'Feu vert',
                unicode: '⬤',
                color: '#16a34a',
            },
            {
                id: 'caution',
                label: 'Feu jaune',
                unicode: '⬤',
                color: '#ca8a04',
            },
            {
                id: 'stop',
                label: 'Feu rouge',
                unicode: '⬤',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'traffic-four',
        label: '4 feux de circulation',
        category: 'Feux de circulation',
        icons: [
            {
                id: 'go',
                label: 'Feu vert',
                unicode: '🟢',
                color: '#16a34a',
            },
            {
                id: 'caution',
                label: 'Feu jaune',
                unicode: '🟡',
                color: '#ca8a04',
            },
            {
                id: 'stop',
                label: 'Feu rouge',
                unicode: '🔴',
                color: '#dc2626',
            },
            {
                id: 'off',
                label: 'Éteint',
                unicode: '⚫',
                color: '#3f3f46',
            },
        ],
    },

    // ── Drapeaux ──────────────────────────────────────────────────
    {
        id: 'flags',
        label: 'Drapeaux',
        category: 'Drapeaux',
        icons: [
            { id: 'red', label: 'Drapeau rouge', unicode: '🚩', color: '#dc2626' },
            {
                id: 'yellow',
                label: 'Drapeau jaune',
                unicode: '🟨',
                color: '#eab308',
            },
            {
                id: 'green',
                label: 'Drapeau vert',
                unicode: '🟩',
                color: '#16a34a',
            },
        ],
    },

    // ── Formes ────────────────────────────────────────────────────
    {
        id: 'shapes-colored',
        label: 'Formes colorées',
        category: 'Formes',
        icons: [
            {
                id: 'circle',
                label: 'Cercle',
                unicode: '●',
                fluent: 'Circle',
                color: '#2563eb',
            },
            {
                id: 'triangle',
                label: 'Triangle',
                unicode: '▲',
                fluent: 'Triangle',
                color: '#ca8a04',
            },
            {
                id: 'diamond',
                label: 'Losange',
                unicode: '◆',
                fluent: 'Diamond',
                color: '#7c3aed',
            },
            {
                id: 'square',
                label: 'Carré',
                unicode: '■',
                fluent: 'Square',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'shapes',
        label: 'Formes',
        category: 'Formes',
        icons: [
            {
                id: 'circle',
                label: 'Cercle',
                unicode: '●',
                color: '#111827',
            },
            {
                id: 'triangle',
                label: 'Triangle',
                unicode: '▲',
                color: '#111827',
            },
            {
                id: 'diamond',
                label: 'Losange',
                unicode: '◆',
                color: '#111827',
            },
            {
                id: 'square',
                label: 'Carré',
                unicode: '■',
                color: '#111827',
            },
        ],
    },

    // ── Indicateurs ───────────────────────────────────────────────
    {
        id: 'indicators',
        label: 'Indicateurs',
        category: 'Indicateurs',
        icons: [
            {
                id: 'check',
                label: 'Coche',
                unicode: '✔',
                fluent: 'CheckmarkCircle',
                color: '#16a34a',
            },
            {
                id: 'cross',
                label: 'Croix',
                unicode: '✖',
                fluent: 'DismissCircle',
                color: '#dc2626',
            },
            {
                id: 'exclamation',
                label: 'Exclamation',
                unicode: '❗',
                fluent: 'Warning',
                color: '#ca8a04',
            },
            {
                id: 'question',
                label: 'Point d’interrogation',
                unicode: '❓',
                fluent: 'ErrorCircle',
                color: '#2563eb',
            },
            {
                id: 'info',
                label: 'Information',
                unicode: 'ℹ',
                fluent: 'Info',
                color: '#2563eb',
            },
        ],
    },

    // ── Symboles ──────────────────────────────────────────────────
    {
        id: 'symbols-circles',
        label: 'Cercles colorés',
        category: 'Symboles',
        icons: [
            {
                id: 'green',
                label: 'Cercle vert',
                unicode: '🟢',
                color: '#16a34a',
            },
            {
                id: 'yellow',
                label: 'Cercle jaune',
                unicode: '🟡',
                color: '#ca8a04',
            },
            {
                id: 'red',
                label: 'Cercle rouge',
                unicode: '🔴',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'symbols-stars',
        label: 'Étoiles',
        category: 'Symboles',
        icons: [
            { id: 'star1', label: '1 étoile', unicode: '★', color: '#ca8a04' },
            { id: 'star2', label: '2 étoiles', unicode: '★★', color: '#ca8a04' },
            {
                id: 'star3',
                label: '3 étoiles',
                unicode: '★★★',
                color: '#ca8a04',
            },
        ],
    },

    // ── Évaluations ───────────────────────────────────────────────
    {
        id: 'ratings-quarters',
        label: 'Quarts',
        category: 'Évaluations',
        icons: [
            { id: 'q1', label: 'Quart 1', unicode: '◔', color: '#ca8a04' },
            { id: 'q2', label: 'Quart 2', unicode: '◑', color: '#ca8a04' },
            { id: 'q3', label: 'Quart 3', unicode: '◒', color: '#ca8a04' },
            { id: 'q4', label: 'Plein', unicode: '●', color: '#ca8a04' },
        ],
    },
    {
        id: 'ratings-boxes',
        label: 'Cases',
        category: 'Évaluations',
        icons: [
            { id: 'b1', label: '1 case', unicode: '□', color: '#9ca3af' },
            { id: 'b2', label: '2 cases', unicode: '□□', color: '#9ca3af' },
            {
                id: 'b3',
                label: '3 cases',
                unicode: '□□□',
                color: '#ca8a04',
            },
            {
                id: 'b4',
                label: '4 cases',
                unicode: '■■■■',
                color: '#ca8a04',
            },
        ],
    },
    {
        id: 'ratings-stars',
        label: 'Étoiles d’évaluation',
        category: 'Évaluations',
        icons: [
            { id: 's1', label: '1 étoile', unicode: '★☆☆☆☆', fluent: 'Star', color: '#ca8a04' },
            { id: 's2', label: '2 étoiles', unicode: '★★☆☆☆', fluent: 'Star', color: '#ca8a04' },
            { id: 's3', label: '3 étoiles', unicode: '★★★☆☆', fluent: 'Star', color: '#ca8a04' },
            {
                id: 's4',
                label: '4 étoiles',
                unicode: '★★★★☆',
                fluent: 'Star',
                color: '#ca8a04',
            },
            {
                id: 's5',
                label: '5 étoiles',
                unicode: '★★★★★',
                fluent: 'Star',
                color: '#ca8a04',
            },
        ],
    },

    // ── Trophées / Médailles ──────────────────────────────────────
    {
        id: 'trophies',
        label: 'Trophées',
        category: 'Trophées',
        icons: [
            {
                id: 'gold',
                label: 'Or / 1re place',
                unicode: '🥇',
                fluent: 'Trophy',
                color: '#ca8a04',
            },
            {
                id: 'silver',
                label: 'Argent / 2e place',
                unicode: '🥈',
                fluent: 'Trophy',
                color: '#9ca3af',
            },
            {
                id: 'bronze',
                label: 'Bronze / 3e place',
                unicode: '🥉',
                fluent: 'Trophy',
                color: '#b4530f',
            },
        ],
    },
    {
        id: 'medals',
        label: 'Médailles',
        category: 'Trophées',
        icons: [
            {
                id: 'gold',
                label: 'Médaille d’or',
                unicode: '🏅',
                fluent: 'Medal',
                color: '#ca8a04',
            },
            {
                id: 'silver',
                label: 'Médaille d’argent',
                unicode: '🏅',
                fluent: 'Medal',
                color: '#9ca3af',
            },
            {
                id: 'bronze',
                label: 'Médaille de bronze',
                unicode: '🏅',
                fluent: 'Medal',
                color: '#b4530f',
            },
        ],
    },
    {
        id: 'badges',
        label: 'Badges',
        category: 'Trophées',
        icons: [
            {
                id: 'green',
                label: 'Badge vert',
                unicode: '⬤',
                color: '#16a34a',
            },
            {
                id: 'yellow',
                label: 'Badge jaune',
                unicode: '⬤',
                color: '#ca8a04',
            },
            {
                id: 'red',
                label: 'Badge rouge',
                unicode: '⬤',
                color: '#dc2626',
            },
        ],
    },

    // ── Catégories Power BI modernes ─────────────────────────────
    {
        id: 'health',
        label: 'Santé / Cœur',
        category: 'Moderne',
        icons: [
            {
                id: 'full',
                label: 'Cœur plein',
                unicode: '❤',
                fluent: 'Heart',
                color: '#dc2626',
            },
            {
                id: 'half',
                label: 'Cœur à moitié',
                unicode: '💛',
                fluent: 'Heart',
                color: '#dc2626',
            },
            {
                id: 'empty',
                label: 'Cœur vide',
                unicode: '♡',
                fluent: 'Heart',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'fire',
        label: 'Feu',
        category: 'Moderne',
        icons: [
            {
                id: 'low',
                label: 'Bas',
                unicode: '🔥',
                fluent: 'Fire',
                color: '#f97316',
            },
            {
                id: 'mid',
                label: 'Moyen',
                unicode: '🔥',
                fluent: 'Fire',
                color: '#ea580c',
            },
            {
                id: 'high',
                label: 'Élevé',
                unicode: '🔥',
                fluent: 'Fire',
                color: '#c2410c',
            },
        ],
    },
    {
        id: 'lightning',
        label: 'Éclair',
        category: 'Moderne',
        icons: [
            {
                id: 'low',
                label: 'Bas',
                unicode: '⚡',
                fluent: 'Flash',
                color: '#60a5fa',
            },
            {
                id: 'mid',
                label: 'Moyen',
                unicode: '⚡',
                fluent: 'Flash',
                color: '#3b82f6',
            },
            {
                id: 'high',
                label: 'Élevé',
                unicode: '⚡',
                fluent: 'Flash',
                color: '#1d4ed8',
            },
        ],
    },
    {
        id: 'trend',
        label: 'Tendance',
        category: 'Moderne',
        icons: [
            {
                id: 'up',
                label: 'Hausse',
                unicode: '📈',
                color: '#16a34a',
            },
            {
                id: 'flat',
                label: 'Stable',
                unicode: '➖',
                color: '#4b5563',
            },
            {
                id: 'down',
                label: 'Baisse',
                unicode: '📉',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'sentiment',
        label: 'Visages (sourire → en colère)',
        category: 'Sentiment',
        icons: [
            {
                id: 'smile',
                label: 'Sourire',
                unicode: '😄',
                color: '#16a34a',
            },
            {
                id: 'happy',
                label: 'Content',
                unicode: '😊',
                color: '#65a30d',
            },
            {
                id: 'neutral',
                label: 'Neutre',
                unicode: '😐',
                color: '#4b5563',
            },
            {
                id: 'sad',
                label: 'Triste',
                unicode: '😞',
                color: '#ca8a04',
            },
            {
                id: 'angry',
                label: 'En colère',
                unicode: '😠',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'faces-smile-angry',
        label: 'Visages (sourire / neutre / en colère)',
        category: 'Sentiment',
        icons: [
            {
                id: 'smile',
                label: 'Sourire',
                unicode: '😃',
                color: '#16a34a',
            },
            {
                id: 'neutral',
                label: 'Neutre',
                unicode: '😐',
                color: '#4b5563',
            },
            {
                id: 'angry',
                label: 'En colère',
                unicode: '😠',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'target',
        label: 'Cible',
        category: 'Moderne',
        icons: [
            {
                id: 'hit',
                label: 'Cible atteinte',
                unicode: '🎯',
                fluent: 'Target',
                color: '#16a34a',
            },
            {
                id: 'near',
                label: 'Proche',
                unicode: '🎯',
                fluent: 'Target',
                color: '#ca8a04',
            },
            {
                id: 'miss',
                label: 'Raté',
                unicode: '🎯',
                fluent: 'Target',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'performance',
        label: 'Performance',
        category: 'Moderne',
        icons: [
            {
                id: 'high',
                label: 'Élevé',
                unicode: '🚀',
                fluent: 'Rocket',
                color: '#16a34a',
            },
            {
                id: 'mid',
                label: 'Moyen',
                unicode: '🚀',
                fluent: 'Rocket',
                color: '#ca8a04',
            },
            {
                id: 'low',
                label: 'Bas',
                unicode: '🚀',
                fluent: 'Rocket',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'progress',
        label: 'Progression',
        category: 'Moderne',
        icons: [
            { id: '0', label: '0%', unicode: '⭕', color: '#9ca3af' },
            { id: '50', label: '50%', unicode: '⏺', color: '#ca8a04' },
            { id: '100', label: '100%', unicode: '●', color: '#16a34a' },
        ],
    },
    {
        id: 'financial',
        label: 'Financier',
        category: 'Moderne',
        icons: [
            {
                id: 'profit',
                label: 'Profit',
                unicode: '💰',
                fluent: 'Money',
                color: '#16a34a',
            },
            {
                id: 'break-even',
                label: 'Équilibre',
                unicode: '💰',
                fluent: 'Money',
                color: '#ca8a04',
            },
            {
                id: 'loss',
                label: 'Perte',
                unicode: '💰',
                fluent: 'Money',
                color: '#dc2626',
            },
        ],
    },
];

/** Lookup a set by id. */
export function iconSetOf(id: string): CFIconSet | undefined {
    return CF_ICON_SETS.find((s) => s.id === id);
}

/** Resolves an icon within a set by its id, or undefined. */
export function iconById(
    setId: string,
    iconId: string | null | undefined,
): CFIcon | undefined {
    if (!iconId) return undefined;
    const set = iconSetOf(setId);
    return set?.icons.find((ic) => ic.id === iconId);
}

/** First set (default when none is configured). */
export function defaultIconSet(): CFIconSet {
    return CF_ICON_SETS[0]!;
}

/**
 * Rebinds a rule list to a new icon set: existing rules (in order) map onto the
 * new set's icons; extra rules take the last icon. Missing icon ids keep the
 * first icon.
 */
export function bindRulesToSet(set: CFIconSet, rules: CfRule[]): CfRule[] {
    const icons = set.icons;
    if (!icons.length) return rules;
    return rules.map((r, i) => ({
        ...r,
        icon: icons[Math.min(i, icons.length - 1)]!.id,
    }));
}

/** The icon object for a rule, given the active set. Falls back to the set's first icon. */
export function iconForRule(
    set: CFIconSet | undefined,
    rule: CfRule,
): CFIcon | undefined {
    const s = set ?? defaultIconSet();
    if (rule.icon) {
        const found = s.icons.find((ic) => ic.id === rule.icon);
        if (found) return found;
    }
    return s.icons[0];
}
