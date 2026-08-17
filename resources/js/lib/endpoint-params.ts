/**
 * Query-string helpers for endpoint parameter selection.
 */

/**
 * Set (or add) a single query parameter in a URL, preserving every other
 * part of the URL (scheme, host, port, path, remaining query params).
 */
export function setQueryParam(
    url: string,
    name: string,
    value: string,
): string {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return url;
    }

    parsed.searchParams.set(name, value);
    parsed.search = parsed.searchParams.toString();

    return parsed.toString();
}

/**
 * Extract the query parameters of a URL as a record.
 */
export function extractQueryParams(url: string): Record<string, string> {
    try {
        const parsed = new URL(url);
        const result: Record<string, string> = {};
        parsed.searchParams.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    } catch {
        return {};
    }
}
