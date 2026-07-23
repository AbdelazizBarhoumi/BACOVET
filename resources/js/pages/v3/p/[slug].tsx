import { Head, Link, usePage } from "@inertiajs/react";
import { useMemo } from "react";
import { DashboardBuilder } from "@/components/builder/dashboard-builder";
import type { Widget } from "@/components/builder/types";
import { Button } from "@/components/ui/button";

export default function V3PageView() {
  const { props } = usePage();
  const { pageId, slug, pageName, layout } = props as unknown as {
    pageId: number;
    slug: string;
    pageName: string;
    layout: Widget[];
  };

  const defaultLayout = useMemo(() => layout ?? [], [layout]);

  if (!slug || !pageName) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Head title="Page introuvable" />
        <div className="max-w-md mx-auto p-8 text-center">
          <h1 className="text-lg font-bold mb-2">Page introuvable</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Aucune page avec le slug « <span className="font-mono">{slug}</span> ».
          </p>
          <Link href="/v3">
            <Button size="sm">Retour aux pages</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head title={`${pageName} — BACOVET`} />
      <DashboardBuilder pageId={slug} pageDbId={pageId} title={pageName} defaultLayout={defaultLayout} />
    </div>
  );
}
