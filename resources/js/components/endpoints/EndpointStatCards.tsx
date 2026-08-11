import { Panel } from '@/components/widgets';
import { cn } from '@/lib/utils';
import type { EndpointsStats } from '@/services/endpointManagerApi';

export function EndpointStatCards({ stats }: { stats: EndpointsStats | null }) {
    const s = stats ?? {
        total: 0,
        by_method: {},
        by_source: {},
        by_status: {},
        by_root: {},
    };
    const errorCount = Object.entries(s.by_status).reduce(
        (acc, [code, count]) => acc + (Number(code) >= 400 ? count : 0),
        0,
    );

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Panel title="Total">
                <div className="font-mono text-2xl font-bold">{s.total}</div>
            </Panel>
            <Panel title="GET">
                <div className="font-mono text-2xl font-bold text-sky-500">
                    {s.by_method.GET ?? 0}
                </div>
            </Panel>
            <Panel title="POST">
                <div className="font-mono text-2xl font-bold text-amber-500">
                    {s.by_method.POST ?? 0}
                </div>
            </Panel>
            <Panel title="Erreurs (≥400)">
                <div
                    className={cn(
                        'font-mono text-2xl font-bold',
                        errorCount > 0 ? 'text-destructive' : 'text-success',
                    )}
                >
                    {errorCount}
                </div>
            </Panel>
        </div>
    );
}
