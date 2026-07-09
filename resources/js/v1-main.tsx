import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet, redirect } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { initializeTheme } from './hooks/use-appearance';
import { V1Shell } from '@/components/v1/v1-shell';
import { useRouterState } from '@tanstack/react-router';
import { FilterProvider } from '@/context/FilterContext';
import { LiveDataProvider } from '@/hooks/use-live-data';

import ProductionConfection from '@/routes-v1/pages/production-confection';
import ProductionFlux from '@/routes-v1/pages/production-flux';
import Qualite from '@/routes-v1/pages/qualite';
import Comparaison from '@/routes-v1/pages/comparaison';
import DataMapping from '@/routes-v1/pages/data';

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
  component: ProductionConfection,
});

const v1ProdFluxRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/production-flux',
  component: ProductionFlux,
});

const v1QualiteRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/qualite',
  component: Qualite,
});

const v1ComparaisonRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/comparaison',
  component: Comparaison,
});

const v1DataRoute = createRoute({
  getParentRoute: () => v1LayoutRoute,
  path: '/data',
  component: DataMapping,
});

const v1LayoutWithChildren = v1LayoutRoute.addChildren([
  v1IndexRoute,
  v1ProdConfRoute,
  v1ProdFluxRoute,
  v1QualiteRoute,
  v1ComparaisonRoute,
  v1DataRoute,
]);

const routeTree = rootRoute.addChildren([v1LayoutWithChildren]);

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
