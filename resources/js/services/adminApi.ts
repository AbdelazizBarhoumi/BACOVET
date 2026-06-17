/**
 * BACOVET Admin API Service
 *
 * Handles administrative tasks like job monitoring and execution.
 */

const BASE_URL = '';

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

const fetchWithToken = async (url: string, options: RequestInit = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(isStateChanging ? { 'X-XSRF-TOKEN': getCsrfToken() } : {}),
        },
    });

    if (!response.ok) {
        throw new Error(
            `Admin API Error: ${response.status} ${response.statusText}`,
        );
    }

    return response.json();
};

/**
 * Fetch all background jobs and their statuses
 */
export const fetchAllJobs = async () => {
    const result = await fetchWithToken(`${BASE_URL}/admin/jobs`);
    return result.data || result;
};

/**
 * Manually trigger a job execution
 * @param jobId The ID of the job to run
 */
export const runJobManually = async (jobId: string | number) => {
    return fetchWithToken(`${BASE_URL}/admin/jobs/${jobId}/run`);
};

/**
 * Fetch all users
 */
export const fetchAllUsers = async () => {
    return fetchWithToken(`${BASE_URL}/admin/users`);
};

/**
 * Create a new user
 */
export const createUser = async (userData: Record<string, unknown>) => {
    return fetchWithToken(`${BASE_URL}/admin/users`, {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

/**
 * Update an existing user
 */
export const updateUser = async (
    userId: string | number,
    userData: Record<string, unknown>,
) => {
    return fetchWithToken(`${BASE_URL}/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
    });
};

/**
 * Toggle user active status
 */
export const toggleUserStatus = async (userId: string | number) => {
    return fetchWithToken(`${BASE_URL}/admin/users/${userId}/toggle`, {
        method: 'PATCH',
    });
};

/**
 * Delete a user
 */
export const deleteUser = async (userId: string | number) => {
    return fetchWithToken(`${BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
    });
};

/**
 * Fetch all screens
 */
export const fetchAllScreens = async () => {
    return fetchWithToken(`${BASE_URL}/admin/screens`);
};

/**
 * Create a new screen
 */
export const createScreen = async (screenData: Record<string, unknown>) => {
    return fetchWithToken(`${BASE_URL}/admin/screens`, {
        method: 'POST',
        body: JSON.stringify(screenData),
    });
};

/**
 * Update a screen
 */
export const updateScreen = async (
    screenId: string | number,
    screenData: Record<string, unknown>,
) => {
    return fetchWithToken(`${BASE_URL}/admin/screens/${screenId}`, {
        method: 'PUT',
        body: JSON.stringify(screenData),
    });
};

/**
 * Delete a screen
 */
export const deleteScreen = async (screenId: string | number) => {
    return fetchWithToken(`${BASE_URL}/admin/screens/${screenId}`, {
        method: 'DELETE',
    });
};

// ─── Sync Config ────────────────────────────────────────────────────────────

export type SyncConfigItem = {
    key: string;
    value: string;
    description: string | null;
    updated_at: string;
};

/**
 * Fetch all sync interval configurations
 */
export const fetchSyncConfig = async (): Promise<SyncConfigItem[]> => {
    const result = await fetchWithToken(`${BASE_URL}/admin/sync-config`);
    return result.data || result;
};

/**
 * Update a sync interval configuration
 */
export const updateSyncConfig = async (key: string, value: number) => {
    return fetchWithToken(`${BASE_URL}/admin/sync-config/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
    });
};

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export type AuditLogEntry = {
    id: number;
    user_id: number | null;
    action_type: string;
    message: string;
    ip_address: string | null;
    created_at: string;
    user?: { id: number; name: string; matricule: string } | null;
};

// ─── Manual KPI Values ──────────────────────────────────────────────────────

export type ManualKpiEntry = {
    kpi_key: string;
    kpi_label: string;
    value: number | null;
    numerator: number | null;
    denominator: number | null;
    updated_at: string | null;
    updated_by: string | null;
};

export const fetchManualKpiValues = async (): Promise<ManualKpiEntry[]> => {
    const result = await fetchWithToken(`${BASE_URL}/admin/kpi-values`);
    return result.data || result;
};

export const updateManualKpiValue = async (
    key: string,
    numerator: number,
    denominator: number,
) => {
    return fetchWithToken(`${BASE_URL}/admin/kpi-values/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ numerator, denominator }),
    });
};

/**
 * Fetch server-side audit logs (paginated, latest first)
 */
export const fetchAuditLogs = async (): Promise<AuditLogEntry[]> => {
    const result = await fetchWithToken(`${BASE_URL}/admin/audit-logs`);
    return result.data?.data || result.data || result;
};

/**
 * Create a server-side audit log entry
 */
export const createAuditLog = async (actionType: string, message: string) => {
    return fetchWithToken(`${BASE_URL}/admin/audit-logs`, {
        method: 'POST',
        body: JSON.stringify({ action_type: actionType, message }),
    });
};

/**
 * Clear audit logs (keeps a self-referencing entry of who cleared)
 */
export const clearAuditLogs = async () => {
    return fetchWithToken(`${BASE_URL}/admin/audit-logs`, {
        method: 'DELETE',
    });
};

// ─── Pipeline Supervision ─────────────────────────────────────────────────

export type PipelineStatus = {
    name: string;
    status: 'online' | 'offline' | 'degraded';
    last_sync: string | null;
    total_rows: number;
    last_error: string | null;
};

export type PipelineLogEntry = {
    id: number;
    job_class: string;
    table_name: string | null;
    rows_synced: number;
    status: 'ok' | 'error' | 'skipped';
    message: string | null;
    duration_ms: number;
    executed_at: string;
};

export const fetchPipelineStatus = async (): Promise<PipelineStatus[]> => {
    return fetchWithToken(`${BASE_URL}/admin/pipeline/status`);
};

export const fetchPipelineLogs = async (
    limit = 100,
): Promise<PipelineLogEntry[]> => {
    return fetchWithToken(`${BASE_URL}/admin/pipeline/logs?limit=${limit}`);
};

export const triggerSourceSync = async (source: string) => {
    return fetchWithToken(`${BASE_URL}/admin/pipeline/sync/${source}`, {
        method: 'POST',
    });
};

// ─── User Enhancements ────────────────────────────────────────────────────

export const resetUserPassword = async (userId: string | number) => {
    return fetchWithToken(`${BASE_URL}/admin/users/${userId}/reset-password`, {
        method: 'POST',
    });
};

export const fetchUserSessions = async (userId: string | number) => {
    return fetchWithToken(`${BASE_URL}/admin/users/${userId}/sessions`);
};

// ─── Audit Export ─────────────────────────────────────────────────────────

export const exportAuditLogs = async (filters?: {
    user?: number;
    action?: string;
    from?: string;
    to?: string;
}) => {
    const params = new URLSearchParams();
    if (filters?.user) params.set('user', String(filters.user));
    if (filters?.action) params.set('action', filters.action);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);

    const response = await fetch(
        `${BASE_URL}/admin/audit-logs/export?${params.toString()}`,
        {
            headers: {
                Accept: 'text/csv',
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    );

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
};

// ─── Lead Time Config ─────────────────────────────────────────────────────

export type LtConfigEntry = {
    id: number;
    destination: string;
    lt_transport_jours: number;
    strh_jours: number;
    total_lt: number;
    updated_by: number | null;
    updated_at: string;
    updater?: { id: number; name: string } | null;
};

export const fetchLtConfig = async (): Promise<LtConfigEntry[]> => {
    return fetchWithToken(`${BASE_URL}/admin/lt-config`);
};

export const createLtConfig = async (data: {
    destination: string;
    lt_transport_jours: number;
    strh_jours: number;
}) => {
    return fetchWithToken(`${BASE_URL}/admin/lt-config`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updateLtConfig = async (
    id: number,
    data: { lt_transport_jours: number; strh_jours: number },
) => {
    return fetchWithToken(`${BASE_URL}/admin/lt-config/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deleteLtConfig = async (id: number) => {
    return fetchWithToken(`${BASE_URL}/admin/lt-config/${id}`, {
        method: 'DELETE',
    });
};
