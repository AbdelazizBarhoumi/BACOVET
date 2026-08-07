/**
 * BACOVET Admin API Service
 *
 * Handles administrative tasks: user management and audit logs.
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
