import type { CfRule } from '../model';
import type { CFIcon, CFIconSet } from './sets';
import { CF_ICON_SETS } from './sets';

export * from './sets';

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
