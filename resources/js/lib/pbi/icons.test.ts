import { describe, expect, it } from 'vitest';
import {
    bindRulesToSet,
    CF_ICON_SETS,
    defaultIconSet,
    iconById,
    iconForRule,
    iconSetOf,
} from './icons';
import type { CfRule } from './model';

function rule(partial: Partial<CfRule> = {}): CfRule {
    return {
        condition: 'is',
        comparator: 'greaterThan',
        value: 0,
        valueType: 'number',
        color: '#ff0000',
        ...partial,
    };
}

describe('CF_ICON_SETS registry', () => {
    it('has unique set ids and non-empty icon lists', () => {
        const ids = new Set<string>();
        for (const set of CF_ICON_SETS) {
            expect(set.id).toBeTruthy();
            expect(ids.has(set.id)).toBe(false);
            ids.add(set.id);
            expect(set.label).toBeTruthy();
            expect(set.category).toBeTruthy();
            expect(set.icons.length).toBeGreaterThan(0);
        }
    });

    it('has unique icon ids within each set and glyphs', () => {
        for (const set of CF_ICON_SETS) {
            const seen = new Set<string>();
            for (const icon of set.icons) {
                expect(seen.has(icon.id)).toBe(false);
                seen.add(icon.id);
                expect(icon.label).toBeTruthy();
                expect(icon.unicode).toBeTruthy();
            }
        }
    });

    it('resolves sets and icons by id', () => {
        expect(iconSetOf('directional-colored')?.label).toBe(
            'Directionnel (couleurs)',
        );
        expect(iconSetOf('missing-set')).toBeUndefined();
        expect(iconById('directional-colored', 'up')?.unicode).toBe('↑');
        expect(iconById('directional-colored', 'nope')).toBeUndefined();
        expect(iconById('missing-set', 'up')).toBeUndefined();
        expect(iconById('directional-colored', null)).toBeUndefined();
    });

    it('provides a stable default set', () => {
        expect(defaultIconSet().id).toBe('directional-colored');
    });
});

describe('Sentiment faces sets', () => {
    it('has a 5-face smile-to-angry set in order', () => {
        const set = iconSetOf('sentiment')!;
        expect(set).toBeDefined();
        expect(set.category).toBe('Sentiment');
        expect(set.icons.map((i) => i.id)).toEqual([
            'smile',
            'happy',
            'neutral',
            'sad',
            'angry',
        ]);
        expect(set.icons[0]!.unicode).toBe('😄');
        expect(set.icons[4]!.unicode).toBe('😠');
        expect(set.icons.every((i) => !i.fluent)).toBe(true);
    });

    it('has a 3-face smile / neutral / angry set with distinct glyphs', () => {
        const set = iconSetOf('faces-smile-angry')!;
        expect(set).toBeDefined();
        expect(set.category).toBe('Sentiment');
        expect(set.icons.map((i) => i.id)).toEqual([
            'smile',
            'neutral',
            'angry',
        ]);
        const glyphs = set.icons.map((i) => i.unicode);
        expect(new Set(glyphs).size).toBe(3);
        expect(glyphs[0]).toBe('😃');
        expect(glyphs[2]).toBe('😠');
    });

    it('resolves faces by id within each set', () => {
        expect(iconById('sentiment', 'sad')?.label).toBe('Triste');
        expect(iconById('faces-smile-angry', 'angry')?.unicode).toBe('😠');
        expect(iconById('faces-smile-angry', 'happy')).toBeUndefined();
    });
});

describe('iconForRule', () => {
    it('falls back to the first icon for a rule without an icon', () => {
        const set = iconSetOf('directional-colored')!;
        expect(iconForRule(set, rule())?.id).toBe('up');
    });

    it('resolves a configured icon within the set', () => {
        const set = iconSetOf('directional-colored')!;
        expect(iconForRule(set, rule({ icon: 'down' }))?.id).toBe('down');
    });

    it('falls back when the icon id does not belong to the set', () => {
        const set = iconSetOf('traffic-rimmed')!;
        expect(iconForRule(set, rule({ icon: 'up' }))?.id).toBe('go');
    });

    it('defaults to the first global set when none is given', () => {
        expect(iconForRule(undefined, rule())?.id).toBe('up');
    });
});

describe('bindRulesToSet', () => {
    it('maps rules onto the new set icons in order', () => {
        const set = iconSetOf('traffic-rimmed')!;
        const out = bindRulesToSet(set, [
            rule({ icon: 'up' }),
            rule({ icon: 'side' }),
            rule({ icon: 'down' }),
        ]);
        expect(out.map((r) => r.icon)).toEqual(['go', 'caution', 'stop']);
    });

    it('caps extra rules at the last icon', () => {
        const set = iconSetOf('traffic-rimmed')!;
        const out = bindRulesToSet(set, [rule(), rule(), rule(), rule()]);
        expect(out.map((r) => r.icon)).toEqual(['go', 'caution', 'stop', 'stop']);
    });

    it('keeps rules untouched for an empty set', () => {
        const out = bindRulesToSet({ ...defaultIconSet(), icons: [] }, [rule()]);
        expect(out).toHaveLength(1);
        expect(out[0]!.icon).toBeUndefined();
    });
});
