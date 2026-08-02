import type { DashboardTheme, Widget, WidgetConfig } from "./types";

/**
 * The curated style keys a page theme manages. These are the keys that fresh
 * widgets do NOT set via DEFAULT_CONFIG_FOR, so a fill-only-unset theme can
 * still visibly restyle them. Data keys (unit, decimals, target, …) are never
 * themed.
 */
export const THEME_STYLE_KEYS: (keyof WidgetConfig)[] = [
  "accent",
  "bg",
  "bgGradient",
  "fg",
  "borderColor",
  "fontFamily",
  "fontWeight",
  "fontSize",
  "labelColor",
  "shadow",
];

/** Render-time merge: theme fills unset keys, the widget's own config wins. */
export function mergeTheme(c: WidgetConfig, theme: DashboardTheme | null | undefined): WidgetConfig {
  return { ...(theme?.defaults ?? {}), ...c };
}

/** Series palette from the theme, or undefined when the theme has none. */
export function paletteOf(theme: DashboardTheme | null | undefined): string[] | undefined {
  return theme?.palette && theme.palette.length > 0 ? theme.palette : undefined;
}

/**
 * Build a theme by capturing the dominant (most frequent) non-undefined value
 * of each style key across the current widgets.
 */
export function captureTheme(widgets: Widget[], name?: string): DashboardTheme {
  const counts = new Map<keyof WidgetConfig, Map<unknown, number>>();
  const first = new Map<keyof WidgetConfig, unknown>();
  const seen = new Map<keyof WidgetConfig, Set<unknown>>();

  for (const w of widgets) {
    for (const key of THEME_STYLE_KEYS) {
      const value = w.config[key];
      if (value === undefined) continue;
      if (!first.has(key)) first.set(key, value);
      let values = seen.get(key);
      if (!values) {
        values = new Set();
        seen.set(key, values);
      }
      if (values.has(value)) continue;
      values.add(value);
      const map = counts.get(key) ?? new Map<unknown, number>();
      map.set(value, (map.get(value) ?? 0) + 1);
      counts.set(key, map);
    }
  }

  const defaults: Partial<WidgetConfig> = {};
  const rec = defaults as Record<string, unknown>;
  for (const key of THEME_STYLE_KEYS) {
    const map = counts.get(key);
    if (!map) continue;
    let best: unknown = first.get(key);
    let bestCount = 0;
    for (const [value, count] of map) {
      if (count > bestCount) {
        best = value;
        bestCount = count;
      }
    }
    rec[key as string] = best;
  }

  return { name, defaults };
}
