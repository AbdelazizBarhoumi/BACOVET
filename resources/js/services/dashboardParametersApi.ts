import { handleApiError } from '@/lib/session';

export type DashboardParameter = {
    root: string;
    name: string;
    values: string[];
    current: string | null;
    affected_slugs: string[];
};

export async function fetchDashboardParameters(
    signal?: AbortSignal,
): Promise<DashboardParameter[]> {
    const res = await fetch('/api/dashboard-parameters', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal,
    });
    if (!res.ok) {
        handleApiError(res.status);
        throw new Error(`HTTP ${res.status}`);
    }
    const body: unknown = await res.json();
    if (
        body &&
        typeof body === 'object' &&
        'parameters' in body &&
        Array.isArray((body as { parameters: unknown }).parameters)
    ) {
        return (body as { parameters: DashboardParameter[] }).parameters;
    }
    return [];
}
