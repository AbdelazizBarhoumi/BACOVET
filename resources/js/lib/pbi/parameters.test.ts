import { describe, expect, it } from 'vitest';
import {
    activeSelection,
    datasetsUrlWithSelection,
    selectionSignature,
} from './parameters';
import type { ReportParameter } from './store/state';

const param = (overrides: Partial<ReportParameter>): ReportParameter => ({
    id: 'p1',
    pageId: 'page-a',
    root: 'https://bacovet.example',
    name: 'chaine',
    value: [],
    values: ['CH01', 'CH02'],
    ...overrides,
});

describe('activeSelection', () => {
    it('ignores parameters of other pages', () => {
        const parameters = [
            param({
                id: 'a',
                pageId: 'page-a',
                name: 'chaine',
                value: ['CH02'],
            }),
            param({ id: 'b', pageId: 'page-b', name: 'zone', value: ['ZA'] }),
        ];
        expect(activeSelection(parameters, 'page-a')).toEqual({
            chaine: ['CH02'],
        });
    });

    it('skips empty selections', () => {
        const parameters = [
            param({ id: 'a', name: 'chaine', value: [] }),
            param({ id: 'b', name: 'zone', value: [''] }),
            param({ id: 'c', name: 'autre', value: ['x'] }),
        ];
        expect(activeSelection(parameters, 'page-a')).toEqual({
            autre: ['x'],
        });
    });

    it('collects several selected values per parameter', () => {
        const parameters = [
            param({ id: 'a', name: 'chaine', value: ['CH02', 'CH03'] }),
            param({ id: 'b', name: 'zone', value: ['ZA', 'ZB'] }),
        ];
        expect(activeSelection(parameters, 'page-a')).toEqual({
            chaine: ['CH02', 'CH03'],
            zone: ['ZA', 'ZB'],
        });
    });
});

describe('selectionSignature', () => {
    it('is stable regardless of insertion order', () => {
        expect(selectionSignature({ zone: ['ZA'], chaine: ['CH02'] })).toBe(
            selectionSignature({ chaine: ['CH02'], zone: ['ZA'] }),
        );
    });

    it('is stable regardless of value order', () => {
        expect(selectionSignature({ chaine: ['CH03', 'CH02'] })).toBe(
            selectionSignature({ chaine: ['CH02', 'CH03'] }),
        );
    });

    it('produces a deterministic fingerprint', () => {
        expect(selectionSignature({ chaine: ['CH02'] })).toBe('chaine=CH02');
        expect(selectionSignature({ chaine: ['CH02', 'CH03'] })).toBe(
            'chaine=CH02\u0001CH03',
        );
    });
});

describe('datasetsUrlWithSelection', () => {
    it('returns the plain URL when there is no selection', () => {
        expect(datasetsUrlWithSelection({})).toBe('/api/endpoint-datasets');
    });

    it('appends each parameter as p[name][]=value', () => {
        const url = datasetsUrlWithSelection({ chaine: ['CH02'] });
        expect(url).toBe('/api/endpoint-datasets?p%5Bchaine%5D%5B%5D=CH02');
    });

    it('appends one indexed entry per selected value', () => {
        const url = datasetsUrlWithSelection({ chaine: ['CH02', 'CH03'] });
        expect(url).toBe(
            '/api/endpoint-datasets?p%5Bchaine%5D%5B%5D=CH02&p%5Bchaine%5D%5B%5D=CH03',
        );
    });

    it('supports several parameters and a custom base URL', () => {
        const url = datasetsUrlWithSelection(
            { chaine: ['CH02'], zone: ['ZA'] },
            '/api/endpoint-datasets?foo=1',
        );
        expect(url).toContain('foo=1');
        expect(url).toContain('p%5Bchaine%5D%5B%5D=CH02');
        expect(url).toContain('p%5Bzone%5D%5B%5D=ZA');
    });
});
