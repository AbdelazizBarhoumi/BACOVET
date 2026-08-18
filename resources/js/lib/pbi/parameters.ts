import type { ReportParameter } from './store/state';

/** Non-null parameter values for the active page, keyed by parameter name. */
export function activeSelection(
    parameters: ReportParameter[],
    activePageId: string,
): Record<string, string[]> {
    const selection: Record<string, string[]> = {};
    for (const parameter of parameters) {
        if (parameter.pageId !== activePageId) continue;
        for (const value of parameter.value) {
            if (value === '') continue;
            selection[parameter.name] = [
                ...(selection[parameter.name] ?? []),
                value,
            ];
        }
    }
    return selection;
}

/** Stable fingerprint so dataset re-fetches only happen on real changes. */
export function selectionSignature(
    selection: Record<string, string[]>,
): string {
    return Object.keys(selection)
        .sort()
        .map((key) => `${key}=${[...selection[key]].sort().join('\u0001')}`)
        .join('&');
}

/**
 * Append the active selection to the datasets endpoint URL as `p[name][]=value`
 * (one indexed entry per selected value). Indexed keys are required: repeated
 * `p[name]=...` entries collapse to the last value when PHP parses the query,
 * so the server would only ever see one selected value.
 */
export function datasetsUrlWithSelection(
    selection: Record<string, string[]>,
    baseUrl = '/api/endpoint-datasets',
): string {
    const params = new URLSearchParams();
    for (const [name, values] of Object.entries(selection)) {
        for (const value of values) {
            params.append(`p[${name}][]`, value);
        }
    }
    const query = params.toString();
    return query === '' ? baseUrl : `${baseUrl}?${query}`;
}
