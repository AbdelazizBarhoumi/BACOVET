import type { Widget } from "@/components/builder/types";

export type ActivityMeta = {
  action?: string;
  page_id?: number;
  page_slug?: string;
  page_name?: string;
  group_id?: number | null;
  widget_id?: string;
  widget_type?: string;
  kpi_code?: string;
  detail?: Record<string, unknown>;
};

function getCsrfToken(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

let pageCtx: { page_id?: number; page_slug?: string; page_name?: string } = {};

export function setPageContext(ctx: { page_id?: number; page_slug?: string; page_name?: string }): void {
  pageCtx = ctx;
}

export function widgetKpiCodes(widget: Widget): string[] {
  const codes: string[] = [];
  if (widget.config?.kpiCode) codes.push(widget.config.kpiCode);
  for (const cell of widget.config?.tableGrid?.cells ?? []) {
    if (cell.kpiCode) codes.push(cell.kpiCode);
  }
  return [...new Set(codes)];
}

function send(meta: ActivityMeta): void {
  fetch("/api/builder-activity", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": getCsrfToken(),
    },
    body: JSON.stringify(meta),
  }).catch(() => {});
}

type Pending = { meta: ActivityMeta; timer: ReturnType<typeof setTimeout> };
const debounceQueue = new Map<string, Pending>();

/**
 * Fire-and-forget activity trace.
 * - Without `key`: sent immediately.
 * - With `key`: debounced (default 800ms) and merged, so typing in a cell or
 *   dragging a widget doesn't spam the DB. Later calls for the same key replace
 *   `detail` fields but keep earlier ones.
 */
export function logActivity(
  action: string,
  meta: Omit<ActivityMeta, "action"> = {},
  opts: { key?: string; debounceMs?: number } = {},
): void {
  const full: ActivityMeta = { ...pageCtx, ...meta, action };

  if (!opts.key) {
    send(full);
    return;
  }

  const debounceMs = opts.debounceMs ?? 800;
  const existing = debounceQueue.get(opts.key);

  if (existing) {
    clearTimeout(existing.timer);
    existing.meta = {
      ...existing.meta,
      ...full,
      detail: { ...(existing.meta.detail ?? {}), ...(full.detail ?? {}) },
    };
    existing.timer = setTimeout(() => {
      debounceQueue.delete(opts.key!);
      send(existing.meta);
    }, debounceMs);
  } else {
    const entry: Pending = {
      meta: full,
      timer: setTimeout(() => {
        debounceQueue.delete(opts.key!);
        send(full);
      }, debounceMs),
    };
    debounceQueue.set(opts.key, entry);
  }
}

export function logWidgetActivity(
  action: string,
  widget: Widget,
  meta: Omit<ActivityMeta, "action" | "widget_id" | "widget_type" | "kpi_code"> = {},
  opts?: { key?: string; debounceMs?: number },
): void {
  const codes = widgetKpiCodes(widget);
  logActivity(
    action,
    {
      widget_id: widget.id,
      widget_type: widget.type,
      kpi_code: codes.length ? codes.join(",") : undefined,
      ...meta,
    },
    opts,
  );
}
