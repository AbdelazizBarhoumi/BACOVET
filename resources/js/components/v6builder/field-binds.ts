import type { Widget, WidgetConfig } from "./types";

export type FieldRef = {
  table: string;
  name: string;
  type: "number" | "text" | "date" | "boolean";
  measure?: boolean;
  datasetSlug?: string;
};

export function fieldBoundToWidget(
  widget: Widget | null,
  ref: FieldRef,
): boolean {
  if (!widget) return false;
  const c = widget.config;
  if (ref.measure) return c.dataValue === ref.name;
  const onDataset = !ref.datasetSlug || c.datasetSlug === ref.datasetSlug;
  return onDataset && (c.dataAxis === ref.name || c.dataValue === ref.name);
}

export function toggleFieldOnWidget(
  updateConfig: (id: string, patch: Partial<WidgetConfig>) => void,
  widget: Widget,
  ref: FieldRef,
): void {
  const c = widget.config;
  const bound = fieldBoundToWidget(widget, ref);

  if (ref.measure) {
    updateConfig(widget.id, { dataValue: bound ? undefined : ref.name });
    return;
  }

  if (bound) {
    const patch: Partial<WidgetConfig> = {};
    if (c.dataAxis === ref.name) patch.dataAxis = undefined;
    if (c.dataValue === ref.name) patch.dataValue = undefined;
    if (c.datasetSlug === ref.datasetSlug) patch.datasetSlug = undefined;
    updateConfig(widget.id, patch);
    return;
  }

  const patch: Partial<WidgetConfig> = {
    datasetSlug: ref.datasetSlug ?? c.datasetSlug,
  };
  if (ref.type === "number") {
    patch.dataValue = ref.name;
    if (c.dataAxis === ref.name) patch.dataAxis = undefined;
  } else {
    patch.dataAxis = ref.name;
    if (c.dataValue === ref.name) patch.dataValue = undefined;
  }
  updateConfig(widget.id, patch);
}
