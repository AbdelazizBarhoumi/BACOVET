import { CfIcon } from '@/components/pbi/CfIcon';
import {
    conditionalColor,
    conditionalIcon,
} from '@/lib/pbi/conditionalFormat';
import {
    defaultIconSet,
    iconById,
    iconSetOf,
} from '@/lib/pbi/icons';
import type { ConditionalFormat } from '@/lib/pbi/model';
import { cn } from '@/lib/utils';

const formatNum = (v: number) =>
    Number.isInteger(v) ? String(v) : v.toFixed(1);

/** Live swatch strip sampling how the format will look across the field range. */
export function PreviewStrip({
    cf,
    values,
    basedOnLabel,
}: {
    cf: ConditionalFormat;
    values: number[];
    basedOnLabel: string;
}) {
    const set = iconSetOf(cf.iconSet) ?? defaultIconSet();
    return (
        <div className="rounded-lg border border-border bg-panel p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Aperçu
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                    {basedOnLabel}
                </span>
            </div>
            <div className="flex flex-wrap items-end gap-2">
                {values.map((v, i) => {
                    const color = conditionalColor(cf, v, values, v);
                    const icon =
                        cf.style === 'icons'
                            ? iconById(set.id, conditionalIcon(cf, v, values))
                            : undefined;
                    return (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-md border',
                                    color ? 'border-transparent' : 'border-border',
                                )}
                                style={
                                    color
                                        ? { backgroundColor: color }
                                        : undefined
                                }
                            >
                                {icon && <CfIcon icon={icon} size={20} />}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                                {formatNum(v)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}