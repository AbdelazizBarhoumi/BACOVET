export const HEX_FALLBACK = '#000000';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL_RE = /^(rgb|rgba|hsl|hsla)\(/i;
const CSS_VAR_RE = /^var\(\s*(--[\w-]+)/;

function cssColorToHex(color: string): string | null {
    if (HEX_RE.test(color)) return color.toLowerCase();
    if (typeof document === 'undefined') return null;
    try {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = color;
        if (!ctx.fillStyle) return null;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        const hex = [r, g, b]
            .map((n) => n.toString(16).padStart(2, '0'))
            .join('');
        return a < 255
            ? `#${hex}${a.toString(16).padStart(2, '0')}`
            : `#${hex}`;
    } catch {
        return null;
    }
}

function resolveCssVar(value: string, depth = 0): string | null {
    if (depth > 5) return null;
    const match = CSS_VAR_RE.exec(value);
    if (!match) return null;
    if (typeof document === 'undefined') return null;
    const resolved = getComputedStyle(document.documentElement)
        .getPropertyValue(match[1]!)
        .trim();
    if (!resolved) return null;
    return CSS_VAR_RE.test(resolved)
        ? resolveCssVar(resolved, depth + 1)
        : resolved;
}

export function resolveColor(value: string): string {
    const input = value.trim();
    if (HEX_RE.test(input) || FUNCTIONAL_RE.test(input)) return input;
    const resolved = CSS_VAR_RE.test(input) ? resolveCssVar(input) : input;
    if (resolved) {
        const hex = cssColorToHex(resolved);
        if (hex) return hex;
    }
    return HEX_FALLBACK;
}

export function pickerColorToHex(c: {
    hex: string;
    rgb: { r: number; g: number; b: number };
    alpha: number;
}): string {
    if (c.alpha >= 1) return c.hex;
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(c.rgb.r)}${toHex(c.rgb.g)}${toHex(c.rgb.b)}${toHex(
        Math.round(c.alpha * 255),
    )}`;
}
