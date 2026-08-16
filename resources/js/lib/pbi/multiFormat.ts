import type { Visual, VisualType } from '@/lib/pbi/model';

/** Visual properties that can be applied to a group of visuals regardless of
 * their type (background, border, shadow, font, position/size). Anything not
 * in this set is treated as type-specific and only applied to visuals of the
 * same type as the anchor. */
export const GENERIC_FORMAT_KEYS = new Set<string>([
    'background',
    'border',
    'borderColor',
    'borderWidth',
    'radius',
    'shadow',
    'x',
    'y',
    'w',
    'h',
    'fontFamily',
    'fontSize',
    'fontColor',
    'fontBold',
    'fontItalic',
    'fontUnderline',
    'textAlign',
    'numberFormat',
    'colorIndex',
    'altText',
    'title',
    'titleStyle',
    'showTitle',
]);

/** The patch to apply to a target visual when editing a multi-selection whose
 * anchor has type `anchorType`. Generic keys always apply; type-specific keys
 * only apply to visuals sharing the anchor's type. Returns `null` when nothing
 * in the patch reaches the target. */
export function effectivePatchFor(
    patch: Record<string, unknown>,
    anchorType: VisualType,
    targetType: VisualType,
): Partial<Visual> | null {
    let out: Partial<Visual> | null = null;
    for (const [key, value] of Object.entries(patch)) {
        if (GENERIC_FORMAT_KEYS.has(key) || anchorType === targetType) {
            out ??= {};
            (out as Record<string, unknown>)[key] = value;
        }
    }
    return out;
}