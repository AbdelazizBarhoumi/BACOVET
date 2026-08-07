import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import {
    normalizeConditionalFormat,
    type ConditionalFormat,
    type Visual,
} from '@/lib/pbi/model';
import { cn } from '@/lib/utils';
import { STYLE_LABELS } from './constants';
import { ConditionalFormatDialog } from './dialog';

/**
 * The shared "fx" button that opens the conditional-formatting dialog.
 * Used from every visual's Format tab (charts, tables/matrices and the
 * single-value callout alike).
 */
export function ConditionalFormatControl({
    visual,
    label = 'Mise en forme conditionnelle (fx)',
    value,
    onCommit,
    hideFieldValue,
}: {
    visual: Visual;
    label?: string;
    /** Per-target source value (e.g. a gauge fx target). */
    value?: ConditionalFormat;
    /** Per-target commit (e.g. write to a gauge fx target). */
    onCommit?: (cf: ConditionalFormat | undefined) => void;
    /** Hide the "Field value" style (inert for single-value targets). */
    hideFieldValue?: boolean;
}) {
    const [open, setOpen] = useState(false);
    let cf = normalizeConditionalFormat(value ?? visual.conditionalFormat);
    if (hideFieldValue && cf.style === 'fieldValue')
        cf = { ...cf, style: 'none' };
    const active = cf.style !== 'none';
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                    'flex w-full items-center justify-between rounded border px-2 py-1.5 text-[11px]',
                    active
                        ? 'border-brand/40 bg-brand/10 font-medium text-brand'
                        : 'border-border bg-background hover:bg-accent',
                )}
            >
                <span>{label}</span>
                <span className="flex items-center gap-1">
                    {active && <SlidersHorizontal className="size-3" />}
                    {STYLE_LABELS[cf.style]}
                </span>
            </button>
            <ConditionalFormatDialog
                open={open}
                visual={visual}
                value={value}
                onCommit={onCommit}
                onClose={() => setOpen(false)}
                hideFieldValue={hideFieldValue}
            />
        </>
    );
}