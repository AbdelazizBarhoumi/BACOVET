import { PageHeader, FilterPill, Filters, StatusFooter } from "@/components/v1/v1-shell";
import { Card, ReqLabel, LineKpi, ParetoChart } from "@/components/v1/primitives";
import { qualite as q } from "@/lib/mock-v1";
import { Check, AlertCircle, Trophy } from "lucide-react";
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
                  {ok ? <Check className="h-4 w-4 text-[#22c55e]" /> : <AlertCircle className="h-4 w-4 text-[#ef4444]" />}
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
            <Podium items={q.bestQP} accent="gold" />
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir classement</button>
          </Card>
          <Card>
            <ReqLabel id="F-REQ-119" title="LOW QP TEAM (3 CHAÎNES À AMÉLIORER)" />
            <Podium items={q.lowQP} accent="red" />
            <button className="w-full mt-2 text-[10px] uppercase tracking-widest border border-border rounded py-1.5 hover:bg-secondary">Voir plan d'action</button>
          </Card>
        </div>
      </div>
      <StatusFooter />
    </>
  );
}
function TrendCard({ t }: { t: typeof import("@/lib/mock-v1").qualite.trends[number] }) {
  const ok = t.v <= 5 || t.title.startsWith("RFT");
  return (
    <Card className={t.color === "#ef4444" ? "border-[#ef4444]/40" : ""}>
      <div className="flex items-start justify-between">
        <ReqLabel id={t.id} title={t.title} />
        {t.color === "#ef4444" ? <AlertCircle className="h-4 w-4 text-[#ef4444]" /> : <Check className="h-4 w-4 text-[#22c55e]" />}
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
function Podium({ items, accent }: { items: { rank: number; name: string; score: number }[]; accent: "gold" | "red" }) {
  const colors = accent === "gold"
    ? { 1: "#facc15", 2: "#9ca3af", 3: "#b45309" }
    : { 1: "#ef4444", 2: "#9ca3af", 3: "#b45309" };
  const heights = { 1: 90, 2: 70, 3: 55 } as Record<number, number>;
  const ordered = [items.find((i) => i.rank === 2), items.find((i) => i.rank === 1), items.find((i) => i.rank === 3)].filter(Boolean) as typeof items;
  return (
    <div className="flex items-end justify-around mt-2 h-[180px]">
      {ordered.map((it) => (
        <div key={it.rank} className="flex flex-col items-center gap-1">
          <div className="text-xs font-black" style={{ color: colors[it.rank as 1 | 2 | 3] }}>{it.score.toString().replace(".", ",")} %</div>
          <div className="text-[10px] font-semibold">{it.name}</div>
          <div className="text-[9px] text-muted-foreground">QP Score</div>
          <div className="w-14 flex flex-col items-center justify-end text-white font-black" style={{ height: heights[it.rank], backgroundColor: colors[it.rank as 1 | 2 | 3] }}>
            {accent === "gold" && it.rank === 1 ? <Trophy className="h-4 w-4 mb-1" /> : null}
            {it.rank}
          </div>
        </div>
      ))}
    </div>
  );
}
