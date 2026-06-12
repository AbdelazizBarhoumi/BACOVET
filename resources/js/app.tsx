import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { AuthProvider } from '@/context/AuthContext';
import { LiveDataProvider } from '@/hooks/use-live-data';
import { initializeTheme } from './hooks/use-appearance';
import { Toaster } from '@/components/ui/sonner';

type Layout = (page: ReactNode) => ReactNode;

type InertiaPage = {
    default: ComponentType & { layout?: Layout | Layout[] };
};

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
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
                return (
                    <AuthProvider>
                        <LiveDataProvider>
                            {layout}
                            <Toaster />
                        </LiveDataProvider>
                    </AuthProvider>
                );
            };

            return module;
        }),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <App {...props} />
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// Browser console => server logging
// Filter out browser extension logs and only send app-related messages
const isFromExtension = (stack?: string): boolean => {
    if (!stack) return false;
    // Common extension patterns: chrome-extension://, moz-extension://, background.js
    return /chrome-extension:|moz-extension:|background\.js|content\.js|content-script/.test(stack);
};

const sendLogToServer = (level: string, message: string) => {
    // Skip if message appears to be from a browser extension
    if (
        message.includes('background.js') ||
        message.includes('Migrator') ||
        message.includes('SignalR') ||
        message.includes('WebPush')
    ) {
        return;
    }

    try {
        fetch('/browser-log', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level,
                message,
                url: window.location.href,
            }),
        });
    } catch {
        // swallow network errors - don't break the app
    }
};

type ConsoleMethod = 'log' | 'error' | 'warn' | 'info';
const consoleMethods: ConsoleMethod[] = ['log', 'error', 'warn', 'info'];

consoleMethods.forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
        original(...args);
        try {
            // Check if call originates from an extension via stack trace
            const stack = new Error().stack ?? '';
            if (isFromExtension(stack)) {
                return;
            }

            const msg = args
                .map((a) =>
                    typeof a === 'object' ? JSON.stringify(a) : String(a),
                )
                .join(' ');
            sendLogToServer(level, msg);
        } catch {
            /* ignore */
        }
    };
});
