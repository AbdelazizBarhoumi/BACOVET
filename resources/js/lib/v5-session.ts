// V5 builder session helpers.
//
// V5 pages authenticate against the standalone `v5_users` guard. When an API
// call returns 401 (session lost, e.g. the shared session was invalidated),
// there is no server-side redirect for JSON requests, so we redirect the SPA
// to the V5 login page ourselves.

export function redirectToV5Login(): void {
    if (window.location.pathname !== '/v5/login') {
        window.location.assign('/v5/login');
    }
}

/** Redirect to /v5/login when the status indicates an expired V5 session. */
export function handleV5Error(status: number | null | undefined): boolean {
    if (status === 401) {
        redirectToV5Login();

        return true;
    }

    return false;
}

export function statusOfError(err: unknown): number | undefined {
    if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        typeof (err as { status: unknown }).status === 'number'
    ) {
        return (err as { status: number }).status;
    }
    const response = (err as { response?: { status?: number } })?.response;
    if (response && typeof response.status === 'number') {
        return response.status;
    }

    return undefined;
}

/** XSRF-TOKEN cookie value, URL-decoded, for state-changing requests. */
export function getV5CsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}
