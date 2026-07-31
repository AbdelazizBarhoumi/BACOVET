import { Head, Link, usePage } from '@inertiajs/react';
import { LayoutTemplate, ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import type { Widget } from '@/components/builder/types';
import { Button } from '@/components/ui/button';

export default function V5PageView() {
    const { props } = usePage();
    const { pageId, slug, pageName, layout } = props as unknown as {
        pageId: number;
        slug: string;
        pageName: string;
        layout: Widget[];
    };

    // Canvas & widgets arrive later; the layout is passed through unchanged so the
    // editor can be dropped in at the same prop contract as V3/V4.
    const defaultLayout = useMemo(() => layout ?? [], [layout]);

    if (!slug || !pageName) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Head title="Page introuvable" />
                <div className="mx-auto max-w-md p-8 text-center">
                    <h1 className="mb-2 text-lg font-bold">Page introuvable</h1>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Aucune page avec le slug «{' '}
                        <span className="font-mono">{slug}</span> ».
                    </p>
                    <Link href="/v5">
                        <Button size="sm">Retour aux pages</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`${pageName} — BACOVET`} />
            <div className="flex h-[calc(100vh-40px)] flex-col">
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link href="/v5">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-[11px] tracking-wider uppercase"
                            >
                                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Pages
                            </Button>
                        </Link>
                        <div className="min-w-0">
                            <div className="truncate text-sm font-bold">
                                {pageName}
                            </div>
                            <div className="truncate font-mono text-[10px] text-muted-foreground">
                                /v5/p/{slug}
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex flex-1 items-center justify-center p-8">
                    <div className="max-w-md text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                            <LayoutTemplate className="h-7 w-7 text-primary" />
                        </div>
                        <h2 className="mb-1 text-base font-bold">
                            Canvas V5 à venir
                        </h2>
                        <p className="mb-4 text-sm text-muted-foreground">
                            L'infrastructure V5 est prête (pages, groupes,
                            traçabilité, auth). Le canevas et les widgets seront
                            branchés ici prochainement. Layout chargé :{' '}
                            {defaultLayout.length} widget(s)
                            {pageId ? ` (id ${pageId})` : ''}.
                        </p>
                        <Link href="/v5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[11px] tracking-wider uppercase"
                            >
                                Retour aux pages
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
