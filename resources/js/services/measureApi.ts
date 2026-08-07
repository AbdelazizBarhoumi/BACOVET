// Typed client for the shared measure library API (page builder).
// Endpoints: GET/POST /api/measures, PUT/DELETE /api/measures/{id}.

import { handleApiError } from '@/lib/session';

export type MeasureRecord = {
    id: number;
    name: string;
    expression: string;
    category: string | null;
    description: string | null;
    config?: string | null | Record<string, unknown>;
    created_at?: string | null;
    updated_at?: string | null;
};

export type MeasurePayload = {
    name: string;
    expression: string;
    category?: string | null;
    description?: string | null;
    config?: string | null | Record<string, unknown>;
};

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(init?.method && init.method !== 'GET'
                ? { 'X-XSRF-TOKEN': getCsrfToken() }
                : {}),
            ...(init?.headers ?? {}),
        },
    });
    if (!res.ok) {
        handleApiError(res.status);
        let message = `HTTP ${res.status}`;
        try {
            const body: unknown = await res.json();
            if (
                body &&
                typeof body === 'object' &&
                'message' in body &&
                typeof (body as { message: unknown }).message === 'string'
            ) {
                message = (body as { message: string }).message;
            } else if (body && typeof body === 'object' && 'errors' in body) {
                const errors = (body as { errors: Record<string, string[]> })
                    .errors;
                const first = Object.values(errors)[0]?.[0];
                if (first) message = first;
            }
        } catch {
            // fall back to the status-based message
        }
        throw new Error(message);
    }
    return (await res.json()) as T;
}

export async function fetchMeasures(): Promise<MeasureRecord[]> {
    const body = await request<{ measures: MeasureRecord[] }>(
        '/api/measures',
    );
    return body.measures ?? [];
}

export async function createMeasure(
    payload: MeasurePayload,
): Promise<MeasureRecord> {
    const body = await request<{ measure: MeasureRecord }>('/api/measures', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return body.measure;
}

export async function updateMeasure(
    id: number | string,
    payload: MeasurePayload,
): Promise<MeasureRecord> {
    const body = await request<{ measure: MeasureRecord }>(
        `/api/measures/${id}`,
        {
            method: 'PUT',
            body: JSON.stringify(payload),
        },
    );
    return body.measure;
}

export async function deleteMeasure(id: number | string): Promise<void> {
    await request<{ message: string }>(`/api/measures/${id}`, {
        method: 'DELETE',
    });
}
