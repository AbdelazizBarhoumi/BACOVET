import { Head, usePage } from "@inertiajs/react";
import { useMemo } from "react";
import { DashboardBuilder } from "@/components/v6builder/dashboard-builder";
import { sanitizeWidgets, V6_WIDGET_TYPES, type DashboardTheme, type MeasureDefinition, type Widget } from "@/components/v6builder/types";

export default function V6PageView() {
  const { props } = usePage();
  const { pageId, slug, pageName, layout, measures, theme } = props as unknown as { pageId: number; slug: string; pageName: string; layout: Widget[]; measures?: MeasureDefinition[]; theme?: DashboardTheme | null };
  const defaultLayout = useMemo(() => sanitizeWidgets(layout ?? [], V6_WIDGET_TYPES), [layout]);
  return <div className="min-h-screen bg-background text-foreground"><Head title={`${pageName || "Dashboard V6"} — BACOVET`} /><DashboardBuilder pageId={slug} pageDbId={pageId} title={pageName} defaultLayout={defaultLayout} defaultMeasures={measures} defaultTheme={theme} apiBase="/api/v6/builder-pages" dataApiBase="/api/v6/endpoint-datasets" /></div>;
}
