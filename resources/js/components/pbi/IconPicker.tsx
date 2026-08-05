import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    CF_ICON_SETS,
    iconById,
    iconSetOf,
    type CFIconSet,
} from '@/lib/pbi/icons';
import { cn } from '@/lib/utils';
import { CfIcon } from './CfIcon';

function groupSets(sets: CFIconSet[]): { category: string; sets: CFIconSet[] }[] {
    const order: string[] = [];
    const byCat = new Map<string, CFIconSet[]>();
    for (const set of sets) {
        if (!byCat.has(set.category)) {
            byCat.set(set.category, []);
            order.push(set.category);
        }
        byCat.get(set.category)!.push(set);
    }
    return order.map((c) => ({ category: c, sets: byCat.get(c)! }));
}

/**
 * Visual, category-grouped gallery for choosing an icon *set*. The trigger
 * shows the active set's label and a preview row of its glyphs; the popover
 * lists every set as a card with its mini glyph strip.
 */
export function IconSetPicker({
    value,
    onChange,
    className,
}: {
    value: string;
    onChange: (setId: string) => void;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const active = iconSetOf(value) ?? CF_ICON_SETS[0];
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring',
                        className,
                    )}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="flex shrink-0 items-center gap-0.5">
                            {active?.icons.slice(0, 5).map((ic) => (
                                <CfIcon key={ic.id} icon={ic} size={16} />
                            ))}
                        </span>
                        <span className="truncate text-muted-foreground">
                            {active?.label}
                        </span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={6}
                className="w-[22rem] p-0"
            >
                <ScrollArea className="max-h-[55vh]">
                    <div className="space-y-3 p-3">
                        {groupSets(CF_ICON_SETS).map(({ category, sets }) => (
                            <div key={category}>
                                <div className="mb-1.5 px-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                                    {category}
                                </div>
                                <div className="space-y-1">
                                    {sets.map((set) => {
                                        const selected = set.id === active?.id;
                                        return (
                                            <button
                                                key={set.id}
                                                type="button"
                                                onClick={() => {
                                                    onChange(set.id);
                                                    setOpen(false);
                                                }}
                                                className={cn(
                                                    'flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
                                                    selected
                                                        ? 'border-brand/50 bg-brand/10'
                                                        : 'border-transparent hover:bg-accent',
                                                )}
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <span className="flex shrink-0 items-center gap-0.5">
                                                        {set.icons
                                                            .slice(0, 5)
                                                            .map((ic) => (
                                                                <CfIcon
                                                                    key={ic.id}
                                                                    icon={ic}
                                                                    size={18}
                                                                />
                                                            ))}
                                                    </span>
                                                    <span className="truncate text-[12px]">
                                                        {set.label}
                                                    </span>
                                                </span>
                                                {selected && (
                                                    <Check className="h-4 w-4 shrink-0 text-brand" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Grid of glyph tiles for picking a single icon from the active set. The
 * trigger shows the current icon large; the popover renders every icon in the
 * set as a labeled tile with the active one highlighted.
 */
export function IconPicker({
    value,
    set,
    onChange,
    className,
}: {
    value: string | undefined;
    set: CFIconSet | undefined;
    onChange: (iconId: string) => void;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const active = iconById(set?.id ?? '', value) ?? set?.icons[0];
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring',
                        className,
                    )}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <CfIcon icon={active} size={20} />
                        <span className="truncate text-muted-foreground">
                            {active?.label}
                        </span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={6}
                className="w-72 p-0"
            >
                <ScrollArea className="max-h-[45vh]">
                    <div className="grid grid-cols-3 gap-1.5 p-3">
                        {set?.icons.map((ic) => {
                            const selected = ic.id === active?.id;
                            return (
                                <button
                                    key={ic.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(ic.id);
                                        setOpen(false);
                                    }}
                                    title={ic.label}
                                    className={cn(
                                        'flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-center transition-colors',
                                        selected
                                            ? 'border-brand/50 bg-brand/10'
                                            : 'border-transparent hover:bg-accent',
                                    )}
                                >
                                    <CfIcon icon={ic} size={26} />
                                    <span className="w-full truncate text-[10px] text-muted-foreground">
                                        {ic.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
