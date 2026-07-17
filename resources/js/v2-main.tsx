import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { V2Shell } from '@/components/v2/v2-shell';
import { FilterProvider } from '@/context/FilterContext';
import { initializeTheme } from './hooks/use-appearance';

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
    throw redirect({ to: '/v2/production' as string });
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

function App() {
  return <RouterProvider router={router} />;
}

const el = document.getElementById('v2-app');
if (el) {
  createRoot(el).render(<App />);
}

initializeTheme();
