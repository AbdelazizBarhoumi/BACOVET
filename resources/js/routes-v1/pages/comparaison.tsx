import { PageHeader, FilterPill, Filters, StatusFooter } from "@/components/v1/v1-shell";
import { Card, ReqLabel, BarKpi, Sparkline, DonutKpi } from "@/components/v1/primitives";
import { chains18 as ch } from "@/lib/mock-v1";
const STATUS_COLOR: Record<string, string> = {
"Excellent": "#22c55e", "Bon": "#16a34a",
  "À surveiller": "#eab308", "À améliorer": "#f97316", "Critique": "#ef4444",
};
function statusBar(eff: number) {
  if (eff >= 90) return STATUS_COLOR["Excellent"];
  if (eff >= 85) return STATUS_COLOR["Bon"];
  if (eff >= 80) return STATUS_COLOR["À surveiller"];
 if (eff >= 75) return STATUS_COLOR["À améliorer"];
  return STATUS_COLOR["Critique"];
}
export default function Page() {
  const top5 = [...ch.rows].sort((a, b) => b.eff - a.eff).slice(0, 5);
 const bottom5 = [...ch.rows].sort((a, b) => a.eff - b.eff).slice(0, 5).reverse();
  return (
    <>
      <PageHeader
        title="COMPARAISON PERFORMANCE – 18 CHAÎNES"
        subtitle="CHAÎNE DE PRODUCTION N°1 – CONFECTION TEXTILE"
        filters={<>
          <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
          <FilterPill label="Ligne" value="Toutes" icon={Filters.Layers} />
          <FilterPill label="Atelier" value="Tous" icon={Filters.Factory} />
          <FilterPill label="Shift" value="Jour (07:00 - 19:00)" icon={Filters.Users} />
        </>}
      />
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-7 gap-3">
          <TopCard label="EFFICACITÉ MOYENNE" value={`${ch.effMoyenne.toString().replace(".", ",")} %`} sub="Objectif : ≥ 85 %" color="#22c55e" spark={[85, 86, 87, 88, 89, 89.6]} />
          <TopCard label="SOT MOYEN" value={ch.sotMoyen.toLocaleString()} sub="min/pièce" color="#a855f7" />
          <TopCard label="SAM MOYEN" value={ch.samMoyen.toLocaleString()} sub="min/pièce" color="#ec4899" />
          <TopCard label="WIP MOYEN" value={`${ch.wipMoyen} %`} sub="Objectif : ≤ 1/2 cadence" color="#f59e0b" />
          <TopCard label="COMMANDES" value={`${ch.commandes.toFixed(2).replace(".", ",")} %`} sub="Complétées" color="#22c55e" />
          <TopCard label="PRODUCTION DU JOUR" value={ch.prodJour.toString()} sub="pièces" color="#3b82f6" />
          <TopCard label="Objectif Eff. (%)" value="≥ 85%" sub="" color="#22c55e" />
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-5 !p-0 overflow-hidden">
            <div className="px-3 py-2 text-xs font-bold uppercase border-b border-border">Performance par Chaîne (18)</div>
            <table className="w-full text-[10px]">
              <thead className="bg-secondary/40 uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">#</th><th className="text-left">Chaîne</th>
                  <th>Efficacité (%)</th><th>Objectif (%)</th><th>SOT (min/pièce)</th>
                  <th>SAM (min/pièce)</th><th>WIP (%)</th><th>Statut</th><th>Tendance</th>
                </tr>
              </thead>
              <tbody>
                {ch.rows.map((r) => (
                  <tr key={r.n} className="border-t border-border">
                    <td className="px-2 py-1">{r.n}</td>
                    <td>{r.name}</td>
                    <td className="text-center text-white font-bold" style={{ backgroundColor: statusBar(r.eff) }}>{r.eff} %</td>
                    <td className="text-center text-muted-foreground">≥ 85 %</td>
                    <td className="text-center">{r.sot.toString().replace(".", ",")}</td>
                    <td className="text-center">{r.sam.toString().replace(".", ",")}</td>
                    <td className="text-center">{r.wip} %</td>
                    <td className="text-center font-semibold" style={{ color: STATUS_COLOR[r.status] }}>{r.status}</td>
                    <td className="w-16"><div className="h-4"><Sparkline data={[r.eff - 2, r.eff - 1, r.eff + 1, r.eff, r.eff + 0.5, r.eff]} color={statusBar(r.eff)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="col-span-7 space-y-3">
            <Card>
              <ReqLabel id="" title="EFFICACITÉ PAR CHAÎNE (%)" />
              <BarKpi
                data={ch.rows.map((r) => ({ x: String(r.n).padStart(2, "0"), v: r.eff }))}
                color="#3b82f6"
                target={85}
                height={200}
              />
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <ReqLabel id="" title="SOT PAR CHAÎNE (min/pièce)" />
                <BarKpi data={ch.rows.map((r) => ({ x: String(r.n).padStart(2, "0"), v: r.sot }))} color="#a855f7" height={170} />
              </Card>
              <Card>
                <ReqLabel id="" title="SAM PAR CHAÎNE (min/pièce)" />
                <BarKpi data={ch.rows.map((r) => ({ x: String(r.n).padStart(2, "0"), v: r.sam }))} color="#ec4899" height={170} />
              </Card>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <Card>
            <ReqLabel id="" title="WIP PAR CHAÎNE (%)" />
            <DonutKpi value={ch.wipMoyen} color="#f59e0b" label="Moyenne" />
            <ul className="text-[10px] mt-2 space-y-0.5">
              <li className="flex justify-between"><span><span className="inline-block h-2 w-2 bg-[#22c55e] mr-1"/>≤ 30 %</span><span>(3 chaînes)</span></li>
              <li className="flex justify-between"><span><span className="inline-block h-2 w-2 bg-[#3b82f6] mr-1"/>30 - 50 %</span><span>(9 chaînes)</span></li>
              <li className="flex justify-between"><span><span className="inline-block h-2 w-2 bg-[#f59e0b] mr-1"/>50 - 60 %</span><span>(4 chaînes)</span></li>
              <li className="flex justify-between"><span><span className="inline-block h-2 w-2 bg-[#ef4444] mr-1"/>&gt; 60 %</span><span>(2 chaînes)</span></li>
            </ul>
          </Card>
          <Card>
            <ReqLabel id="" title="RÉPARTITION PAR STATUT" />
            <DonutKpi value={100} color="#22c55e" label="Chaînes (18)" />
            <ul className="text-[10px] mt-2 space-y-0.5">
              <li className="flex justify-between"><span><span className="inline-block h-2 w-2 bg-[#22c55e] mr-1"/>Excellent</span><span>(5)</span></li>
                 <li className="flex justify-between"><span><span className="inline-block h-2 w-2 bg-[#16a34a] mr-1"/>Bon</span><span>(4)</span></li>
              <li className="flex justify-between"><span><span className="inline-block h-2 w-2 bg-[#eab308] mr-1"/>À surveiller</span><span>(3)</span></li>
              <li className="flex justify-between"><span><span className="inline-block h-2 w-2 bg-[#f97316] mr-1"/>À améliorer</span><span>(3)</span></li>
              <li className="flex justify-between"><span><span className="inline-block h-2 w-2 bg-[#ef4444] mr-1"/>Critique</span><span>(3)</span></li>
            </ul>
          </Card>
          <Card>
            <ReqLabel id="" title="TOP 5 MEILLEURES CHAÎNES" />
            <ul className="space-y-1.5 mt-1">
              {top5.map((r, i) => (
                <li key={r.n} className="flex items-center gap-2">
                  <span className="h-5 w-5 grid place-items-center bg-[#22c55e] text-white text-[10px] font-bold rounded">{i + 1}</span>
                  <span className="text-[11px] flex-1">{r.name}</span>
                  <div className="flex-1 h-2.5 bg-secondary rounded overflow-hidden"><div className="h-full bg-[#22c55e]" style={{ width: `${r.eff}%` }} /></div>
                  <span className="text-[11px] font-bold w-12 text-right">{r.eff}%</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <ReqLabel id="" title="TOP 5 À AMÉLIORER" />
            <ul className="space-y-1.5 mt-1">
              {bottom5.map((r, i) => (
                <li key={r.n} className="flex items-center gap-2">
                  <span className="h-5 w-5 grid place-items-center bg-[#ef4444] text-white text-[10px] font-bold rounded">{r.n}</span>
                  <span className="text-[11px] flex-1">{r.name}</span>
                  <div className="flex-1 h-2.5 bg-secondary rounded overflow-hidden"><div className="h-full bg-[#ef4444]" style={{ width: `${r.eff}%` }} /></div>
                  <span className="text-[11px] font-bold w-12 text-right">{r.eff}%</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="col-span-2">
            <ReqLabel id="" title="RÉSUMÉ GLOBAL" />
            <ul className="space-y-2 mt-1">
              <Row icon="✓" label="Efficacité moyenne" value={`${ch.effMoyenne} %`} color="#22c55e" />
              <Row icon="⏱" label="SOT moyen" value={`${ch.sotMoyen.toLocaleString()} min`} color="#a855f7" />
              <Row icon="⏱" label="SAM moyen" value={`${ch.samMoyen.toLocaleString()} min`} color="#ec4899" />
              <Row icon="⚙" label="WIP moyen" value={`${ch.wipMoyen} %`} color="#f59e0b" />
              <Row icon="✓" label="Commandes complétées" value={`${ch.commandes.toFixed(2).replace(".", ",")} %`} color="#22c55e" />
            </ul>
          </Card>
        </div>
      </div>
      <StatusFooter />
    </>
  );
}
function TopCard({ label, value, sub, color, spark }: { label: string; value: string; sub: string; color: string; spark?: number[] }) {
  return (
    <Card className="text-left">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-black mt-1" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
      {spark && <div className="h-6 mt-1"><Sparkline data={spark} color={color} type="area" /></div>}
    </Card>
  );
}
function Row({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="text-base" style={{ color }}>{icon}</span>
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </li>
  );
}
