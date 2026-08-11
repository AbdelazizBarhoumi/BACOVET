/** Empty-root label used when an endpoint URL has no parseable host. */
export const UNKNOWN_ROOT = '(inconnu)';

export function extractRoot(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.port
            ? `${parsed.protocol}//${parsed.hostname}:${parsed.port}`
            : `${parsed.protocol}//${parsed.hostname}`;
    } catch {
        return '';
    }
}

export function isDefaultRoot(root: string, defaultRoot: string): boolean {
    if (!root || !defaultRoot) return false;
    const normalize = (value: string) =>
        value.replace(/\/+$/, '').toLowerCase();
    return normalize(root) === normalize(defaultRoot);
}

export function normalizeRoot(root: string): string {
    return root.replace(/\/+$/, '').toLowerCase();
}
