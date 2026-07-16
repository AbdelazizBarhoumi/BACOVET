import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet, redirect } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import '../css/app.css';
import { initializeTheme } from './hooks/use-appearance';
import { V2Shell } from '@/components/v2/v2-shell';
import { useRouterState } from '@tanstack/react-router';
import { FilterProvider } from '@/context/FilterContext';

const Production = React.lazy(() => import('@/routes-v2/pages/production'));

function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Chargement…</span>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return <Outlet />;
}

const v2LayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/v2',
  component: V2Layout,
});

function V2Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <FilterProvider>
      <V2Shell pathname={pathname}>
        <Outlet />
      </V2Shell>
    </FilterProvider>
  );
}

const v2IndexRoute = createRoute({
  getParentRoute: () => v2LayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/v2/production' });
  },
  component: () => null,
});

const v2ProductionRoute = createRoute({
  getParentRoute: () => v2LayoutRoute,
  path: '/production',
  component: () => <PageSuspense><Production /></PageSuspense>,
});

const v2LayoutWithChildren = v2LayoutRoute.addChildren([
  v2IndexRoute,
  v2ProductionRoute,
]);

const routeTree = rootRoute.addChildren([v2LayoutWithChildren]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return <RouterProvider router={router} />;
}

const el = document.getElementById('v2-app');
if (el) {
  createRoot(el).render(<App />);
}

initializeTheme();
