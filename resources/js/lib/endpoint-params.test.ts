import { describe, expect, it } from 'vitest';
import { extractQueryParams, setQueryParam } from './endpoint-params';

const BASE =
    'https://bacovet-3216.eu1.netbird.services/data/kpi/efficience-chaine';

describe('setQueryParam', () => {
    it('replaces an existing parameter value', () => {
        expect(setQueryParam(`${BASE}?chaine=CH01`, 'chaine', 'CH02')).toBe(
            `${BASE}?chaine=CH02`,
        );
    });

    it('preserves the other query parameters', () => {
        expect(
            setQueryParam(
                `${BASE}?chaine=CH01&limit=100&offset=0`,
                'chaine',
                'CH03',
            ),
        ).toBe(`${BASE}?chaine=CH03&limit=100&offset=0`);
    });

    it('appends the parameter when it is not present', () => {
        expect(setQueryParam(`${BASE}?limit=100`, 'chaine', 'CH01')).toBe(
            `${BASE}?limit=100&chaine=CH01`,
        );
    });

    it('appends a query string when the URL has none', () => {
        expect(setQueryParam(BASE, 'chaine', 'CH01')).toBe(
            `${BASE}?chaine=CH01`,
        );
    });

    it('keeps the original URL when it is not parseable', () => {
        expect(setQueryParam('not-a-url', 'chaine', 'CH01')).toBe('not-a-url');
    });

    it('handles a URL with a port', () => {
        expect(
            setQueryParam(
                'https://host.example:8443/api/x?chaine=CH01',
                'chaine',
                'CH02',
            ),
        ).toBe('https://host.example:8443/api/x?chaine=CH02');
    });
});

describe('extractQueryParams', () => {
    it('returns an empty record for a URL without a query', () => {
        expect(extractQueryParams(BASE)).toEqual({});
    });

    it('returns the query parameters of a URL', () => {
        expect(extractQueryParams(`${BASE}?chaine=CH01&limit=100`)).toEqual({
            chaine: 'CH01',
            limit: '100',
        });
    });

    it('returns an empty record for an unparseable URL', () => {
        expect(extractQueryParams('not-a-url')).toEqual({});
    });
});
