import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ReactNode } from "react";
import type { Status } from "@/lib/mock";

export function TrafficBadge({ status, children }: { status: Status; children?: ReactNode }) {
  const map = {
    green: "bg-success/15 text-success border-success/40",
    orange: "bg-warning/15 text-warning border-warning/40",
    red: "bg-destructive/15 text-destructive border-destructive/40",
    grey: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${map[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "green"
            ? "bg-success"
            : status === "orange"
              ? "bg-warning"
              : status === "red"
                ? "bg-destructive"
                : "bg-muted-foreground"
        }`}
      />
      {children ?? status.toUpperCase()}
    </span>
  );
}

export function BigNumberCard({
  label,
  value,
  unit = "%",
  target,
  status,
  source,
  trend,
  freq,
  isLoading,
  error,
}: {
  label: string;
  value: number | string;
  unit?: string;
  target?: string;
  status?: Status;
  source?: string;
  trend?: "up" | "down" | "flat";
  freq?: string;
  isLoading?: boolean;
  error?: string | null;
}) {
  // ... keep isLoading and error branches unchanged ...

  const bar =
    status === "green"
      ? "bg-success"
      : status === "orange"
        ? "bg-warning"
        : status === "red"
          ? "bg-destructive"
          : "bg-status-grey";

  return (
    <div className="h-full relative overflow-hidden rounded-lg border border-border bg-card p-4 hover:ring-2 hover:ring-primary/30 flex flex-col">
      {/* Header stays at top */}
      <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
          {label}
        </div>
        {status && <TrafficBadge status={status} />}
      </div>

      {/* Main content centered vertically */}
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold font-mono tabular-nums">
            {typeof value === "number" ? value.toFixed(1) : value}
          </span>
          <span className="text-lg text-muted-foreground font-mono">{unit}</span>
          {trend && (
            <span className="ml-2 text-xs text-muted-foreground inline-flex items-center">
              {trend === "up" ? (
                <ArrowUp className="h-3 w-3 text-success" />
              ) : trend === "down" ? (
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
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {target && <span>Cible: {target}</span>}
          {freq && <span className="text-primary/80">{freq}</span>}
        </div>
        {source && (
          <div className="mt-1 text-[10px] font-mono text-muted-foreground/70 truncate">
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
  className = "",
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/90">
          {title}
        </h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Gauge({ value, label, max = 100 }: { value: number; label: string; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const angle = (pct / 100) * 180;
  const color =
    value >= 85 ? "var(--success)" : value >= 70 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-44">
        <svg viewBox="0 0 200 110" className="w-full h-full">
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
            {value.toFixed(0)}%
          </text>
        </svg>
      </div>
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
