---
name: add-v1-page
description: Register a new page in the BACOVET V1 TanStack Router SPA with correct lazy loading, route registration, and navigation entry.
---

# Add New V1 Page

Add a new page to the BACOVET V1 SPA (TanStack Router). This involves creating the component, registering the route in v1-main.tsx, and adding it to the navigation shell.

## When to use

- User says "add page X to v1", "new v1 page for X", "register route for X"
- Creating a new dashboard page that should be accessible under `/v1/`
- Migrating an Inertia page to the V1 SPA

## Inputs

- **Page name**: kebab-case name (e.g., `logistics`, `development`)
- **Component path**: where the component lives (default: `resources/js/routes-v1/pages/<name>.tsx`)
- **Route path**: URL path under `/v1/` (default: `/<name>`)

## Procedure

### Step 1 — Create the page component

Create `resources/js/routes-v1/pages/<name>.tsx`:

```tsx
import React from 'react';

export default function <PageName>() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Page Title</h1>
      {/* Page content */}
    </div>
  );
}
```

Use the shared components from `@/components/v1/primitives.tsx` for consistency (Card, KpiCard, HalfGauge, Sparkline, LineKpi, BarKpi, DonutKpi, etc.).

### Step 2 — Register in v1-main.tsx

Edit `resources/js/v1-main.tsx`:

1. **Add lazy import** (after existing imports):
   ```tsx
   const <PageName> = React.lazy(() => import('@/routes-v1/pages/<name>'));
   ```

2. **Create route** (after existing routes, before `addChildren`):
   ```tsx
   const v1<Name>Route = createRoute({
     getParentRoute: () => v1LayoutRoute,
     path: '/<name>',
     component: () => <PageSuspense><<PageName> /></PageSuspense>,
   });
   ```

3. **Add to children array** in `v1LayoutRoute.addChildren([...])`:
   ```tsx
   const v1LayoutWithChildren = v1LayoutRoute.addChildren([
     v1IndexRoute,
     v1ProdConfRoute,
     v1ProdFluxRoute,
     v1QualiteRoute,
     v1ComparaisonRoute,
     v1DataRoute,
     v1<Name>Route,  // <-- add here
   ]);
   ```

### Step 3 — Add navigation entry

Edit `resources/js/components/v1/v1-shell.tsx` to add a sidebar navigation link for the new page.

### Step 4 — Verify

1. Typecheck: `npx tsc --noEmit --pretty 2>&1`
2. Build: `npx vite build 2>&1 | Select-String -Pattern "built in|error"`
3. Navigate to `/v1/<name>` in the browser to verify

## Key rules from MEMORY.md

- **V1 TanStack Router uses manual route registration**: `v1-main.tsx` manually creates routes with `createRoute()` and adds them via `v1LayoutRoute.addChildren([...])`. File-based routing files are NOT auto-registered.
- **V1 pages have NO server-side auth middleware**: The `/v1/{any?}` route is outside the `auth` middleware group. Auth is enforced client-side via API service 401 interception.
- **All V1 API services must have 401 interception**: Each service's `fetch()` wrapper must check `res.status === 401` and redirect to `/login?returnTo=<path>`. This was a known bug (data page was unprotected).
- **Routes live in `routes/web.php` only**: No `api.php`. All JSON API endpoints are regular web routes.

## Checklist

- [ ] Component created in `resources/js/routes-v1/pages/<name>.tsx`
- [ ] Lazy import added to `v1-main.tsx`
- [ ] Route created with `createRoute({ getParentRoute: () => v1LayoutRoute, path: '/<name>', component })`
- [ ] Route added to `v1LayoutRoute.addChildren([...])` array
- [ ] Navigation link added to `v1-shell.tsx`
- [ ] API service has 401 interception with `?returnTo=` redirect
- [ ] Typecheck passes
- [ ] Build succeeds
