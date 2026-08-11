import {
    Folder,
    KeyRound,
    LayoutList,
    RefreshCw,
    Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type RootGroupTab = {
    root: string;
    count: number;
};

export function EndpointsGroupTabs({
    groups,
    active,
    onSelect,
    onRefreshGroup,
    refreshingRoot,
    keyedRoots = [],
}: {
    groups: RootGroupTab[];
    active: string | null;
    onSelect: (root: string | null) => void;
    onRefreshGroup: (root: string) => void;
    refreshingRoot: string | null;
    keyedRoots?: string[];
}) {
    const total = groups.reduce((acc, g) => acc + g.count, 0);
    const keyedRootSet = new Set(keyedRoots);

    const tabClass = (selected: boolean) =>
        cn(
            'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-mono text-[11px] transition-colors',
            selected
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
        );

    return (
        <div className="flex flex-wrap items-center gap-1">
            <button
                type="button"
                onClick={() => onSelect(null)}
                className={tabClass(active === null)}
                title="Tous les endpoints"
            >
                <LayoutList className="h-3 w-3" />
                Tous
                <span className="rounded bg-muted px-1 text-[10px]">
                    {total}
                </span>
            </button>

            {groups.map((group) => {
                const selected = active === group.root;
                return (
                    <button
                        key={group.root}
                        type="button"
                        onClick={() => onSelect(selected ? null : group.root)}
                        className={tabClass(selected)}
                        title={group.root}
                    >
                        <Server className="h-3 w-3 shrink-0" />
                        <span className="max-w-[200px] truncate">
                            {group.root}
                        </span>
                        <span className="rounded bg-muted px-1 text-[10px]">
                            {group.count}
                        </span>
                        {keyedRootSet.has(group.root) && (
                            <span
                                className="ml-0.5 inline-flex text-warning"
                                title="Clé API personnalisée définie"
                            >
                                <KeyRound className="h-3 w-3" />
                            </span>
                        )}
                        <span
                            role="button"
                            tabIndex={0}
                            className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-foreground/10"
                            title="Rafraîchir ce groupe"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefreshGroup(group.root);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onRefreshGroup(group.root);
                                }
                            }}
                        >
                            <RefreshCw
                                className={cn(
                                    'h-3 w-3',
                                    refreshingRoot === group.root &&
                                        'animate-spin',
                                )}
                            />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export function EndpointsDisplayToggle({
    value,
    onChange,
}: {
    value: 'flat' | 'grouped';
    onChange: (value: 'flat' | 'grouped') => void;
}) {
    return (
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
            <Button
                size="sm"
                variant="ghost"
                className={cn(
                    'h-6 px-2 text-[10px] tracking-wider uppercase',
                    value === 'flat' && 'bg-background shadow',
                )}
                onClick={() => onChange('flat')}
            >
                <LayoutList className="mr-1 h-3 w-3" />
                Liste
            </Button>
            <Button
                size="sm"
                variant="ghost"
                className={cn(
                    'h-6 px-2 text-[10px] tracking-wider uppercase',
                    value === 'grouped' && 'bg-background shadow',
                )}
                onClick={() => onChange('grouped')}
            >
                <Folder className="mr-1 h-3 w-3" />
                Groupes
            </Button>
        </div>
    );
}
