import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { inferStructure } from '@/lib/endpoint-structure';
import { stringifyValue } from '@/lib/json-utils';
import type { EndpointEntry } from '@/services/endpointManagerApi';
import { StatusBadge } from './StatusBadge';
import { StructureViewer } from './StructureViewer';

export function EndpointDetailDialog({
    open,
    onOpenChange,
    entry,
    loading,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry?: EndpointEntry | null;
    loading?: boolean;
}) {
    const structure = entry ? inferStructure(entry) : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="font-mono text-sm tracking-wider uppercase">
                        {entry?.name ?? 'Endpoint details'}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="space-y-2 py-8">
                        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                        <div className="h-40 w-full animate-pulse rounded bg-muted" />
                    </div>
                ) : entry ? (
                    <Tabs defaultValue="overview">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="response">Response</TabsTrigger>
                            <TabsTrigger value="structure">Structure</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Method
                                    </span>
                                    <div className="mt-1 font-mono font-bold">
                                        {entry.method}
                                    </div>
                                </div>
                                <div>
                                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Status
                                    </span>
                                    <div className="mt-1">
                                        <StatusBadge status={entry.status} />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Endpoint
                                    </span>
                                    <div className="mt-1 font-mono text-xs break-all">
                                        {entry.endpoint}
                                    </div>
                                </div>
                                <div>
                                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Source
                                    </span>
                                    <div className="mt-1 font-mono font-bold">
                                        {structure?.source ?? '—'}
                                    </div>
                                </div>
                                <div>
                                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Object type
                                    </span>
                                    <div className="mt-1 font-mono">
                                        {structure?.object_type ?? '—'}
                                    </div>
                                </div>
                                <div>
                                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Rows
                                    </span>
                                    <div className="mt-1 font-mono">
                                        {structure?.row_count ?? 0}
                                    </div>
                                </div>
                                <div>
                                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Columns
                                    </span>
                                    <div className="mt-1 font-mono">
                                        {structure?.columns.length ?? 0}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="response">
                            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
                                {stringifyValue(entry.response)}
                            </pre>
                        </TabsContent>

                        <TabsContent value="structure">
                            {structure ? (
                                <StructureViewer
                                    columns={structure.columns}
                                    rowCount={structure.row_count}
                                    hasData={structure.has_data}
                                />
                            ) : null}
                        </TabsContent>
                    </Tabs>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
