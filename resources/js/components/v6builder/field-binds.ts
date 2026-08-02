import type { Widget, WidgetConfig } from "./types";

export type FieldRef = {
  table: string;
  name: string;
  type: "number" | "text" | "date" | "boolean";
  measure?: boolean;
  datasetSlug?: string;
};

/** Data well a field can be dropped into. */
export type FieldRole = "axis" | "values" | "legend" | "tooltip" | "scatterX" | "scatterY" | "scatterSize";

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

/** Whether a field may be dropped into a role's well. */
export function roleEligible(ref: FieldRef, role: FieldRole): boolean {
  switch (role) {
    case "axis":
    case "legend":
      return !isValueField(ref);
    case "values":
    case "scatterX":
    case "scatterY":
    case "scatterSize":
      return isValueField(ref);
    case "tooltip":
      return true;
  }
}

/** Bound field name(s) for a role (single roles return a string, multi roles an array). */
export function roleBoundFields(widget: Widget | null, role: FieldRole): string | string[] | undefined {
  if (!widget) return role === "values" || role === "tooltip" ? [] : undefined;
  const c = widget.config;
  switch (role) {
    case "values": return widgetValueFields(c);
    case "tooltip": return c.dataTooltips ?? [];
    case "axis": return c.dataAxis;
    case "legend": return c.dataLegend;
    case "scatterX": return c.scatterX;
    case "scatterY": return c.scatterY;
    case "scatterSize": return c.scatterSize;
  }
}

/** Whether a field is currently bound in a given role. */
export function fieldBoundToRole(widget: Widget | null, ref: FieldRef, role: FieldRole): boolean {
  const bound = roleBoundFields(widget, role);
  if (Array.isArray(bound)) return bound.includes(ref.name);
  return bound === ref.name;
}

/** Overall bound state (used by the Data panel checkboxes). */
export function fieldBoundToWidget(widget: Widget | null, ref: FieldRef): boolean {
  if (!widget) return false;
  if (fieldBoundToRole(widget, ref, "tooltip")) return true;
  if (isValueField(ref)) {
    return fieldBoundToRole(widget, ref, "values") || fieldBoundToRole(widget, ref, "scatterX") || fieldBoundToRole(widget, ref, "scatterY") || fieldBoundToRole(widget, ref, "scatterSize");
  }
  const onDataset = !ref.datasetSlug || widget.config.datasetSlug === ref.datasetSlug;
  return onDataset && (fieldBoundToRole(widget, ref, "axis") || fieldBoundToRole(widget, ref, "legend"));
}

function setDatasetSlug(patch: Partial<WidgetConfig>, c: WidgetConfig, ref: FieldRef): Partial<WidgetConfig> {
  if (c.datasetSlug) return patch;
  return { ...patch, datasetSlug: ref.datasetSlug ?? c.datasetSlug };
}

function dropFromMulti(patch: Partial<WidgetConfig>, c: WidgetConfig, key: keyof WidgetConfig, name: string): Partial<WidgetConfig> {
  const list = c[key] as string[] | undefined;
  if (!list?.includes(name)) return patch;
  return { ...patch, [key]: list.filter((n) => n !== name) };
}

/**
 * Bind a field into a role's well. Multi roles append (no duplicates); single
 * roles replace. A field moved into a single dimension/value role is removed
 * from the other single roles and from values/tooltips when it would otherwise
 * be aggregated twice.
 */
export function bindFieldToRole(
  updateConfig: (id: string, patch: Partial<WidgetConfig>) => void,
  widget: Widget,
  ref: FieldRef,
  role: FieldRole,
): void {
  const c = widget.config;
  const name = ref.name;

  if (role === "values") {
    const values = widgetValueFields(c);
    if (values.includes(name)) return;
    const patch: Partial<WidgetConfig> = {
      ...setDatasetSlug({}, c, ref),
      dataValues: [...values, name],
      dataValue: values[0] ?? name,
      dataValueSources: { ...c.dataValueSources, [name]: ref.datasetSlug ?? c.datasetSlug ?? "" },
      scatterX: undefined,
      scatterY: undefined,
      scatterSize: undefined,
      ...dropFromMulti({}, c, "dataTooltips", name),
    };
    updateConfig(widget.id, patch);
    return;
  }

  if (role === "tooltip") {
    const tips = c.dataTooltips ?? [];
    const patch: Partial<WidgetConfig> = {
      ...setDatasetSlug({}, c, ref),
      dataTooltips: tips.includes(name) ? tips : [...tips, name],
    };
    updateConfig(widget.id, patch);
    return;
  }

  // single roles: axis / legend / scatterX / scatterY / scatterSize
  let patch: Partial<WidgetConfig>;
  switch (role) {
    case "axis": patch = { dataAxis: name, dataLegend: c.dataLegend === name ? undefined : c.dataLegend }; break;
    case "legend": patch = { dataLegend: name, dataAxis: c.dataAxis === name ? undefined : c.dataAxis }; break;
    case "scatterX": patch = { scatterX: name }; break;
    case "scatterY": patch = { scatterY: name }; break;
    default: patch = { scatterSize: name }; break;
  }
  if (role === "scatterX" || role === "scatterY" || role === "scatterSize") {
    // scatter widgets aggregate their own value fields; a value moved into
    // X/Y/Size leaves the values well and no stray values remain.
    patch.dataValues = undefined;
    patch.dataValue = undefined;
  }
  updateConfig(widget.id, { ...setDatasetSlug({}, c, ref), ...patch });
}

/** Remove a field (or the whole well when `name` is omitted) from a role. */
export function unbindFieldFromRole(
  updateConfig: (id: string, patch: Partial<WidgetConfig>) => void,
  widget: Widget,
  role: FieldRole,
  name?: string,
): void {
  const c = widget.config;
  if (role === "values") {
    const values = widgetValueFields(c);
    const rest = name ? values.filter((n) => n !== name) : [];
    const sources = { ...c.dataValueSources };
    if (name) delete sources[name];
    updateConfig(widget.id, { dataValues: rest, dataValue: rest[0], dataValueSources: sources });
    return;
  }
  if (role === "tooltip") {
    const tips = c.dataTooltips ?? [];
    const rest = name ? tips.filter((n) => n !== name) : [];
    updateConfig(widget.id, { dataTooltips: rest });
    return;
  }
  let patch: Partial<WidgetConfig> = {};
  switch (role) {
    case "axis": patch = { dataAxis: undefined }; break;
    case "legend": patch = { dataLegend: undefined }; break;
    case "scatterX": patch = { scatterX: undefined }; break;
    case "scatterY": patch = { scatterY: undefined }; break;
    default: patch = { scatterSize: undefined }; break;
  }
  updateConfig(widget.id, patch);
}

/** Legacy click-toggle (used by the Data panel checkbox / canvas drops). */
export function toggleFieldOnWidget(
  updateConfig: (id: string, patch: Partial<WidgetConfig>) => void,
  widget: Widget,
  ref: FieldRef,
): void {
  if (isValueField(ref)) {
    if (fieldBoundToRole(widget, ref, "values")) {
      unbindFieldFromRole(updateConfig, widget, "values", ref.name);
      return;
    }
    bindFieldToRole(updateConfig, widget, ref, "values");
    return;
  }
  if (fieldBoundToRole(widget, ref, "axis")) {
    const patch: Partial<WidgetConfig> = { dataAxis: undefined };
    if (widget.config.datasetSlug === ref.datasetSlug) patch.datasetSlug = undefined;
    updateConfig(widget.id, patch);
    return;
  }
  if (fieldBoundToRole(widget, ref, "legend")) {
    const patch: Partial<WidgetConfig> = { dataLegend: undefined };
    if (widget.config.datasetSlug === ref.datasetSlug) patch.datasetSlug = undefined;
    updateConfig(widget.id, patch);
    return;
  }
  bindFieldToRole(updateConfig, widget, ref, "axis");
}
