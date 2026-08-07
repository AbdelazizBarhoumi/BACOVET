// Typed client for the shared cross-table join library (page builder).
// Endpoints: GET/POST /api/joins, DELETE /api/joins/{id}.

import { handleApiError } from '@/lib/session';

export type JoinRecord = {
    id: number;
    table_a: string;
    column_a: string;
    table_b: string;
    column_b: string;
    trim_compare: boolean;
    created_at?: string | null;
    updated_at?: string | null;
};

export type JoinPayload = {
    table_a: string;
    column_a: string;
    table_b: string;
    column_b: string;
    trim_compare?: boolean;
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
            }
        } catch {
            // fall back to the status-based message
        }
        throw new Error(message);
    }
    return (await res.json()) as T;
}

export async function fetchJoins(): Promise<JoinRecord[]> {
    const body = await request<{ joins: JoinRecord[] }>('/api/joins');
    return body.joins ?? [];
}

export async function createJoin(payload: JoinPayload): Promise<JoinRecord> {
    const body = await request<{ join: JoinRecord }>('/api/joins', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return body.join;
}

export async function deleteJoin(id: number | string): Promise<void> {
    await request<{ message: string }>(`/api/joins/${id}`, {
        method: 'DELETE',
    });
}
