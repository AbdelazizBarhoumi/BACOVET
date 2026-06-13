import { X, Info } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import type { QualityKpis, KpiCard as KpiCardType, BrChartItem, AnnualTrendItem } from "@/services/qualityApi";
import { KPI_DETAIL_CONFIG, type KpiKey } from "./kpiDetailConfig";

interface KpiDetailModalProps {
  kpiKey: KpiKey | null;
  kpiData: QualityKpis | null;
  brChartData: BrChartItem[];
  trendData: AnnualTrendItem[];
  onClose: () => void;
}

function statusColor(status: string) {
  switch (status) {
    case "green":
      return "text-green-600";
    case "orange":
      return "text-orange-500";
    case "red":
      return "text-red-600";
    default:
      return "text-gray-400";
  }
}

function statusBorder(status: string) {
  switch (status) {
    case "green":
      return "border-l-green-500";
    case "orange":
      return "border-l-orange-400";
    case "red":
      return "border-l-red-500";
    default:
      return "border-l-gray-400";
  }
}

function statusDot(status: string) {
  switch (status) {
    case "green":
      return "bg-green-500";
    case "orange":
      return "bg-orange-400";
    case "red":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function formatValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}${unit}`;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 40;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrBreakdownTable({
  brChartData,
  target,
}: {
  brChartData: BrChartItem[];
  target: number;
}) {
  if (brChartData.length === 0) return null;
  const sorted = [...brChartData].sort((a, b) => (b.defect_pct ?? 0) - (a.defect_pct ?? 0));
  const top = sorted.slice(0, 5);

  return (
    <div className="mt-4">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
        Ventilation par chaîne
      </h4>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <th className="text-left py-1">Chaîne</th>
            <th className="text-right">Valeur</th>
            <th className="text-center w-16">Statut</th>
            <th className="text-right">Écart cible</th>
          </tr>
        </thead>
        <tbody>
          {top.map((item) => {
            const diff = item.defect_pct != null ? item.defect_pct - target : null;
            const diffStr = diff != null ? (diff > 0 ? `+${diff.toFixed(1)}pp` : `${diff.toFixed(1)}pp`) : "—";
            const diffColor = diff != null ? (diff > 0 ? "text-red-600" : "text-green-600") : "text-muted-foreground";
            return (
              <tr key={item.stage} className="border-b border-border/50">
                <td className="py-1.5 font-bold">{item.stage}</td>
                <td className="text-right tabular-nums">
                  {item.defect_pct != null ? `${item.defect_pct.toFixed(1)}%` : "—"}
                </td>
                <td className="text-center">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${statusDot(item.status)}`}
                  />
                </td>
                <td className={`text-right ${diffColor}`}>{diffStr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrendSection({
  trendData,
  kpiKey,
  color,
}: {
  trendData: AnnualTrendItem[];
  kpiKey: KpiKey;
  color: string;
}) {
  const values = trendData
    .map((d) => (kpiKey.includes("rft") ? d.rft : d.br_gtd))
    .filter((v): v is number => v !== null);

  if (values.length < 2) return null;

  return (
    <div className="mt-4">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
        Tendance (7 derniers points)
      </h4>
      <Sparkline data={values.slice(-7)} color={color} />
    </div>
  );
}

function InfoBox({ config }: { config: (typeof KPI_DETAIL_CONFIG)[KpiKey] }) {
  const reason = config.thresholds.grey || "Données non disponibles";
  const action =
    config.source.status === "pending"
      ? "Action requise: équipe DIVA"
      : config.source.status === "inactive"
        ? "Action requise: activation B-01"
        : "Action requise: connecteur Google Drive";

  return (
    <div className="mt-4 rounded-md border border-dashed border-border bg-secondary/30 p-4">
      <div className="flex items-start gap-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <div className="text-xs font-bold text-muted-foreground mb-1">
            Données indisponibles
          </div>
          <div className="text-xs text-muted-foreground/80">{reason}</div>
          <div className="text-xs text-muted-foreground/60 mt-1">{action}</div>
        </div>
      </div>
    </div>
  );
}

function CsvExport({
  kpiKey,
  config,
  brChartData,
  kpiData,
}: {
  kpiKey: KpiKey;
  config: (typeof KPI_DETAIL_CONFIG)[KpiKey];
  brChartData: BrChartItem[];
  kpiData: QualityKpis;
}) {
  const handleExport = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    const wb = XLSX.utils.book_new();

    if (config.breakdownAvailable && brChartData.length > 0) {
      const rows = brChartData.map((item) => ({
        Étape: item.stage,
        Valeur: item.defect_pct != null ? `${item.defect_pct.toFixed(2)}%` : "—",
        Statut: item.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Ventilation");
    } else {
      const kpiKeyMap: Record<KpiKey, keyof QualityKpis> = {
        br_cgl: "br_cgl", br_gtd_jour: "br_gtd_jour", rft_jour: "rft_jour",
        br_bundling_jour: "br_bundling_jour", br_gtd_dda: "br_gtd_annee",
        rft_annee: "rft_annee", br_bundling_annee: "br_bundling_annee",
        br_print: "br_print", br_print_dda: "br_print_dda",
        br_care_label_jour: "br_care_label_jour", br_care_label_dda: "br_care_label_dda",
        br_accessoires_jour: "br_accessoires_jour", br_accessoires_dda: "br_accessoires_dda",
        br_compo_jour: "br_compo_jour", br_compo_dda: "br_compo_dda",
      };
      const card = kpiData[kpiKeyMap[kpiKey]] as KpiCardType | undefined;
      const rows = [{
        KPI: config.label,
        Valeur: card?.value != null ? `${card.value.toFixed(1)}%` : "—",
        Statut: card?.status ?? "grey",
        Cible: `${config.target.operator}${config.target.value}%`,
      }];
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "KPI");
    }

    XLSX.writeFile(wb, `BACOVET_Qualite_${kpiKey}_${today}.xlsx`);
  }, [kpiKey, config, brChartData, kpiData]);

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-[10px] uppercase tracking-wider"
      onClick={handleExport}
    >
      Exporter XLSX
    </Button>
  );
}

export default function KpiDetailModal({
  kpiKey,
  kpiData,
  brChartData,
  trendData,
  onClose,
}: KpiDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!kpiKey) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [kpiKey, onClose]);

  if (!kpiKey || !kpiData) return null;

  const config = KPI_DETAIL_CONFIG[kpiKey];

  // Map kpiKey to QualityKpis response key
  const kpiKeyMap: Record<KpiKey, keyof QualityKpis> = {
    br_cgl: "br_cgl",
    br_gtd_jour: "br_gtd_jour",
    rft_jour: "rft_jour",
    br_bundling_jour: "br_bundling_jour",
    br_gtd_dda: "br_gtd_annee",
    rft_annee: "rft_annee",
    br_bundling_annee: "br_bundling_annee",
    br_print: "br_print",
    br_print_dda: "br_print_dda",
    br_care_label_jour: "br_care_label_jour",
    br_care_label_dda: "br_care_label_dda",
    br_accessoires_jour: "br_accessoires_jour",
    br_accessoires_dda: "br_accessoires_dda",
    br_compo_jour: "br_compo_jour",
    br_compo_dda: "br_compo_dda",
  };

  const card = kpiData[kpiKeyMap[kpiKey]] as KpiCardType | undefined;

  if (!card) return null;

  const cardStatus = card.status || "grey";
  const isLive = config.source.status === "live";
  const borderColor = statusBorder(cardStatus);
  const valueColor = statusColor(cardStatus);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={contentRef}
        className={`relative w-full max-w-2xl max-h-[90vh] rounded-lg border border-border bg-card shadow-xl border-l-4 ${borderColor} flex flex-col`}
        onClick={handleContentClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-2 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {config.id}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Série 100
              </span>
            </div>
            <h2
              id="modal-title"
              className="text-sm font-bold uppercase tracking-wider text-foreground"
            >
              {config.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Top stat boxes */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Valeur actuelle
              </div>
              <div className={`text-2xl font-bold font-mono tabular-nums ${valueColor}`}>
                {formatValue(card.value, config.formula.resultUnit)}
              </div>
            </div>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Cible
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
                {config.target.operator}
                {config.target.value}
                {config.formula.resultUnit}
              </div>
            </div>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Statut
              </div>
              <div className={`text-sm font-bold uppercase ${statusColor(cardStatus)}`}>
                {cardStatus === "green"
                  ? "🟢 Conforme"
                  : cardStatus === "orange"
                    ? "🟠 Vigilance"
                    : cardStatus === "red"
                      ? "🔴 Critique"
                      : cardStatus === "inactive"
                        ? "⚫ Inactif"
                        : cardStatus === "pending"
                          ? "⚪ En attente"
                          : "⚪ Indisponible"}
              </div>
            </div>
          </div>

          {/* Formula */}
          <div className="mb-5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Formule de calcul
            </h4>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex-1 rounded border border-border bg-secondary/20 p-2">
                <div className="text-[10px] text-muted-foreground">
                  {config.formula.numerator.label}
                </div>
                <div className="font-bold">{config.formula.numerator.field}</div>
              </div>
              <div className="text-lg text-muted-foreground">÷</div>
              <div className="flex-1 rounded border border-border bg-secondary/20 p-2">
                <div className="text-[10px] text-muted-foreground">
                  {config.formula.denominator.label}
                </div>
                <div className="font-bold">{config.formula.denominator.field}</div>
              </div>
              <div className="text-lg text-muted-foreground">×</div>
              <div className="text-lg font-bold">{config.formula.multiplier}</div>
            </div>
          </div>

          {/* Data source */}
          <div className="mb-5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Source de données
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono">
              <div>
                <span className="text-muted-foreground">Système: </span>
                <span className="font-bold">{config.source.system}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fréquence: </span>
                <span className="font-bold">{config.source.frequency}</span>
              </div>
              {config.source.novacityEndpoint && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Endpoint Novacity: </span>
                  <span className="font-bold text-[11px]">
                    {config.source.novacityEndpoint}
                  </span>
                </div>
              )}
              {config.source.mysqlTable && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Table MySQL: </span>
                  <span className="font-bold">{config.source.mysqlTable}</span>
                </div>
              )}
              {kpiData.synced_at && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Dernière synchro: </span>
                  <span className="font-bold">
                    {new Date(kpiData.synced_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown or info box */}
          {isLive && config.breakdownAvailable ? (
            <BrBreakdownTable
              brChartData={brChartData}
              target={config.target.value}
            />
          ) : !isLive ? (
            <InfoBox config={config} />
          ) : null}

          {/* Trend */}
          {isLive && config.trendAvailable && (
            <TrendSection
              trendData={trendData}
              kpiKey={kpiKey}
              color={
                cardStatus === "green"
                  ? "#16a34a"
                  : cardStatus === "orange"
                    ? "#ea580c"
                    : cardStatus === "red"
                      ? "#dc2626"
                      : "#6b7280"
              }
            />
          )}

          {/* Alert rules */}
          <div className="mt-5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Règle d'alerte
            </h4>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Vert: </span>
                <span>{config.thresholds.green}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                <span className="text-muted-foreground">Orange: </span>
                <span>{config.thresholds.orange}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Rouge: </span>
                <span>{config.thresholds.red}</span>
              </div>
              {config.thresholds.grey && (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-muted-foreground">Gris: </span>
                  <span>{config.thresholds.grey}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          {isLive ? (
            <CsvExport
              kpiKey={kpiKey}
              config={config}
              brChartData={brChartData}
              kpiData={kpiData}
            />
          ) : (
            <div />
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-[10px] uppercase tracking-wider"
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
