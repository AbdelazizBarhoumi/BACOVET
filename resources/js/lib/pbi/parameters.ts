import type { ReportParameter } from './store/state';

/** Non-null parameter values for the active page, keyed by parameter name. */
export function activeSelection(
    parameters: ReportParameter[],
    activePageId: string,
): Record<string, string> {
    const selection: Record<string, string> = {};
    for (const parameter of parameters) {
        if (parameter.pageId !== activePageId) continue;
        if (parameter.value === null || parameter.value === '') continue;
        selection[parameter.name] = parameter.value;
    }
    return selection;
}

/** Stable fingerprint so dataset re-fetches only happen on real changes. */
export function selectionSignature(selection: Record<string, string>): string {
    return Object.keys(selection)
        .sort()
        .map((key) => `${key}=${selection[key]}`)
        .join('&');
}

/**
 * Append the active selection to the datasets endpoint URL as `p[name]=value`,
 * matching what EndpointDatasetController::index expects.
 */
export function datasetsUrlWithSelection(
    selection: Record<string, string>,
    baseUrl = '/api/endpoint-datasets',
): string {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(selection)) {
        params.append(`p[${name}]`, value);
    }
    const query = params.toString();
    return query === '' ? baseUrl : `${baseUrl}?${query}`;
}
