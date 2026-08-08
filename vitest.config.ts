/**
 * Vitest config: keep every behavior that the app's own Vite config already
 * provides, but restrict the test discovery to `resources/js/**` so the
 * Playwright specs under `tests/Browser/**` are never picked up by
 * `npm run test` (they belong to `npm run test:browser`).
 */
import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            include: ['resources/js/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
            environment: 'node',
        },
    }),
);