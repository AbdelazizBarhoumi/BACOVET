import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/widgets";
import { auth } from "@/hooks/use-auth";

export const Route = createFileRoute("/methods")({
  beforeLoad: ({ location }) => {
    if (!auth.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (!auth.hasAccess("/methods")) {
      throw redirect({ to: "/unauthorized" });
    }
  },
  head: () => ({ meta: [{ title: "Méthodes & Planning — BACOVET" }] }),
  component: MethodsPage,
});

function MethodsPage() {
  return (
    <AppShell
      page="/methods"
      title="Méthodes & Planning"
      subtitle="Gestion des gammes et ordonnancement"
    >
      <div className="grid grid-cols-1 gap-4">
        <Panel title="Flux de Production">
          <div className="flex h-[400px] items-center justify-center text-muted-foreground italic">
            Contenu du module Méthodes en cours de développement...
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
