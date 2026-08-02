import { describe, expect, it } from "vitest";
import type { Widget, WidgetConfig } from "./types";
import {
  bindFieldToRole,
  fieldBoundToRole,
  fieldBoundToWidget,
  roleEligible,
  unbindFieldFromRole,
  widgetValueFields,
  type FieldRef,
} from "./field-binds";

function makeWidget(config: Partial<WidgetConfig> = {}): Widget {
  return { id: "w1", type: "bar", x: 0, y: 0, w: 6, h: 4, config: { datasetSlug: "ds", ...config } };
}

function updater(widget: Widget) {
  return (id: string, patch: Partial<WidgetConfig>) => {
    widget.config = { ...widget.config, ...patch };
  };
}

const numRef: FieldRef = { table: "T", name: "amount", type: "number", datasetSlug: "ds" };
const numRef2: FieldRef = { table: "T", name: "units", type: "number", datasetSlug: "ds" };
const textRef: FieldRef = { table: "T", name: "region", type: "text", datasetSlug: "ds" };
const measureRef: FieldRef = { table: "Measures", name: "Total", type: "number", measure: true };

describe("roleEligible", () => {
  it("accepts numbers/measures for value and scatter roles", () => {
    expect(roleEligible(numRef, "values")).toBe(true);
    expect(roleEligible(numRef, "scatterX")).toBe(true);
    expect(roleEligible(measureRef, "scatterY")).toBe(true);
    expect(roleEligible(measureRef, "scatterSize")).toBe(true);
  });

  it("accepts dimensions for axis/legend and rejects them for values/scatter", () => {
    expect(roleEligible(textRef, "axis")).toBe(true);
    expect(roleEligible(textRef, "legend")).toBe(true);
    expect(roleEligible(textRef, "values")).toBe(false);
    expect(roleEligible(textRef, "scatterX")).toBe(false);
  });

  it("accepts every field type in the tooltip well", () => {
    expect(roleEligible(numRef, "tooltip")).toBe(true);
    expect(roleEligible(textRef, "tooltip")).toBe(true);
    expect(roleEligible(measureRef, "tooltip")).toBe(true);
  });
});

describe("widgetValueFields", () => {
  it("prefers dataValues and falls back to dataValue", () => {
    expect(widgetValueFields(makeWidget().config)).toEqual([]);
    expect(widgetValueFields(makeWidget({ dataValue: "a" }).config)).toEqual(["a"]);
    expect(widgetValueFields(makeWidget({ dataValues: ["a", "b"] }).config)).toEqual(["a", "b"]);
  });
});

describe("bindFieldToRole", () => {
  it("appends values and syncs dataValue / dataValueSources", () => {
    const w = makeWidget({});
    const update = updater(w);
    bindFieldToRole(update, w, numRef, "values");
    bindFieldToRole(update, w, numRef2, "values");
    expect(w.config.dataValues).toEqual(["amount", "units"]);
    expect(w.config.dataValue).toBe("amount");
    expect(w.config.dataValueSources).toMatchObject({ amount: "ds", units: "ds" });
  });

  it("does not duplicate a value already bound", () => {
    const w = makeWidget({ dataValues: ["amount"] });
    const update = updater(w);
    bindFieldToRole(update, w, numRef, "values");
    expect(w.config.dataValues).toEqual(["amount"]);
  });

  it("binds a single axis and clears a legend collision", () => {
    const w = makeWidget({ dataAxis: "other", dataLegend: "region" });
    const update = updater(w);
    bindFieldToRole(update, w, textRef, "axis");
    expect(w.config.dataAxis).toBe("region");
    expect(w.config.dataLegend).toBeUndefined();
  });

  it("binds a single legend and clears an axis collision", () => {
    const w = makeWidget({ dataAxis: "region" });
    const update = updater(w);
    bindFieldToRole(update, w, textRef, "legend");
    expect(w.config.dataLegend).toBe("region");
    expect(w.config.dataAxis).toBeUndefined();
  });

  it("moves a value bound to scatterX out of the values well", () => {
    const w = makeWidget({ dataValues: ["amount", "units"] });
    const update = updater(w);
    bindFieldToRole(update, w, numRef, "scatterX");
    expect(w.config.scatterX).toBe("amount");
    expect(w.config.dataValues).toBeUndefined();
    expect(w.config.dataValue).toBeUndefined();
  });

  it("appends tooltips without touching values", () => {
    const w = makeWidget({ dataValues: ["amount"] });
    const update = updater(w);
    bindFieldToRole(update, w, textRef, "tooltip");
    bindFieldToRole(update, w, numRef, "tooltip");
    expect(w.config.dataTooltips).toEqual(["region", "amount"]);
    expect(w.config.dataValues).toEqual(["amount"]);
  });

  it("sets the dataset slug when the widget has none", () => {
    const w = makeWidget({ datasetSlug: undefined });
    const update = updater(w);
    bindFieldToRole(update, w, numRef, "values");
    expect(w.config.datasetSlug).toBe("ds");
  });
});

describe("unbindFieldFromRole", () => {
  it("removes a single value and keeps the rest", () => {
    const w = makeWidget({ dataValues: ["amount", "units"], dataValue: "amount" });
    const update = updater(w);
    unbindFieldFromRole(update, w, "values", "amount");
    expect(w.config.dataValues).toEqual(["units"]);
    expect(w.config.dataValue).toBe("units");
  });

  it("clears a single role entirely", () => {
    const w = makeWidget({ dataAxis: "region" });
    const update = updater(w);
    unbindFieldFromRole(update, w, "axis");
    expect(w.config.dataAxis).toBeUndefined();
  });
});

describe("fieldBoundToWidget / fieldBoundToRole", () => {
  it("detects values, scatter and tooltip bindings for value fields", () => {
    const w = makeWidget({ dataValues: ["amount"], scatterY: "units" });
    expect(fieldBoundToRole(w, numRef, "values")).toBe(true);
    expect(fieldBoundToRole(w, numRef2, "scatterY")).toBe(true);
    expect(fieldBoundToWidget(w, numRef)).toBe(true);
    expect(fieldBoundToWidget(w, numRef2)).toBe(true);
  });

  it("detects axis/legend bindings for dimensions", () => {
    const w = makeWidget({ dataAxis: "region" });
    expect(fieldBoundToWidget(w, textRef)).toBe(true);
    const w2 = makeWidget({ dataLegend: "region" });
    expect(fieldBoundToWidget(w2, textRef)).toBe(true);
  });

  it("ignores foreign-dimension axis bindings on a different dataset", () => {
    const w = makeWidget({ dataAxis: "region" });
    const foreign: FieldRef = { table: "Other", name: "region", type: "text", datasetSlug: "other" };
    expect(fieldBoundToWidget(w, foreign)).toBe(false);
  });

  it("detects tooltip bindings for any field type", () => {
    const w = makeWidget({ dataTooltips: ["region"] });
    expect(fieldBoundToWidget(w, textRef)).toBe(true);
  });
});
