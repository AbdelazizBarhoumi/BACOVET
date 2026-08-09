import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    define: {
        'process.env': JSON.stringify({}),
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // The report data-model engine keeps its registries
                    // (MEASURE_IMPL / LIST_MEASURE_IMPL / TABLES) in module
                    // scope. If the same modules land in two chunks (entry +
                    // lazy page route) they get bundled twice, so the store
                    // registers measures into one copy while the visuals read
                    // the other — list measures render empty in view mode.
                    // Forcing the whole lib/pbi graph into one chunk keeps a
                    // single registry instance.
                    if (
                        id.includes(resolve('resources/js/lib/pbi'))
                    ) {
                        return 'pbi';
                    }
                    return undefined;
                },
            },
        },
    },
});