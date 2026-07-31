import { Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type ToolbarValue = {
    search: string;
    method: string;
    source: string;
    status: string;
};

const METHODS = ['GET', 'POST'];
const STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'ok', label: '2xx OK' },
    { value: 'warn', label: '3xx-4xx' },
    { value: 'error', label: '5xx' },
];

export function EndpointsToolbar({
    value,
    onChange,
    onRefresh,
    onNew,
    loading,
    sources,
}: {
    value: ToolbarValue;
    onChange: (next: ToolbarValue) => void;
    onRefresh: () => void;
    onNew: () => void;
    loading: boolean;
    sources: string[];
}) {
    const set = (patch: Partial<ToolbarValue>) => onChange({ ...value, ...patch });

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={value.search}
                    onChange={(e) => set({ search: e.target.value })}
                    placeholder="Search name, endpoint, source…"
                    className="h-7 pl-8 font-mono text-xs"
                />
            </div>

            <Select value={value.method} onValueChange={(method) => set({ method })}>
                <SelectTrigger className="h-7 w-24 font-mono text-[10px] tracking-wider uppercase">
                    <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    {METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                            {m}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={value.source} onValueChange={(source) => set({ source })}>
                <SelectTrigger className="h-7 w-28 font-mono text-[10px] tracking-wider uppercase">
                    <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {sources.map((source) => (
                        <SelectItem key={source} value={source}>
                            {source}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={value.status} onValueChange={(status) => set({ status })}>
                <SelectTrigger className="h-7 w-28 font-mono text-[10px] tracking-wider uppercase">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                disabled={loading}
                className="h-7 text-[10px] tracking-wider uppercase"
            >
                <RefreshCw className={loading ? 'h-3 w-3 animate-spin' : 'mr-1 h-3 w-3'} />
                {loading ? 'Loading…' : 'Refresh'}
            </Button>

            <Button
                size="sm"
                onClick={onNew}
                className="h-7 text-[10px] tracking-wider uppercase"
            >
                <Plus className="mr-1 h-3 w-3" /> New
            </Button>
        </div>
    );
}
