// Page-builder session helpers.
//
// Builder pages run under the main protected routes (auth middleware + users table).
// When an API call returns 401 (session lost or expired), there is no
// server-side redirect for JSON requests, so we redirect the SPA to the main
// login page ourselves.

export function redirectToLogin(): void {
    if (window.location.pathname !== '/login') {
        window.location.assign('/login');
    }
}

/** Redirect to the login page when the status indicates an expired session. */
export function handleApiError(status: number | null | undefined): boolean {
    if (status === 401) {
        redirectToLogin();

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
export function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}
