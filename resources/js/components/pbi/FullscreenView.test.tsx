// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FullscreenView } from './FullscreenView';

beforeAll(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    class ResizeObserverStub {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
    }
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
});

type MockPage = { id: string; name: string; format: { hidden: boolean } };

function makePage(id: string, hidden = false): MockPage {
    return { id, name: `Page ${id}`, format: { hidden } };
}

const store = vi.hoisted(() => ({
    pages: [] as MockPage[],
    activePageId: 'a',
    setActivePage: vi.fn(),
    setFullscreen: vi.fn(),
    mobileView: false,
    theme: 'default',
    customThemes: [],
}));

vi.mock('@/lib/pbi/store', () => ({
    usePbi: () => store,
}));

vi.mock('./Canvas', () => ({
    Canvas: () => null,
}));

let host: HTMLDivElement;
let root: Root;

function render(): void {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<FullscreenView />));
}

afterEach(() => {
    store.setActivePage.mockClear();
    store.setFullscreen.mockClear();
    act(() => root?.unmount());
    host?.remove();
});

describe('FullscreenView — hidden pages', () => {
    it('only counts and renders dots for the visible pages', () => {
        store.pages = [makePage('a'), makePage('b', true), makePage('c')];
        store.activePageId = 'a';

        render();

        const dots = host.querySelectorAll<HTMLButtonElement>(
            '[aria-label^="Aller à la page"]',
        );
        expect(dots.length).toBe(2);

        const labels = Array.from(dots, (d) => d.getAttribute('aria-label'));
        expect(labels).toContain('Aller à la page Page a');
        expect(labels).toContain('Aller à la page Page c');
        expect(labels).not.toContain('Aller à la page Page b');

        expect(host.textContent).toContain('· 1/2');
    });

    it('falls back to the first visible page when the active page is hidden', () => {
        store.pages = [makePage('a'), makePage('b'), makePage('c', true)];
        store.activePageId = 'c';

        render();

        expect(store.setActivePage).toHaveBeenCalledWith('a');
    });

    it('does not switch when the active page is already visible', () => {
        store.pages = [makePage('a'), makePage('b', true), makePage('c')];
        store.activePageId = 'a';
        render();

        expect(store.setActivePage).not.toHaveBeenCalled();
    });
});