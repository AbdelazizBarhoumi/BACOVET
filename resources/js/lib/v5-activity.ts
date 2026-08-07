// V5 page builder — client-side activity trace.
//
// Mirror of lib/activity.ts but POSTing to the standalone V5 channel
// (/api/v5-activity, guarded by the `v5_users` session). Identity (user,
// ip, user-agent, timestamp) is always stamped server-side for trust.

import { getV5CsrfToken } from '@/lib/v5-session';

export type V5ActivityMeta = {
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

function send(meta: V5ActivityMeta): void {
    fetch('/api/v5-activity', {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getV5CsrfToken(),
        },
        body: JSON.stringify(meta),
    }).catch(() => {
        // fire-and-forget: trace must never block editing
    });
}

type Pending = { meta: V5ActivityMeta; timer: ReturnType<typeof setTimeout> };
const debounceQueue = new Map<string, Pending>();

let pageCtx: Pick<V5ActivityMeta, 'page_id' | 'page_slug' | 'page_name'> = {};

/** Bind the currently-open V5 page so widget events are attributed to it. */
export function setV5PageContext(ctx: {
    page_id?: number;
    page_slug?: string;
    page_name?: string;
}): void {
    pageCtx = ctx;
}

/** Log a widget-scoped event, inheriting the open page context. */
export function logV5WidgetActivity(
    action: string,
    widget: { id: string; type: string; kpi_code?: string },
    meta: Omit<V5ActivityMeta, 'action' | 'widget_id' | 'widget_type' | 'kpi_code'> = {},
    opts?: { key?: string; debounceMs?: number },
): void {
    logV5Activity(
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
 * Fire-and-forget V5 activity trace.
 * - Without `key`: sent immediately.
 * - With `key`: debounced (default 800ms) and merged, so rapid edits don't
 *   spam the DB. Later calls for the same key replace `detail` fields but
 *   keep earlier ones.
 */
export function logV5Activity(
    action: string,
    meta: Omit<V5ActivityMeta, 'action'> = {},
    opts: { key?: string; debounceMs?: number } = {},
): void {
    const full: V5ActivityMeta = { ...meta, action };

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