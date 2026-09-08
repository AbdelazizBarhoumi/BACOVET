import type { EndpointDataset } from '@/lib/pbi/datasets';
import type { State } from '@/lib/pbi/store';

export type PageProps = {
    pageId: number;
    slug: string;
    pageName: string;
    layout: { version?: number; pbi?: State } | null;
    layoutDraft?: { version?: number; pbi?: State } | null;
    layoutDraftUpdatedAt?: string | null;
    canEdit?: boolean;
    canManage?: boolean;
    isPublic?: boolean;
    published?: boolean;
};

/** A layout snapshot as persisted: the store state minus the shared measures. */
export type DraftPbi = Omit<State, 'measures'>;

export function parseInitialState(
    layout: PageProps['layout'],
): State | undefined {
    const pbi = layout?.pbi;
    if (!pbi || !Array.isArray(pbi.pages) || !pbi.pages.length)
        return undefined;
    return { ...pbi, ribbonTab: 'Insertion' };
}

export function formatDraftTime(value: string): string {
    const match = /(\d{2}):(\d{2})/.exec(value);
    if (match) return `${match[1]}:${match[2]}`;
    return value;
}

/**
 * Stable fingerprint of the fetched datasets. The page polls every 50s and
 * would otherwise rebuild every table + recompute all filtered rows on every
 * tick (new object identity) — causing lag and spurious highlight flashes even
 * when nothing changed. Skipping identical payloads keeps no-op polls free.
 */
export function datasetsSignature(list: EndpointDataset[]): string {
    return JSON.stringify(
        list.map((d) => [
            d.slug,
            d.name,
            d.label,
            d.object,
            d.object_type,
            d.source,
            d.status ?? '',
            d.row_count,
            d.last_synced_at ?? '',
            d.columns,
            d.params ?? {},
            d.sample_data,
        ]),
    );
}