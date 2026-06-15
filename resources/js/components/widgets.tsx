import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Status } from '@/lib/mock';

export function TrafficBadge({
    status,
    children,
}: {
    status: Status;
    children?: ReactNode;
}) {
    const map = {
        green: 'bg-success/15 text-success border-success/40',
        orange: 'bg-warning/15 text-warning border-warning/40',
        red: 'bg-destructive/15 text-destructive border-destructive/40',
        grey: 'bg-muted text-muted-foreground border-border',
    };
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${map[status]}`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${
                    status === 'green'
                        ? 'bg-success'
                        : status === 'orange'
                          ? 'bg-warning'
                          : status === 'red'
                            ? 'bg-destructive'
                            : 'bg-muted-foreground'
                }`}
            />
            {children ?? status.toUpperCase()}
        </span>
    );
}

export function BigNumberCard({
    label,
    value,
    unit = '%',
    target,
    status,
    source,
    trend,
    freq,
    onClick,
}: {
    label: string;
    value: number | string;
    unit?: string;
    target?: string;
    status?: Status;
    source?: string;
    trend?: 'up' | 'down' | 'flat';
    freq?: string;
    isLoading?: boolean;
    error?: string | null;
    onClick?: () => void;
}) {
    // ... keep isLoading and error branches unchanged ...

    const bar =
        status === 'green'
            ? 'bg-success'
            : status === 'orange'
              ? 'bg-warning'
              : status === 'red'
                ? 'bg-destructive'
                : 'bg-status-grey';

    return (
        <div
            className={`relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card p-4 ${onClick ? 'cursor-pointer transition-all hover:ring-2 hover:ring-primary/30' : 'hover:ring-2 hover:ring-primary/30'}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={
                onClick
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onClick();
                          }
                      }
                    : undefined
            }
        >
            {/* Header stays at top */}
            <div className={`absolute top-0 left-0 h-full w-1 ${bar}`} />
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                    {label}
                </div>
                {status && <TrafficBadge status={status} />}
            </div>

            {/* Main content centered vertically */}
            <div className="flex min-h-0 flex-1 flex-col justify-center">
                <div className="flex items-baseline gap-1">
                    <span className="font-mono text-4xl font-bold tabular-nums">
                        {typeof value === 'number' ? value.toFixed(1) : value}
                    </span>
                    <span className="font-mono text-lg text-muted-foreground">
                        {unit}
                    </span>
                    {trend && (
                        <span className="ml-2 inline-flex items-center text-xs text-muted-foreground">
                            {trend === 'up' ? (
                                <ArrowUp className="h-3 w-3 text-success" />
                            ) : trend === 'down' ? (
                                <ArrowDown className="h-3 w-3 text-destructive" />
                            ) : (
                                <Minus className="h-3 w-3" />
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* Footer stays at bottom */}
            <div className="mt-auto">
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    {target && <span>Cible: {target}</span>}
                    {freq && <span className="text-primary/80">{freq}</span>}
                </div>
                {source && (
                    <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/70">
                        src: {source}
                    </div>
                )}
            </div>
        </div>
    );
}

export function Panel({
    title,
    right,
    children,
    className = '',
}: {
    title: string;
    right?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-lg border border-border bg-card  ${className}`}>
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h2 className="text-xs font-bold tracking-[0.15em] text-foreground/90 uppercase">
                    {title}
                </h2>
                {right}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

export function Gauge({
    value,
    label,
    max = 100,
    inverted = false,
}: {
    value: number | null | undefined;
    label: string;
    max?: number;
    inverted?: boolean;
}) {
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    const pct = Math.min(100, Math.max(0, (safeValue / max) * 100));
    const angle = (pct / 100) * 180;

    let color = 'var(--success)';
    if (inverted) {
        color =
            safeValue <= 100
                ? 'var(--success)'
                : safeValue <= 120
                  ? 'var(--warning)'
                  : 'var(--destructive)';
    } else {
        color =
            safeValue >= 85
                ? 'var(--success)'
                : safeValue >= 70
                  ? 'var(--warning)'
                  : 'var(--destructive)';
    }

    return (
        <div className="flex flex-col items-center">
            <div className="relative h-24 w-44">
                <svg viewBox="0 0 200 110" className="h-full w-full">
                    <path
                        d="M10,100 A90,90 0 0,1 190,100"
                        fill="none"
                        stroke="var(--muted)"
                        strokeWidth="14"
                        strokeLinecap="round"
                    />
                    <path
                        d="M10,100 A90,90 0 0,1 190,100"
                        fill="none"
                        stroke={color}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={`${(angle / 180) * 283} 283`}
                    />
                    <text
                        x="100"
                        y="92"
                        textAnchor="middle"
                        className="font-mono font-bold"
                        fontSize="26"
                        fill="currentColor"
                    >
                        {safeValue.toFixed(0)}%
                    </text>
                </svg>
            </div>
            <div className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
                {label}
            </div>
        </div>
    );
}
