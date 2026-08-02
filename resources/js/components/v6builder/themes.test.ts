import { describe, expect, it } from "vitest";
import { captureTheme, mergeTheme, paletteOf, THEME_STYLE_KEYS } from "./themes";
import type { Widget } from "./types";

function widget(partial: Partial<Widget["config"]>): Widget {
  return { id: Math.random().toString(36).slice(2), type: "kpi", x: 0, y: 0, w: 3, h: 3, config: { ...partial } };
}

describe("mergeTheme", () => {
  it("fills unset keys from the theme", () => {
    const c = { label: "KPI" } as const;
    const out = mergeTheme({ ...c }, { defaults: { bg: "#111", fontFamily: "Inter" } });
    expect(out.bg).toBe("#111");
    expect(out.fontFamily).toBe("Inter");
  });

  it("lets the widget config win for set keys", () => {
    const c = { accent: "#123456", bg: "#fff" };
    const out = mergeTheme({ ...c }, { defaults: { accent: "#000000", bg: "#111" } });
    expect(out.accent).toBe("#123456");
    expect(out.bg).toBe("#fff");
  });

  it("returns the widget config unchanged without a theme", () => {
    const c = { accent: "#123456" };
    expect(mergeTheme({ ...c }, null)).toEqual(c);
    expect(mergeTheme({ ...c }, undefined)).toEqual(c);
  });
});

describe("paletteOf", () => {
  it("returns the palette when non-empty", () => {
    expect(paletteOf({ defaults: {}, palette: ["#f00", "#0f0"] })).toEqual(["#f00", "#0f0"]);
  });

  it("returns undefined when absent or empty", () => {
    expect(paletteOf({ defaults: {} })).toBeUndefined();
    expect(paletteOf({ defaults: {}, palette: [] })).toBeUndefined();
    expect(paletteOf(null)).toBeUndefined();
  });
});

describe("captureTheme", () => {
  it("picks the dominant value per style key", () => {
    const widgets = [
      widget({ accent: "#a11111" }),
      widget({ accent: "#b22222", fg: "#fff" }),
      widget({ accent: "#a11111", fg: "#fff" }),
      widget({ accent: "#a11111", fg: "#eee" }),
    ];
    const theme = captureTheme(widgets, "My theme");
    expect(theme.name).toBe("My theme");
    expect(theme.defaults.accent).toBe("#a11111");
    expect(theme.defaults.fg).toBe("#fff");
  });

  it("ignores undefined and skips missing keys", () => {
    const theme = captureTheme([widget({ bg: "#000" }), widget({ bg: "#000" })]);
    expect(theme.defaults.bg).toBe("#000");
    expect(theme.defaults.accent).toBeUndefined();
    expect(theme.defaults.fontFamily).toBeUndefined();
  });

  it("only touches curated style keys", () => {
    const theme = captureTheme([widget({ label: "KPI", unit: "%", accent: "#000" })]);
    expect(Object.keys(theme.defaults)).toEqual(["accent"]);
  });

  it("tracks only genuinely themeable keys", () => {
    expect(THEME_STYLE_KEYS).not.toContain("unit");
    expect(THEME_STYLE_KEYS).not.toContain("decimals");
    expect(THEME_STYLE_KEYS).toContain("fontFamily");
  });

  it("falls back to the first value on ties", () => {
    const widgets = [widget({ bg: "#aaa" }), widget({ bg: "#bbb" })];
    expect(captureTheme(widgets).defaults.bg).toBe("#aaa");
  });
});
