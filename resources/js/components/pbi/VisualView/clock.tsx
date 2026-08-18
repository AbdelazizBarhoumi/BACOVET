import { useEffect, useState } from 'react';
import { formatClock, normalizeClockStyle, type Visual } from '@/lib/pbi/model';

/** Live clock (time + optional date) element. Ticks once per second. */
export function ClockVisual({ visual }: { visual: Visual }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const style = normalizeClockStyle(visual.clock);
    const { time, date } = formatClock(now, style);
    const baseSize = visual.fontSize ?? 24;
    const dateSize = Math.max(11, Math.round(baseSize * 0.55));
    const color = visual.fontColor || 'var(--foreground)';

    return (
        <div
            className="flex h-full w-full flex-col items-center justify-center overflow-hidden p-2"
            style={{
                fontFamily: visual.fontFamily || undefined,
                textAlign: visual.textAlign ?? 'center',
                color,
            }}
        >
            {style.showClock && (
                <div
                    className="leading-none font-semibold whitespace-nowrap tabular-nums"
                    style={{
                        fontSize: baseSize,
                        fontWeight: visual.fontBold ? 700 : 600,
                        fontStyle: visual.fontItalic ? 'italic' : undefined,
                        textDecoration: visual.fontUnderline
                            ? 'underline'
                            : undefined,
                        lineHeight: 1.15,
                    }}
                >
                    {time}
                </div>
            )}
            {style.showDate && (
                <div
                    className="mt-1 whitespace-nowrap tabular-nums"
                    style={{
                        fontSize: dateSize,
                        fontWeight: visual.fontBold ? 700 : 500,
                        fontStyle: visual.fontItalic ? 'italic' : undefined,
                        textDecoration: visual.fontUnderline
                            ? 'underline'
                            : undefined,
                        opacity: 0.85,
                    }}
                >
                    {date}
                </div>
            )}
            {!style.showClock && !style.showDate && (
                <div className="text-[11px] text-muted-foreground">
                    Horloge masquée
                </div>
            )}
        </div>
    );
}
