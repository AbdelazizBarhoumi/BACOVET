import { Head, Link, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import { DashboardBuilder } from "@/components/builder/dashboard-builder";
import { getPageBySlug, type BuilderPage } from "@/lib/pages-registry";
import { Button } from "@/components/ui/button";

export default function V3PageView() {
  const { props } = usePage();
  const slug = (props as unknown as { slug: string }).slug;
  const [page, setPage] = useState<BuilderPage | undefined>(() => getPageBySlug(slug));

  useEffect(() => {
    const refresh = () => setPage(getPageBySlug(slug));
    refresh();
    window.addEventListener("bacovet.pages.updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("bacovet.pages.updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [slug]);

  const defaultLayout = useMemo(() => [], []);

  if (!page) {
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
      <Head title={`${page.name} — BACOVET`} />
      <DashboardBuilder pageId={page.slug} title={page.name} defaultLayout={defaultLayout} />
    </div>
  );
}
