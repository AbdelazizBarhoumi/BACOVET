import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatJson, tryParseJson } from '@/lib/json-utils';
import { cn } from '@/lib/utils';

export function JsonEditor({
    value,
    onChange,
    rows = 14,
    invalidClassName,
}: {
    value: string;
    onChange: (next: string) => void;
    rows?: number;
    invalidClassName?: string;
}) {
    const [touched, setTouched] = useState(false);
    const result = useMemo(() => tryParseJson(value), [value]);
    const error = result.ok ? null : result.error;
    const isEmpty = value.trim() === '';

    const handleFormat = () => {
        try {
            onChange(formatJson(value));
            setTouched(true);
        } catch {
            // keep raw text, error is already surfaced below
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    Response (JSON)
                </span>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] tracking-wider uppercase"
                    onClick={handleFormat}
                >
                    Format
                </Button>
            </div>
            <Textarea
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setTouched(true);
                }}
                rows={rows}
                spellCheck={false}
                placeholder='{ "success": true }'
                className={cn(
                    'font-mono text-xs leading-relaxed resize-y',
                    touched && !isEmpty && error ? 'border-destructive/60' : undefined,
                    invalidClassName,
                )}
            />
            {touched && !isEmpty && error ? (
                <p className="text-[10px] font-medium text-destructive">{error}</p>
            ) : !isEmpty && result.ok ? (
                <p className="text-[10px] font-medium text-success">Valid JSON</p>
            ) : null}
        </div>
    );
}
