import { Head } from "@inertiajs/react";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/widgets";

export default function MethodsPage() {
  return (
    <>
      <Head title="Méthodes & Planning — BACOVET" />
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
    </>
  );
}
