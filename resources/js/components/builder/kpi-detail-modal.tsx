import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { KpiDataResponse, KpiSeed } from "@/lib/kpi-rows";

interface KpiDetailModalProps {
  kpiCode: string;
  kpiData?: KpiDataResponse;
  kpiSeed?: KpiSeed;
  onClose: () => void;
}

function statusLabel(status: string) {
  switch (status) {
    case "green": return "Conforme";
    case "orange": return "Vigilance";
    case "red": return "Critique";
    default: return status.toUpperCase();
  }
}

function statusColorClass(status: string) {
  switch (status) {
    case "green": return "text-green-600";
    case "orange": return "text-orange-500";
    case "red": return "text-red-600";
    default: return "text-gray-400";
  }
}

function statusBgClass(status: string) {
  switch (status) {
    case "green": return "bg-green-500";
    case "orange": return "bg-orange-400";
    case "red": return "bg-red-500";
    default: return "bg-gray-400";
  }
}

function statusBorderClass(status: string) {
  switch (status) {
    case "green": return "border-l-green-500";
    case "orange": return "border-l-orange-400";
    case "red": return "border-l-red-500";
    default: return "border-l-gray-400";
  }
}

function formatValue(value: number | null, decimals: number, unit: string) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(decimals)}${unit}`;
}

function formatTimestamp(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("fr-FR");
}

export default function KpiDetailModal({ kpiCode, kpiData, kpiSeed, onClose }: KpiDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const value = kpiData?.scalar_value;
  const status = kpiData?.status ?? "grey";
  const mappedRows = kpiData?.mapped_rows;
  const computedAt = kpiData?.computed_at;
  const targetValue = kpiSeed?.cible_value;
  const targetOp = kpiSeed?.cible_operator ?? "<=";
  const unit = kpiSeed?.cible_is_percentage ? "%" : "";
  const decimals = kpiSeed?.cible_is_percentage ? 1 : 0;

  const rowKeys = mappedRows && mappedRows.length > 0
    ? Object.keys(mappedRows[0]).filter((k) => k !== "value")
    : [];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={`relative max-h-[90vh] w-full max-w-2xl rounded-lg border border-y-0 border-l-4 border-border bg-card shadow-xl ${statusBorderClass(status)} flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 pt-4 pb-2">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                {kpiCode}
              </span>
              {kpiSeed?.module && (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">
                  {kpiSeed.module}
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">
              {kpiSeed?.name ?? kpiCode}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Status cards */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
              <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Valeur actuelle
              </div>
              <div className={`font-mono text-2xl font-bold tabular-nums ${statusColorClass(status)}`}>
                {formatValue(value, decimals, unit)}
              </div>
            </div>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
              <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Cible
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-foreground">
                {targetValue != null ? `${targetOp} ${targetValue}${unit}` : "—"}
              </div>
            </div>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
              <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Statut
              </div>
              <div className={`text-xs font-bold uppercase ${statusColorClass(status)} mt-2`}>
                <span className={`inline-block h-2 w-2 rounded-full ${statusBgClass(status)} mr-1`} />
                {statusLabel(status)}
              </div>
            </div>
          </div>

          {/* Endpoint & Formula */}
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                Endpoint
              </h4>
              <div className="space-y-1 font-mono text-[10px]">
                {kpiSeed?.variables && kpiSeed.variables.length > 0 ? (
                  [...new Set(kpiSeed.variables.map((v) => v.endpoint))].map((ep) => (
                    <div key={ep} className="truncate rounded border border-border bg-secondary/10 px-2 py-1">
                      {ep}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground">—</div>
                )}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                Formule de calcul
              </h4>
              <div className="font-mono text-[10px]">
                {kpiSeed?.formula_readable ? (
                  <div className="rounded border border-border bg-secondary/10 px-2 py-1.5 leading-relaxed">
                    {kpiSeed.formula_readable}
                  </div>
                ) : (
                  <div className="text-muted-foreground">—</div>
                )}
              </div>
            </div>
          </div>

          {/* Source info */}
          <div className="mb-6">
            <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              Source
            </h4>
            <div className="space-y-1 font-mono text-[10px]">
              <div>
                <span className="text-muted-foreground">Dernière MàJ:</span> {formatTimestamp(computedAt)}
              </div>
              {kpiSeed?.refresh_frequency && (
                <div>
                  <span className="text-muted-foreground">Fréquence:</span> {kpiSeed.refresh_frequency}
                </div>
              )}
            </div>
          </div>

          {/* Mapped rows table */}
          {mappedRows && mappedRows.length > 0 && rowKeys.length > 0 && (
            <div>
              <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                Données détaillées ({mappedRows.length} lignes)
              </h4>
              <div className="max-h-48 overflow-auto rounded border border-border">
                <table className="w-full font-mono text-xs">
                  <thead className="sticky top-0 bg-secondary/60">
                    <tr className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase">
                      {rowKeys.map((k) => (
                        <th key={k} className="px-2 py-1 text-left">{k}</th>
                      ))}
                      <th className="px-2 py-1 text-right">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {rowKeys.map((k) => (
                          <td key={k} className="px-2 py-1">{String(row[k] ?? "")}</td>
                        ))}
                        <td className="px-2 py-1 text-right font-bold">{String(row.value ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border bg-secondary/5 px-5 py-3">
          <button
            onClick={onClose}
            className="h-8 rounded px-4 text-[10px] font-medium tracking-widest uppercase text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
