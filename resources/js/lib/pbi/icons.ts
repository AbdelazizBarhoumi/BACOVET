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
    // ── Directional ──────────────────────────────────────────────
    {
        id: 'directional-colored',
        label: 'Directional (colored)',
        category: 'Directional',
        icons: [
            {
                id: 'up',
                label: 'Up Arrow',
                unicode: '↑',
                fluent: 'ArrowUp',
                color: '#16a34a',
            },
            {
                id: 'side',
                label: 'Side Arrow',
                unicode: '→',
                fluent: 'ArrowRight',
                color: '#4b5563',
            },
            {
                id: 'down',
                label: 'Down Arrow',
                unicode: '↓',
                fluent: 'ArrowDown',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'directional-gray',
        label: 'Directional (gray)',
        category: 'Directional',
        icons: [
            {
                id: 'up',
                label: 'Up Arrow',
                unicode: '↑',
                fluent: 'ArrowUp',
                color: '#4b5563',
            },
            {
                id: 'side',
                label: 'Side Arrow',
                unicode: '→',
                fluent: 'ArrowRight',
                color: '#4b5563',
            },
            {
                id: 'down',
                label: 'Down Arrow',
                unicode: '↓',
                fluent: 'ArrowDown',
                color: '#4b5563',
            },
        ],
    },
    {
        id: 'directional-double',
        label: 'Double Arrows',
        category: 'Directional',
        icons: [
            {
                id: 'up-up',
                label: 'Double Up',
                unicode: '⇈',
                color: '#15803d',
            },
            {
                id: 'right-right',
                label: 'Double Side',
                unicode: '⇉',
                color: '#4b5563',
            },
            {
                id: 'down-down',
                label: 'Double Down',
                unicode: '⇊',
                color: '#b91c1c',
            },
        ],
    },
    {
        id: 'directional-triple',
        label: 'Triple Arrows',
        category: 'Directional',
        icons: [
            {
                id: 'up3',
                label: 'Triple Up',
                unicode: '⭧',
                color: '#15803d',
            },
            {
                id: 'right3',
                label: 'Triple Side',
                unicode: '⭨',
                color: '#4b5563',
            },
            {
                id: 'down3',
                label: 'Triple Down',
                unicode: '⭩',
                color: '#b91c1c',
            },
        ],
    },

    // ── Traffic Lights ───────────────────────────────────────────
    {
        id: 'traffic-rimmed',
        label: '3 Traffic Lights (Rimmed)',
        category: 'Traffic Lights',
        icons: [
            {
                id: 'go',
                label: 'Go',
                unicode: '🟢',
                color: '#16a34a',
            },
            {
                id: 'caution',
                label: 'Caution',
                unicode: '🟡',
                color: '#ca8a04',
            },
            {
                id: 'stop',
                label: 'Stop',
                unicode: '🔴',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'traffic-unrimmed',
        label: '3 Traffic Lights (Unrimmed)',
        category: 'Traffic Lights',
        icons: [
            {
                id: 'go',
                label: 'Go',
                unicode: '⬤',
                color: '#16a34a',
            },
            {
                id: 'caution',
                label: 'Caution',
                unicode: '⬤',
                color: '#ca8a04',
            },
            {
                id: 'stop',
                label: 'Stop',
                unicode: '⬤',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'traffic-four',
        label: '4 Traffic Lights',
        category: 'Traffic Lights',
        icons: [
            {
                id: 'go',
                label: 'Go',
                unicode: '🟢',
                color: '#16a34a',
            },
            {
                id: 'caution',
                label: 'Caution',
                unicode: '🟡',
                color: '#ca8a04',
            },
            {
                id: 'stop',
                label: 'Stop',
                unicode: '🔴',
                color: '#dc2626',
            },
            {
                id: 'off',
                label: 'Off',
                unicode: '⚫',
                color: '#3f3f46',
            },
        ],
    },

    // ── Flags ────────────────────────────────────────────────────
    {
        id: 'flags',
        label: 'Flags',
        category: 'Flags',
        icons: [
            { id: 'red', label: 'Red Flag', unicode: '🚩', color: '#dc2626' },
            {
                id: 'yellow',
                label: 'Yellow Flag',
                unicode: '🟨',
                color: '#eab308',
            },
            {
                id: 'green',
                label: 'Green Flag',
                unicode: '🟩',
                color: '#16a34a',
            },
        ],
    },

    // ── Shapes ───────────────────────────────────────────────────
    {
        id: 'shapes-colored',
        label: 'Colored Shapes',
        category: 'Shapes',
        icons: [
            {
                id: 'circle',
                label: 'Circle',
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
                label: 'Diamond',
                unicode: '◆',
                fluent: 'Diamond',
                color: '#7c3aed',
            },
            {
                id: 'square',
                label: 'Square',
                unicode: '■',
                fluent: 'Square',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'shapes',
        label: 'Shapes',
        category: 'Shapes',
        icons: [
            {
                id: 'circle',
                label: 'Circle',
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
                label: 'Diamond',
                unicode: '◆',
                color: '#111827',
            },
            {
                id: 'square',
                label: 'Square',
                unicode: '■',
                color: '#111827',
            },
        ],
    },

    // ── Indicators ─────────────────────────────────────────────────
    {
        id: 'indicators',
        label: 'Indicators',
        category: 'Indicators',
        icons: [
            {
                id: 'check',
                label: 'Check Mark',
                unicode: '✔',
                fluent: 'CheckmarkCircle',
                color: '#16a34a',
            },
            {
                id: 'cross',
                label: 'Cross',
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
                label: 'Question Mark',
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

    // ── Symbols ───────────────────────────────────────────────────
    {
        id: 'symbols-circles',
        label: 'Colored Circles',
        category: 'Symbols',
        icons: [
            {
                id: 'green',
                label: 'Green Circle',
                unicode: '🟢',
                color: '#16a34a',
            },
            {
                id: 'yellow',
                label: 'Yellow Circle',
                unicode: '🟡',
                color: '#ca8a04',
            },
            {
                id: 'red',
                label: 'Red Circle',
                unicode: '🔴',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'symbols-stars',
        label: 'Stars',
        category: 'Symbols',
        icons: [
            { id: 'star1', label: '1 Star', unicode: '★', color: '#ca8a04' },
            { id: 'star2', label: '2 Stars', unicode: '★★', color: '#ca8a04' },
            {
                id: 'star3',
                label: '3 Stars',
                unicode: '★★★',
                color: '#ca8a04',
            },
        ],
    },

    // ── Ratings ───────────────────────────────────────────────────
    {
        id: 'ratings-quarters',
        label: 'Quarters',
        category: 'Ratings',
        icons: [
            { id: 'q1', label: 'Quarter 1', unicode: '◔', color: '#ca8a04' },
            { id: 'q2', label: 'Quarters 2', unicode: '◑', color: '#ca8a04' },
            { id: 'q3', label: 'Quarters 3', unicode: '◒', color: '#ca8a04' },
            { id: 'q4', label: 'Full', unicode: '●', color: '#ca8a04' },
        ],
    },
    {
        id: 'ratings-boxes',
        label: 'Boxes',
        category: 'Ratings',
        icons: [
            { id: 'b1', label: '1 Box', unicode: '□', color: '#9ca3af' },
            { id: 'b2', label: '2 Boxes', unicode: '□□', color: '#9ca3af' },
            {
                id: 'b3',
                label: '3 Boxes',
                unicode: '□□□',
                color: '#ca8a04',
            },
            {
                id: 'b4',
                label: '4 Boxes',
                unicode: '■■■■',
                color: '#ca8a04',
            },
        ],
    },
    {
        id: 'ratings-stars',
        label: 'Star Ratings',
        category: 'Ratings',
        icons: [
            { id: 's1', label: '1 Star', unicode: '★☆☆☆☆', fluent: 'Star', color: '#ca8a04' },
            { id: 's2', label: '2 Stars', unicode: '★★☆☆☆', fluent: 'Star', color: '#ca8a04' },
            { id: 's3', label: '3 Stars', unicode: '★★★☆☆', fluent: 'Star', color: '#ca8a04' },
            {
                id: 's4',
                label: '4 Stars',
                unicode: '★★★★☆',
                fluent: 'Star',
                color: '#ca8a04',
            },
            {
                id: 's5',
                label: '5 Stars',
                unicode: '★★★★★',
                fluent: 'Star',
                color: '#ca8a04',
            },
        ],
    },

    // ── Trophies / Medals ───────────────────────────────────────
    {
        id: 'trophies',
        label: 'Trophies',
        category: 'Trophies',
        icons: [
            {
                id: 'gold',
                label: 'Gold / 1st Place',
                unicode: '🥇',
                fluent: 'Trophy',
                color: '#ca8a04',
            },
            {
                id: 'silver',
                label: 'Silver / 2nd Place',
                unicode: '🥈',
                fluent: 'Trophy',
                color: '#9ca3af',
            },
            {
                id: 'bronze',
                label: 'Bronze / 3rd Place',
                unicode: '🥉',
                fluent: 'Trophy',
                color: '#b4530f',
            },
        ],
    },
    {
        id: 'medals',
        label: 'Medals',
        category: 'Trophies',
        icons: [
            {
                id: 'gold',
                label: 'Gold Medal',
                unicode: '🏅',
                fluent: 'Medal',
                color: '#ca8a04',
            },
            {
                id: 'silver',
                label: 'Silver Medal',
                unicode: '🏅',
                fluent: 'Medal',
                color: '#9ca3af',
            },
            {
                id: 'bronze',
                label: 'Bronze Medal',
                unicode: '🏅',
                fluent: 'Medal',
                color: '#b4530f',
            },
        ],
    },
    {
        id: 'badges',
        label: 'Badges',
        category: 'Trophies',
        icons: [
            {
                id: 'green',
                label: 'Green Badge',
                unicode: '⬤',
                color: '#16a34a',
            },
            {
                id: 'yellow',
                label: 'Yellow Badge',
                unicode: '⬤',
                color: '#ca8a04',
            },
            {
                id: 'red',
                label: 'Red Badge',
                unicode: '⬤',
                color: '#dc2626',
            },
        ],
    },

    // ── Modern Power BI categories ──────────────────────────────
    {
        id: 'health',
        label: 'Health / Heart',
        category: 'Modern',
        icons: [
            {
                id: 'full',
                label: 'Full Heart',
                unicode: '❤',
                fluent: 'Heart',
                color: '#dc2626',
            },
            {
                id: 'half',
                label: 'Half Heart',
                unicode: '💛',
                fluent: 'Heart',
                color: '#dc2626',
            },
            {
                id: 'empty',
                label: 'Empty Heart',
                unicode: '♡',
                fluent: 'Heart',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'fire',
        label: 'Fire',
        category: 'Modern',
        icons: [
            {
                id: 'low',
                label: 'Low',
                unicode: '🔥',
                fluent: 'Fire',
                color: '#f97316',
            },
            {
                id: 'mid',
                label: 'Medium',
                unicode: '🔥',
                fluent: 'Fire',
                color: '#ea580c',
            },
            {
                id: 'high',
                label: 'High',
                unicode: '🔥',
                fluent: 'Fire',
                color: '#c2410c',
            },
        ],
    },
    {
        id: 'lightning',
        label: 'Lightning',
        category: 'Modern',
        icons: [
            {
                id: 'low',
                label: 'Low',
                unicode: '⚡',
                fluent: 'Flash',
                color: '#60a5fa',
            },
            {
                id: 'mid',
                label: 'Medium',
                unicode: '⚡',
                fluent: 'Flash',
                color: '#3b82f6',
            },
            {
                id: 'high',
                label: 'High',
                unicode: '⚡',
                fluent: 'Flash',
                color: '#1d4ed8',
            },
        ],
    },
    {
        id: 'trend',
        label: 'Trend',
        category: 'Modern',
        icons: [
            {
                id: 'up',
                label: 'Up',
                unicode: '📈',
                color: '#16a34a',
            },
            {
                id: 'flat',
                label: 'Flat',
                unicode: '➖',
                color: '#4b5563',
            },
            {
                id: 'down',
                label: 'Down',
                unicode: '📉',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'sentiment',
        label: 'Faces (smile → angry)',
        category: 'Sentiment',
        icons: [
            {
                id: 'smile',
                label: 'Smile',
                unicode: '😄',
                color: '#16a34a',
            },
            {
                id: 'happy',
                label: 'Happy',
                unicode: '😊',
                color: '#65a30d',
            },
            {
                id: 'neutral',
                label: 'Neutral',
                unicode: '😐',
                color: '#4b5563',
            },
            {
                id: 'sad',
                label: 'Sad',
                unicode: '😞',
                color: '#ca8a04',
            },
            {
                id: 'angry',
                label: 'Angry',
                unicode: '😠',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'faces-smile-angry',
        label: 'Faces (smile / neutral / angry)',
        category: 'Sentiment',
        icons: [
            {
                id: 'smile',
                label: 'Smile',
                unicode: '😃',
                color: '#16a34a',
            },
            {
                id: 'neutral',
                label: 'Neutral',
                unicode: '😐',
                color: '#4b5563',
            },
            {
                id: 'angry',
                label: 'Angry',
                unicode: '😠',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'target',
        label: 'Target',
        category: 'Modern',
        icons: [
            {
                id: 'hit',
                label: 'Hit Target',
                unicode: '🎯',
                fluent: 'Target',
                color: '#16a34a',
            },
            {
                id: 'near',
                label: 'Near',
                unicode: '🎯',
                fluent: 'Target',
                color: '#ca8a04',
            },
            {
                id: 'miss',
                label: 'Miss',
                unicode: '🎯',
                fluent: 'Target',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'performance',
        label: 'Performance',
        category: 'Modern',
        icons: [
            {
                id: 'high',
                label: 'High',
                unicode: '🚀',
                fluent: 'Rocket',
                color: '#16a34a',
            },
            {
                id: 'mid',
                label: 'Medium',
                unicode: '🚀',
                fluent: 'Rocket',
                color: '#ca8a04',
            },
            {
                id: 'low',
                label: 'Low',
                unicode: '🚀',
                fluent: 'Rocket',
                color: '#dc2626',
            },
        ],
    },
    {
        id: 'progress',
        label: 'Progress',
        category: 'Modern',
        icons: [
            { id: '0', label: '0%', unicode: '⭕', color: '#9ca3af' },
            { id: '50', label: '50%', unicode: '⏺', color: '#ca8a04' },
            { id: '100', label: '100%', unicode: '●', color: '#16a34a' },
        ],
    },
    {
        id: 'financial',
        label: 'Financial',
        category: 'Modern',
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
                label: 'Break-even',
                unicode: '💰',
                fluent: 'Money',
                color: '#ca8a04',
            },
            {
                id: 'loss',
                label: 'Loss',
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
