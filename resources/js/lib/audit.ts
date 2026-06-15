// Audit log service — writes to backend DB via API.
// Client-side localStorage is only used as offline fallback cache.

export type AuditLevel = 'INFO' | 'WARN' | 'ERROR' | 'USER' | 'SYSTEM';
export type AuditEntry = { t: string; lvl: AuditLevel; msg: string };

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export async function pushAudit(lvl: AuditLevel, msg: string): Promise<void> {
    try {
        await fetch('/admin/audit-logs', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify({ action_type: lvl, message: msg }),
        });
    } catch {
        // Silently fail — audit is best-effort
    }
}

export async function getAudit(): Promise<AuditEntry[]> {
    try {
        const res = await fetch('/admin/audit-logs', {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        if (!res.ok) return [];
        const json = await res.json();
        const logs = json.data?.data || json.data || [];
        return logs.map((log: Record<string, unknown>) => ({
            t: new Date(log.created_at as string).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }),
            lvl: log.action_type as AuditLevel,
            msg: log.message as string,
        }));
    } catch {
        return [];
    }
}

export async function clearAudit(): Promise<void> {
    try {
        await fetch('/admin/audit-logs', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
        });
    } catch {
        // Silently fail
    }
}
