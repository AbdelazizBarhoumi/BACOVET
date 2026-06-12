import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';
import AuthProvider from '@/context/AuthContext';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        resolve: (name) =>
            resolvePageComponent(
                `./pages/${name}.tsx`,
                import.meta.glob('./pages/**/*.tsx'),
            ).then((module: any) => {
                if (!module || !module.default) return module;

                const page = module.default;
                const OldLayout = page.layout;

                page.layout = (page: React.ReactNode) => {
                    const layout = OldLayout ? (Array.isArray(OldLayout) ? 
                        OldLayout.reduceRight((acc, LayoutFunc: any) => LayoutFunc(acc), page) : 
                        (OldLayout as any)(page)) : page;
                    return <AuthProvider>{layout}</AuthProvider>;
                };

                return module;
            }),
        setup: ({ App, props }) => {
            return <App {...props} />;
        },
    }),
);
