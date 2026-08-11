export type EndpointFormFields = {
    baseUrl: string;
    path: string;
};

export function splitEndpointUrl(url: string): {
    root: string;
    path: string;
} {
    try {
        const u = new URL(url);
        return {
            root: `${u.protocol}//${u.host}`,
            path: `${u.pathname}${u.search}`.replace(/^\/+/, ''),
        };
    } catch {
        return { root: '', path: url };
    }
}

export function splitFormFields(
    url: string,
    defaultRoot: string,
): EndpointFormFields {
    const normalized = (value: string) =>
        value.replace(/\/+$/, '').toLowerCase();
    const endpoint = normalized(url);
    const root = normalized(defaultRoot);
    if (root && (endpoint === root || endpoint.startsWith(`${root}/`))) {
        return {
            baseUrl: '',
            path: endpoint.slice(root.length).replace(/^\/+/, ''),
        };
    }
    const split = splitEndpointUrl(url);
    return { baseUrl: split.root, path: split.path };
}
