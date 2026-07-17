import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { V1Shell } from '@/components/v1/v1-shell';
import { FilterProvider } from '@/context/FilterContext';
import { LiveDataProvider } from '@/hooks/use-live-data';
import { initializeTheme } from './hooks/use-appearance';

const ProductionConfection = React.lazy(() => import('@/routes-v1/pages/production-confection'));
const ProductionFlux = React.lazy(() => import('@/routes-v1/pages/production-flux'));
const Qualite = React.lazy(() => import('@/routes-v1/pages/qualite'));
const Comparaison = React.lazy(() => import('@/routes-v1/pages/comparaison'));
const DataMapping = React.lazy(() => import('@/routes-v1/pages/data'));
const DataLogin = React.lazy(() => import('@/routes-v1/pages/login'));

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

const v1LayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/v1',
  component: V1Layout,
});

function V1Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <FilterProvider>
      <LiveDataProvider>
        <V1Shell pathname={pathname}>
          <Outlet />
        </V1Shell>
      </LiveDataProvider>
    </FilterProvider>
  );
}

const v1IndexRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/v1/production-confection' });
  },
  component: () => null,
});

const v1ProdConfRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/production-confection',
  component: () => <PageSuspense><ProductionConfection /></PageSuspense>,
});

const v1ProdFluxRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/production-flux',
  component: () => <PageSuspense><ProductionFlux /></PageSuspense>,
});

const v1QualiteRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/qualite',
  component: () => <PageSuspense><Qualite /></PageSuspense>,
});

const v1ComparaisonRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/comparaison',
  component: () => <PageSuspense><Comparaison /></PageSuspense>,
});

const v1DataRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/data',
  beforeLoad: async () => {
    try {
      const res = await fetch("/api/data-auth/me", { headers: { Accept: "application/json" } });
      if (!res.ok) throw redirect({ to: '/v1/login' });
      const data = await res.json();
      localStorage.setItem("data_auth_user", JSON.stringify(data));
    } catch {
      throw redirect({ to: '/v1/login' });
    }
  },
  component: () => <PageSuspense><DataMapping /></PageSuspense>,
});

// Login route — outside v1 layout (no shell)
const v1LoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/v1/login',
  component: () => <PageSuspense><DataLogin /></PageSuspense>,
});

const v1LayoutWithChildren = v1LayoutRoute.addChildren([
  v1IndexRoute,
  v1ProdConfRoute,
  v1ProdFluxRoute,
  v1QualiteRoute,
  v1ComparaisonRoute,
  v1DataRoute,
]);

const routeTree = rootRoute.addChildren([v1LayoutWithChildren, v1LoginRoute]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return <RouterProvider router={router} />;
}

const el = document.getElementById('v1-app');
if (el) {
  createRoot(el).render(<App />);
}

initializeTheme();
