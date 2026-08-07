// Page builder — client-side activity trace.
//
// Mirror of lib/activity.ts but posting to the page-builder channel (/api/activity,
// under the main protected routes). Identity (user, ip, user-agent,
// timestamp) is always stamped server-side for trust.

import { getCsrfToken } from '@/lib/session';

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

function send(meta: ActivityMeta): void {
    fetch('/api/activity', {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(meta),
    }).catch(() => {
        // fire-and-forget: trace must never block editing
    });
}

type Pending = { meta: ActivityMeta; timer: ReturnType<typeof setTimeout> };
const debounceQueue = new Map<string, Pending>();

let pageCtx: Pick<ActivityMeta, 'page_id' | 'page_slug' | 'page_name'> = {};

/** Bind the currently-open builder page so widget events are attributed to it. */
export function setPageContext(ctx: {
    page_id?: number;
    page_slug?: string;
    page_name?: string;
}): void {
    pageCtx = ctx;
}

/** Log a widget-scoped event, inheriting the open page context. */
export function logWidgetActivity(
    action: string,
    widget: { id: string; type: string; kpi_code?: string },
    meta: Omit<ActivityMeta, 'action' | 'widget_id' | 'widget_type' | 'kpi_code'> = {},
    opts?: { key?: string; debounceMs?: number },
): void {
    logActivity(
        action,
        {
            ...pageCtx,
            widget_id: widget.id,
            widget_type: widget.type,
            kpi_code: widget.kpi_code,
            ...meta,
        },
        opts,
    );
}

/**
 * Fire-and-forget activity trace.
 * - Without `key`: sent immediately.
 * - With `key`: debounced (default 800ms) and merged, so rapid edits don't
 *   spam the DB. Later calls for the same key replace `detail` fields but
 *   keep earlier ones.
 */
export function logActivity(
    action: string,
    meta: Omit<ActivityMeta, 'action'> = {},
    opts: { key?: string; debounceMs?: number } = {},
): void {
    const full: ActivityMeta = { ...meta, action };

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