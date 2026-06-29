import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { V1Shell } from "@/components/v1/v1-shell";
export const Route = createFileRoute("/v1")({
  component: V1Layout,
});
function V1Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <V1Shell pathname={pathname}>
      <Outlet />
    </V1Shell>
  );
}
