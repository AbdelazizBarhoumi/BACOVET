import { PageHeader, FilterPill, Filters, StatusFooter } from "@/components/v1/v1-shell";
import { Card, ReqLabel, LineKpi, ParetoChart } from "@/components/v1/primitives";
import { qualite as q } from "@/lib/mock-v1";
import { AlertCircle, CheckCircle,Trophy } from "lucide-react";

export default function Page() {
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
        <div className="grid grid-cols-8 gap-2">
          {q.kpis.map((k) => {
            const ok = k.dir === "max" ? k.v <= k.target : k.v >= k.target;
            const color = ok ? "#22c55e" : "#ef4444";
            return (
              <Card key={k.id} className={!ok ? "border-[#ef4444]/40 bg-[#fee2e2]/30" : ""}>
                <ReqLabel id={k.id} title={k.title} />
                <div className="text-2xl font-black mt-1" style={{ color }}>{k.v.toString().replace(".", ",")} %</div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[10px] text-muted-foreground">Objectif : {k.dir === "max" ? "≤" : "≥"} {k.target} %</div>
                  {ok ? <CheckCircle className="h-4 w-4 text-[#22c55e]" /> : <AlertCircle className="h-4 w-4 text-[#ef4444]" />}
                </div>
              </Card>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {q.trends.slice(0, 4).map((t) => <TrendCard key={t.id} t={t} />)}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {q.trends.slice(4).map((t) => <TrendCard key={t.id} t={t} />)}
          {Array.from({ length: 4 - q.trends.slice(4).length }).map((_, i) => <div key={i} />)}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <ReqLabel id="F-REQ-116" title="PARETO DEFECTS (PRODUCTION)" />
            <ParetoChart data={q.paretoProd} />
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir détails</button>
          </Card>
          <Card>
            <ReqLabel id="F-REQ-117" title="PARETO DEFECTS FG (AQL + RFID)" />
            <ParetoChart data={q.paretoFG} />
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir détails</button>
          </Card>
          <Card>
            <ReqLabel id="F-REQ-118" title="BEST QP TEAM (TOP 3 CHAÎNES QUALITÉ)" />
            <Podium3D items={q.bestQP} accent="gold" />
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir classement</button>
          </Card>
          <Card>
            <ReqLabel id="F-REQ-119" title="LOW QP TEAM (3 CHAÎNES À AMÉLIORER)" />
            <Podium3D items={q.lowQP} accent="red" />
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir plan d'action</button>
          </Card>
        </div>
      </div>
      <StatusFooter />
    </>
  );
}

function TrendCard({ t }: { t: typeof import("@/lib/mock-v1").qualite.trends[number] }) {
  return (
    <Card className={t.color === "#ef4444" ? "border-[#ef4444]/40" : ""}>
      <div className="flex items-start justify-between">
        <ReqLabel id={t.id} title={t.title} />
        {t.color === "#ef4444"
          ? <AlertCircle className="h-4 w-4 text-[#ef4444]" />
          : <CheckCircle className="h-4 w-4 text-[#22c55e]" />}
      </div>
      <div className="text-2xl font-black" style={{ color: t.color }}>{t.v.toString().replace(".", ",")} %</div>
      <div className="text-[10px] text-muted-foreground mb-1">Objectif : {t.title.startsWith("RFT") ? "≥ 98 %" : "≤ 5 %"}</div>
      <LineKpi
        data={t.data.map((y, i) => ({ x: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00"][i], v: y }))}
        target={t.title.startsWith("RFT") ? 98 : 5}
        domain={t.domain}
        color={t.color}
        targetColor={t.color === "#ef4444" ? "#ef4444" : "#22c55e"}
        height={140}
      />
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

  // Classic podium order: 2nd · 1st · 3rd
  const ordered = [
    items.find((i) => i.rank === 2),
    items.find((i) => i.rank === 1),
    items.find((i) => i.rank === 3),
  ].filter(Boolean) as { rank: number; name: string; score: number }[];

  // Geometry
  const barW  = 44;   // bar width  (px in SVG coords)
  const gap   = 12;   // gap between bars
  const dx    = 10;   // 3-D depth  – horizontal component
  const dy    = 6;    // 3-D depth  – vertical component
  const baseY = 155;  // floor y
  const svgW  = 240;  // total SVG width
  const hMap: Record<number, number> = { 1: 108, 2: 72, 3: 50 };
  const totalW = 3 * barW + 2 * gap + dx;
  const startX = (svgW - totalW) / 2; // ≈ 37

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

        // Polygon point strings
        const topPts   = `${x},${y} ${x+barW},${y} ${x+barW+dx},${y-dy} ${x+dx},${y-dy}`;
        const rightPts = `${x+barW},${y} ${x+barW+dx},${y-dy} ${x+barW+dx},${baseY-dy} ${x+barW},${baseY}`;

        // Label anchor points
        const fcx = x + barW / 2;          // front-face horizontal centre
        const tcx = x + barW / 2 + dx / 2; // top-face   horizontal centre (for overbar labels)

        return (
          <g key={item.rank}>
            {/* ① Right side face – darkest (rendered first so front sits on top) */}
            <polygon points={rightPts} fill={darken(c, 0.42)} />

            {/* ② Front face – gradient left-light → right-shadow */}
            <rect
              x={x} y={y}
              width={barW} height={h}
              fill={`url(#bar3d-${accent}-${item.rank})`}
            />

            {/* ③ Subtle left-edge gloss strip */}
            <rect
              x={x} y={y}
              width={Math.round(barW * 0.28)} height={h}
              fill="rgba(255,255,255,0.10)"
            />

            {/* ④ Top face – lightest */}
            <polygon points={topPts} fill={lighten(c, 0.40)} />

            {/* Rank numeral centred near base of bar */}
            <text
              x={fcx} y={baseY - 10}
              textAnchor="middle"
              fontSize="20" fontWeight="900"
              fill="rgba(255,255,255,0.82)"
              fontFamily="system-ui,sans-serif"
            >
              {item.rank}
            </text>

{/* Trophy for best performer (gold only) */}
{accent === "gold" && item.rank === 1 && (
  <g transform={`translate(${tcx - 6}, ${y - dy - 30})`}>
    <Trophy size={13} className="text-yellow-400" />
  </g>
)}

            {/* Score label above bar */}
            <text
              x={tcx} y={y - dy - 6}
              textAnchor="middle"
              fontSize="10" fontWeight="800"
              fill={c}
              fontFamily="system-ui,sans-serif"
            >
              {item.score.toString().replace(".", ",")}%
            </text>

            {/* Team name */}
            <text
              x={tcx} y={baseY + 14}
              textAnchor="middle"
              fontSize="8" fontWeight="600"
              fill="#9ca3af"
              fontFamily="system-ui,sans-serif"
            >
              {item.name}
            </text>

            {/* "QP Score" sub-label */}
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

      {/* Floor baseline */}
      <line
        x1={startX - 4} y1={baseY}
        x2={startX + totalW + 4} y2={baseY}
        stroke="#d1d5db" strokeWidth="0.75" strokeOpacity="0.5"
      />
    </svg>
  );
}
