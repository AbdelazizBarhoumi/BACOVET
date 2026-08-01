/**
 * BACOVET Maintenance Panel API Service
 *
 * Fetches the artisan command allowlist and runs commands synchronously.
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
        const body = await response.json().catch(() => null);
        throw new Error(
            body?.message ||
                `Maintenance API Error: ${response.status} ${response.statusText}`,
        );
    }

    return response.json();
};

export type MaintenanceCommand = {
    id: string;
    label: string;
    signature: string;
    category: string;
    description: string;
    confirm: boolean;
};

export type MaintenanceRunResult = {
    success: boolean;
    command: string;
    label: string;
    exit_code: number | null;
    output: string | null;
    error: string | null;
};

export const fetchMaintenanceCommands = async (): Promise<
    MaintenanceCommand[]
> => {
    const result = await fetchWithToken(`${BASE_URL}/admin/maintenance/commands`);
    return result.commands || [];
};

export const startMaintenanceRun = async (
    commandId: string,
    token: string,
): Promise<MaintenanceRunResult> => {
    return fetchWithToken(`${BASE_URL}/admin/maintenance/run`, {
        method: 'POST',
        body: JSON.stringify({ command: commandId, token }),
    });
};
