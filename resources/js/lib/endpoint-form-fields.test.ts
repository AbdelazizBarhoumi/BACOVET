import { describe, expect, it } from 'vitest';
import { splitEndpointUrl, splitFormFields } from './endpoint-form-fields';

const DEFAULT_ROOT = 'https://bacovet.eu1.netbird.services';

describe('splitFormFields', () => {
    it('returns an empty baseUrl when the endpoint uses the default root', () => {
        expect(
            splitFormFields(
                `${DEFAULT_ROOT}/api/data/sdt/q_wip_chaine?limit=100&offset=0`,
                DEFAULT_ROOT,
            ),
        ).toEqual({
            baseUrl: '',
            path: 'api/data/sdt/q_wip_chaine?limit=100&offset=0',
        });
    });

    it('returns an empty baseUrl when the endpoint equals the default root', () => {
        expect(splitFormFields(`${DEFAULT_ROOT}`, DEFAULT_ROOT)).toEqual({
            baseUrl: '',
            path: '',
        });
    });

    it('fills the baseUrl when the endpoint uses a custom root', () => {
        expect(
            splitFormFields(
                'https://cdn.example.com/v2/data/itemtrxenq',
                DEFAULT_ROOT,
            ),
        ).toEqual({
            baseUrl: 'https://cdn.example.com',
            path: 'v2/data/itemtrxenq',
        });
    });

    it('treats a trailing slash on either side as equal', () => {
        expect(
            splitFormFields(
                `${DEFAULT_ROOT}/api/data/itemtrxenq`,
                `${DEFAULT_ROOT}/`,
            ),
        ).toEqual({ baseUrl: '', path: 'api/data/itemtrxenq' });
    });

    it('matches a path-based default root', () => {
        expect(
            splitFormFields(
                'https://bacovet.eu1.netbird.services/api/data/x',
                'https://bacovet.eu1.netbird.services/api',
            ),
        ).toEqual({ baseUrl: '', path: 'data/x' });
    });

    it('does not treat a similar-but-longer host as the default root', () => {
        expect(
            splitFormFields(
                'https://bacovet.eu1.netbird.servicesX/api/data/x',
                DEFAULT_ROOT,
            ),
        ).toEqual({
            baseUrl: 'https://bacovet.eu1.netbird.servicesx',
            path: 'api/data/x',
        });
    });

    it('keeps the original URL as path when it is not parseable', () => {
        expect(splitFormFields('api/data/x', '')).toEqual({
            baseUrl: '',
            path: 'api/data/x',
        });
    });
});

describe('splitEndpointUrl', () => {
    it('splits into host root and remainder', () => {
        expect(
            splitEndpointUrl(`${DEFAULT_ROOT}/api/data/x?limit=5`),
        ).toEqual({
            root: DEFAULT_ROOT,
            path: 'api/data/x?limit=5',
        });
    });
});
