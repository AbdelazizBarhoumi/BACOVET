import { AlertCircle, AlertTriangle, CheckCircle, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, ReqLabel, LineKpi, ParetoChart } from "@/components/v1/primitives";
import { PageHeader, FilterPill, Filters, StatusFooter } from "@/components/v1/v1-shell";
import {
  fetchQualityKpis,
  fetchQualityQpTeams,
  fetchQualityAnnualTrend,
  fetchQualityParetoRft,
  fetchQualityParetoInspection,
  type KpiCard as ApiKpiCard,
  type AnnualTrendItem,
  type ParetoItem,
  type QpTeam,
} from "@/services/qualityApi";

type KpiRow = { id: string; title: string; v: number | null; target: number; dir: "max" | "min"; raw?: { num: number | null; den: number | null }; blocker?: string | null };
type TrendRow = { id: string; title: string; v: number | null; target: number; color: string; domain: [number, number]; data: number[] };

const KPI_DEFS: { id: string; title: string; target: number; dir: "max" | "min"; apiField: keyof ApiKpiCard extends never ? never : string }[] = [
  { id: "F-REQ-101", title: "BR (BLOCKING RATE)", target: 5, dir: "max", apiField: "br_commande" },
  { id: "F-REQ-102", title: "BR GTD", target: 5, dir: "max", apiField: "br_gtd_jour" },
  { id: "F-REQ-104", title: "RFT (RIGHT FIRST TIME)", target: 98, dir: "min", apiField: "rft_jour" },
  { id: "F-REQ-106", title: "BR BUNDLING", target: 5, dir: "max", apiField: "br_bundling_jour" },
  { id: "F-REQ-108", title: "BR PRINT", target: 5, dir: "max", apiField: "br_print" },
  { id: "F-REQ-110", title: "BR CARE LABEL", target: 5, dir: "max", apiField: "br_care_label_jour" },
  { id: "F-REQ-112", title: "BR ACCESSOIRES", target: 5, dir: "max", apiField: "br_accessoires_jour" },
  { id: "F-REQ-114", title: "BR COMPO", target: 5, dir: "max", apiField: "br_compo_jour" },
];

const TREND_DEFS: { id: string; title: string; target: number; domain: [number, number]; apiField: string; trendField: keyof AnnualTrendItem }[] = [
  { id: "F-REQ-103", title: "BR GTD DDA", target: 5, domain: [0, 8], apiField: "br_gtd_annee", trendField: "br_gtd" },
  { id: "F-REQ-105", title: "RFT DDA", target: 98, domain: [96, 100], apiField: "rft_annee", trendField: "rft" },
  { id: "F-REQ-107", title: "BR BUNDLING DDA", target: 5, domain: [0, 8], apiField: "br_bundling_annee", trendField: "br_bundling" },
  { id: "F-REQ-109", title: "BR PRINT DDA", target: 5, domain: [0, 12], apiField: "br_print_dda", trendField: "br_print" },
  { id: "F-REQ-111", title: "BR CARE LABEL DDA", target: 5, domain: [0, 8], apiField: "br_care_label_dda", trendField: "br_care_label" },
  { id: "F-REQ-113", title: "BR ACCESSOIRES DDA", target: 5, domain: [0, 8], apiField: "br_accessoires_dda", trendField: "br_accessoires" },
  { id: "F-REQ-115", title: "BR COMPO DDA", target: 5, domain: [0, 8], apiField: "br_compo_dda", trendField: "br_compo" },
];

function ok(v: number | null, target: number, dir: "max" | "min"): boolean {
  if (v == null) return false;
  return dir === "max" ? v <= target : v >= target;
}

export default function Page() {
  const [kpis, setKpis] = useState<KpiRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [paretoProd, setParetoProd] = useState<{ label: string; v: number }[]>([]);
  const [paretoFG, setParetoFG] = useState<{ label: string; v: number }[]>([]);
  const [bestQP, setBestQP] = useState<{ rank: number; name: string; score: number }[]>([]);
  const [lowQP, setLowQP] = useState<{ rank: number; name: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [kpisRes, teamsRes, trendRes, paretoRftRes, paretoInspRes] = await Promise.allSettled([
        fetchQualityKpis(),
        fetchQualityQpTeams(),
        fetchQualityAnnualTrend(),
        fetchQualityParetoRft(),
        fetchQualityParetoInspection(),
      ]);

      if (kpisRes.status === "fulfilled") {
        const raw = kpisRes.value;
        setKpis(
          KPI_DEFS.map((def) => {
            const card = (raw as Record<string, unknown>)[def.apiField] as ApiKpiCard | undefined;
            const r = card?.raw as Record<string, unknown> | undefined;
            return {
              id: def.id, title: def.title, v: card?.value ?? null, target: def.target, dir: def.dir,
              raw: r ? { num: (r.first_pass ?? r.total_rejets ?? r.bundle_reject ?? null) as number | null, den: (r.produced ?? r.total_inspections ?? r.bundle_inspected ?? null) as number | null } : undefined,
              blocker: card?.blocker ?? null,
            };
          }),
        );
      }

      if (trendRes.status === "fulfilled" && kpisRes.status === "fulfilled") {
        const rawKpis = kpisRes.value;
        const months = trendRes.value.data;
        setTrends(
          TREND_DEFS.map((def) => {
            const card = (rawKpis as Record<string, unknown>)[def.apiField] as ApiKpiCard | undefined;
            const latestVal = card?.value ?? null;
            const values = months.map((m) => (m as Record<string, unknown>)[def.trendField] as number | null);
            const data = values.filter((v): v is number => v !== null);
            const trendDir = def.title.startsWith("RFT") ? "min" : "max";
            const isOk = ok(latestVal, def.target, trendDir);
            const color = isOk ? "#3b82f6" : "#ef4444";
            return { id: def.id, title: def.title, v: latestVal, target: def.target, color, domain: def.domain, data };
          }),
        );
      }

      if (paretoRftRes.status === "fulfilled") {
        setParetoProd(paretoRftRes.value.data.map((p: ParetoItem) => ({ label: p.label, v: p.value })));
      }
      if (paretoInspRes.status === "fulfilled") {
        setParetoFG(paretoInspRes.value.data.map((p: ParetoItem) => ({ label: p.label, v: p.value })));
      }

      if (teamsRes.status === "fulfilled") {
        const map = (t: QpTeam, rank: number) => ({ rank, name: t.chain, score: t.score });
        setBestQP(teamsRes.value.best.map((t, i) => map(t, i + 1)));
        setLowQP(teamsRes.value.worst.map((t, i) => map(t, i + 1)));
      }

      const anyFailed = [kpisRes, teamsRes, trendRes, paretoRftRes, paretoInspRes].some((r) => r.status === "rejected");
      setError(anyFailed ? "Erreur de connexion au serveur" : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  return (
    <>
      <PageHeader
        title="SÉRIE 100 – PERFORMANCE QUALITÉ"
        subtitle="TABLEAU DE BORD QUALITÉ – INDUSTRY 4.0"
        filters={<>
          <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
          <FilterPill label="Ligne" value="Toutes" icon={Filters.Layers} />
          <FilterPill label="Atelier" value="Tous" icon={Filters.Factory} />
          <FilterPill label="Shift" value="Jour (07:00 - 19:00)" icon={Filters.Users} />
        </>}
      />
      <div className="p-3 space-y-3">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-xs font-bold uppercase">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-8 gap-2">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Card key={i}><div className="h-24 animate-pulse bg-muted rounded" /></Card>)
            : kpis.map((k) => {
                const isOk = ok(k.v, k.target, k.dir);
                const color = isOk ? "#22c55e" : "#ef4444";
                return (
                  <Card key={k.id} className={!isOk ? "border-[#ef4444]/40 bg-[#fee2e2]/30" : ""}>
                    <ReqLabel id={k.id} title={k.title} />
                    <div className="text-2xl font-black mt-1" style={{ color }}>{k.v != null ? k.v.toString().replace(".", ",") : "–"} %</div>
                    {k.raw && k.raw.num != null && k.raw.den != null && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {k.raw.num.toLocaleString()} / {k.raw.den.toLocaleString()} pcs
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-[10px] text-muted-foreground">Objectif : {k.dir === "max" ? "≤" : "≥"} {k.target} %</div>
                      {isOk ? <CheckCircle className="h-4 w-4 text-[#22c55e]" /> : <AlertCircle className="h-4 w-4 text-[#ef4444]" />}
                    </div>
                    {k.blocker && (
                      <div className="mt-1 text-[9px] text-amber-600 font-medium truncate" title={k.blocker}>⚠ {k.blocker}</div>
                    )}
                  </Card>
                );
              })}
        </div>

        <div className="grid grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Card key={i}><div className="h-48 animate-pulse bg-muted rounded" /></Card>)
            : trends.slice(0, 4).map((t) => <TrendCard key={t.id} t={t} />)}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Card key={i}><div className="h-48 animate-pulse bg-muted rounded" /></Card>)
            : <>
                {trends.slice(4).map((t) => <TrendCard key={t.id} t={t} />)}
                {Array.from({ length: 4 - trends.slice(4).length }).map((_, i) => <div key={i} />)}
              </>}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Card>
            <ReqLabel id="F-REQ-116" title="PARETO DEFECTS (PRODUCTION)" />
            {loading
              ? <div className="h-[180px] animate-pulse bg-muted rounded mt-2" />
              : <ParetoChart data={paretoProd} />}
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir détails</button>
          </Card>
          <Card>
            <ReqLabel id="F-REQ-117" title="PARETO DEFECTS FG (AQL + RFID)" />
            {loading
              ? <div className="h-[180px] animate-pulse bg-muted rounded mt-2" />
              : <ParetoChart data={paretoFG} />}
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir détails</button>
          </Card>
          <Card>
            <ReqLabel id="F-REQ-118" title="BEST QP TEAM (TOP 3 CHAÎNES QUALITÉ)" />
            {loading
              ? <div className="h-[180px] animate-pulse bg-muted rounded mt-2" />
              : <Podium3D items={bestQP} accent="gold" />}
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir classement</button>
          </Card>
          <Card>
            <ReqLabel id="F-REQ-119" title="LOW QP TEAM (3 CHAÎNES À AMÉLIORER)" />
            {loading
              ? <div className="h-[180px] animate-pulse bg-muted rounded mt-2" />
              : <Podium3D items={lowQP} accent="red" />}
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir plan d'action</button>
          </Card>
        </div>
      </div>
      <StatusFooter />
    </>
  );
}

function TrendCard({ t }: { t: TrendRow }) {
  return (
    <Card className={t.color === "#ef4444" ? "border-[#ef4444]/40" : ""}>
      <div className="flex items-start justify-between">
        <ReqLabel id={t.id} title={t.title} />
        {t.color === "#ef4444"
          ? <AlertCircle className="h-4 w-4 text-[#ef4444]" />
          : <CheckCircle className="h-4 w-4 text-[#22c55e]" />}
      </div>
      <div className="text-2xl font-black" style={{ color: t.color }}>{t.v != null ? t.v.toString().replace(".", ",") : "–"} %</div>
      <div className="text-[10px] text-muted-foreground mb-1">Objectif : {t.title.startsWith("RFT") ? "≥ 98 %" : "≤ 5 %"}</div>
      {t.data.length > 0 && (
        <LineKpi
          data={t.data.map((y, i) => ({ x: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"][i] ?? `M${i + 1}`, v: y }))}
          target={t.title.startsWith("RFT") ? 98 : 5}
          domain={t.domain}
          color={t.color}
          targetColor={t.color === "#ef4444" ? "#ef4444" : "#22c55e"}
          height={140}
        />
      )}
    </Card>
  );
}

// ─── colour helpers ────────────────────────────────────────────────────────────

function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(Math.min(255, r + (255 - r) * amt))},${Math.round(Math.min(255, g + (255 - g) * amt))},${Math.round(Math.min(255, b + (255 - b) * amt))})`;
}

function darken(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`;
}

// ─── Podium3D ─────────────────────────────────────────────────────────────────

function Podium3D({
  items,
  accent,
}: {
  items: { rank: number; name: string; score: number }[];
  accent: "gold" | "red";
}) {
  const baseColors: Record<number, string> =
    accent === "gold"
      ? { 1: "#facc15", 2: "#9ca3af", 3: "#b45309" }
      : { 1: "#ef4444", 2: "#9ca3af", 3: "#b45309" };

  const ordered = [
    items.find((i) => i.rank === 2),
    items.find((i) => i.rank === 1),
    items.find((i) => i.rank === 3),
  ].filter(Boolean) as { rank: number; name: string; score: number }[];

  const barW  = 44;
  const gap   = 12;
  const dx    = 10;
  const dy    = 6;
  const baseY = 155;
  const svgW  = 240;
  const hMap: Record<number, number> = { 1: 108, 2: 72, 3: 50 };
  const totalW = 3 * barW + 2 * gap + dx;
  const startX = (svgW - totalW) / 2;

  return (
    <svg
      viewBox="0 0 240 196"
      className="w-full mt-2"
      style={{ height: 180 }}
      aria-hidden="true"
    >
      <defs>
        {ordered.map((item) => {
          const c = baseColors[item.rank];
          return (
            <linearGradient
              key={item.rank}
              id={`bar3d-${accent}-${item.rank}`}
              x1="0" y1="0" x2="1" y2="0"
            >
              <stop offset="0%"   stopColor={lighten(c, 0.18)} />
              <stop offset="100%" stopColor={darken(c, 0.06)} />
            </linearGradient>
          );
        })}
      </defs>

      {ordered.map((item, idx) => {
        const c   = baseColors[item.rank];
        const h   = hMap[item.rank];
        const x   = startX + idx * (barW + gap);
        const y   = baseY - h;

        const topPts   = `${x},${y} ${x+barW},${y} ${x+barW+dx},${y-dy} ${x+dx},${y-dy}`;
        const rightPts = `${x+barW},${y} ${x+barW+dx},${y-dy} ${x+barW+dx},${baseY-dy} ${x+barW},${baseY}`;

        const fcx = x + barW / 2;
        const tcx = x + barW / 2 + dx / 2;

        return (
          <g key={item.rank}>
            <polygon points={rightPts} fill={darken(c, 0.42)} />
            <rect
              x={x} y={y}
              width={barW} height={h}
              fill={`url(#bar3d-${accent}-${item.rank})`}
            />
            <rect
              x={x} y={y}
              width={Math.round(barW * 0.28)} height={h}
              fill="rgba(255,255,255,0.10)"
            />
            <polygon points={topPts} fill={lighten(c, 0.40)} />
            <text
              x={fcx} y={baseY - 10}
              textAnchor="middle"
              fontSize="20" fontWeight="900"
              fill="rgba(255,255,255,0.82)"
              fontFamily="system-ui,sans-serif"
            >
              {item.rank}
            </text>

            {accent === "gold" && item.rank === 1 && (
              <g transform={`translate(${tcx - 6}, ${y - dy - 30})`}>
                <Trophy size={13} className="text-yellow-400" />
              </g>
            )}

            <text
              x={tcx} y={y - dy - 6}
              textAnchor="middle"
              fontSize="10" fontWeight="800"
              fill={c}
              fontFamily="system-ui,sans-serif"
            >
              {item.score.toString().replace(".", ",")}%
            </text>

            <text
              x={tcx} y={baseY + 14}
              textAnchor="middle"
              fontSize="8" fontWeight="600"
              fill="#9ca3af"
              fontFamily="system-ui,sans-serif"
            >
              {item.name}
            </text>

            <text
              x={tcx} y={baseY + 24}
              textAnchor="middle"
              fontSize="7"
              fill="#6b7280"
              fontFamily="system-ui,sans-serif"
            >
              QP Score
            </text>
          </g>
        );
      })}

      <line
        x1={startX - 4} y1={baseY}
        x2={startX + totalW + 4} y2={baseY}
        stroke="#d1d5db" strokeWidth="0.75" strokeOpacity="0.5"
      />
    </svg>
  );
}
