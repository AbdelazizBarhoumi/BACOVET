import type { Widget, WidgetConfig } from "./types";

export type FieldRef = {
  table: string;
  name: string;
  type: "number" | "text" | "date" | "boolean";
  measure?: boolean;
  datasetSlug?: string;
};

/** Effective value-field list: dataValues (preferred) or legacy single dataValue. */
export function widgetValueFields(c: WidgetConfig | undefined): string[] {
  if (!c) return [];
  if (c.dataValues?.length) return c.dataValues;
  return c.dataValue ? [c.dataValue] : [];
}

/** Value fields that can carry multiple entries per chart (number fields / measures). */
export function isValueField(ref: FieldRef): boolean {
  return ref.measure || ref.type === "number";
}

export function fieldBoundToWidget(
  widget: Widget | null,
  ref: FieldRef,
): boolean {
  if (!widget) return false;
  const c = widget.config;
  if (isValueField(ref)) return widgetValueFields(c).includes(ref.name);
  const onDataset = !ref.datasetSlug || c.datasetSlug === ref.datasetSlug;
  return onDataset && c.dataAxis === ref.name;
}

export function toggleFieldOnWidget(
  updateConfig: (id: string, patch: Partial<WidgetConfig>) => void,
  widget: Widget,
  ref: FieldRef,
): void {
  const c = widget.config;
  const bound = fieldBoundToWidget(widget, ref);

  if (isValueField(ref)) {
    const values = widgetValueFields(c);
    let next: string[];
    if (bound) {
      next = values.filter((name) => name !== ref.name);
    } else {
      next = [...values, ref.name];
    }
    const patch: Partial<WidgetConfig> = {
      dataValues: next,
      // keep legacy dataValue in sync with the first value for backward compat
      dataValue: next[0],
    };
    // remember each value's source endpoint (falls back to the widget dataset)
    if (bound) {
      if (c.dataValueSources?.[ref.name] !== undefined) {
        const rest = { ...c.dataValueSources };
        delete rest[ref.name];
        patch.dataValueSources = rest;
      }
    } else {
      patch.dataValueSources = { ...c.dataValueSources, [ref.name]: ref.datasetSlug ?? c.datasetSlug ?? "" };
    }
    if (c.dataAxis === ref.name) patch.dataAxis = undefined;
    if (!next.length && c.datasetSlug === ref.datasetSlug) patch.datasetSlug = undefined;
    if (next.length && !c.datasetSlug && ref.datasetSlug) patch.datasetSlug = ref.datasetSlug;
    // drop any per-field aggregation for a field that was just removed
    if (bound && c.dataAggregations?.[ref.name] !== undefined) {
      const rest = { ...c.dataAggregations };
      delete rest[ref.name];
      patch.dataAggregations = rest;
    }
    updateConfig(widget.id, patch);
    return;
  }

  if (bound) {
    const patch: Partial<WidgetConfig> = {};
    if (c.dataAxis === ref.name) patch.dataAxis = undefined;
    if (c.datasetSlug === ref.datasetSlug) patch.datasetSlug = undefined;
    updateConfig(widget.id, patch);
    return;
  }

  const patch: Partial<WidgetConfig> = {
    datasetSlug: ref.datasetSlug ?? c.datasetSlug,
    dataAxis: ref.name,
  };
  const values = widgetValueFields(c);
  if (values.includes(ref.name)) {
    const next = values.filter((name) => name !== ref.name);
    patch.dataValues = next;
    patch.dataValue = next[0];
  }
  updateConfig(widget.id, patch);
}
