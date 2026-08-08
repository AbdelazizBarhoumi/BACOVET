import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { FilterProvider } from '@/context/FilterContext';
import { LiveDataProvider } from '@/hooks/use-live-data';
import { initializeTheme } from './hooks/use-appearance';

type Layout = (page: ReactNode) => ReactNode;

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ).then((module: unknown) => {
            const page = (module as { default: { layout?: Layout | Layout[] } })
                .default;
            const OldLayout = page.layout;

            page.layout = (page: React.ReactNode) => {
                const layout = OldLayout
                    ? Array.isArray(OldLayout)
                        ? OldLayout.reduceRight(
                              (acc, LayoutFunc: Layout) => LayoutFunc(acc),
                              page,
                          )
                        : OldLayout(page)
                    : page;
                return (
                    <AuthProvider>
                        <FilterProvider>
                            <LiveDataProvider>
                                {layout}
                                <Toaster />
                            </LiveDataProvider>
                        </FilterProvider>
                    </AuthProvider>
                );
            };

            return module;
        }),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
