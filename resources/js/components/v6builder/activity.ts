import type { Widget } from "./types";

export type ActivityMeta = {
  action?: string;
  page_id?: number;
  page_slug?: string;
  page_name?: string;
  group_id?: number | null;
  widget_id?: string;
  widget_type?: string;
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
  meta: Omit<ActivityMeta, "action" | "widget_id" | "widget_type"> = {},
  opts?: { key?: string; debounceMs?: number },
): void {
  logActivity(
    action,
    {
      widget_id: widget.id,
      widget_type: widget.type,
      ...meta,
    },
    opts,
  );
}
