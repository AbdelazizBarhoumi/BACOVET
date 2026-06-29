import { PageHeader, FilterPill, Filters, StatusFooter } from "@/components/v1/v1-shell";
import { Card, LineKpi, BarKpi, DonutKpi } from "@/components/v1/primitives";
import { confection as c } from "@/lib/mock-v1";
export default function Page() {
  return (
    <>
      <PageHeader
        title="TABLEAU DE BORD PRODUCTION – CONFECTION"
        subtitle="CHAÎNE DE PRODUCTION N°1 – CONFECTION TEXTILE"
        filters={<>
          <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
          <FilterPill label="Ligne" value="Ligne 1 - Série 200" icon={Filters.Layers} />
        </>}
      />
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-12 gap-3">
          <Card className=" rounded-sm col-span-9 !p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">OF</th>
                  <th className="px-2 py-2 text-left">Désignation</th>
                  <th className="px-2 py-2 text-center">Efficience J-1</th>
                  <th className="px-2 py-2 text-center">OWE J-1</th>
                  <th className="px-2 py-2 text-center">N° CDE</th>
                  <th className="px-2 py-2 text-center" colSpan={3}>Progression de la commande</th>
                  <th className="px-2 py-2 text-center">%</th>
                  <th className="px-2 py-2 text-center">QTÉ CDE</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-0">
                  <td className="px-2 py-3 text-2xl font-black text-center" rowSpan={2}>{c.of}</td>
                  <td className="px-2 py-3 text-center font-semibold" rowSpan={2}>{c.designation}</td>
                  <td className="px-2 py-3 text-center text-2xl font-black" rowSpan={2}>{c.efficienceJ1}%</td>
                  <td className="px-2 py-3 text-center text-2xl font-bold text-muted-foreground" rowSpan={2}>-</td>
                  <td className="px-2 py-2 text-center text-[10px]">OF</td>
                  <td className="px-1 py-1 text-center text-[10px]">encours</td>
                  <td className="px-1 py-1" colSpan={2}>
                    <div className="h-5 w-full bg-muted relative">
                      <div className="absolute inset-y-0 left-0 bg-[#22c55e]" style={{ width: `${c.ofProgressPct}%` }} />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{c.ofProgressPct},00%</div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center text-base font-black text-[#22c55e]">{c.ofProgressPct},00%</td>
                  <td className="px-2 py-2 text-center text-base font-bold">{c.qteCde.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-1 py-1 text-center text-[10px] bg-[#d803a5] text-white">WIP 1</td>
                  <td className="px-1 py-1 text-center text-[10px] bg-[#22c55e] text-white">{c.wip1Pct}%</td>
                  <td className="px-1 py-1 text-center text-[10px] bg-[#d803a5] text-white">SAM</td>
                  <td className="px-1 py-1 text-center text-[10px] bg-[#22c55e] text-white">{c.samMidPct}%</td>
                  <td className="px-2 py-1 text-center text-xs">Effectif {c.effectif}</td>
                  <td className="px-2 py-1 text-center text-xs">SOT {c.sot.toLocaleString()}</td>
                </tr>
                <tr className="border-0 bg-secondary/30">
                  <td colSpan={8} />
                  <td className="px-2 py-1 text-center text-xs">SAM</td>
                  <td className="px-2 py-1 text-center text-xs font-bold">{c.sam.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </Card>
          <div className="col-span-3 space-y-1.5">
            <div className="flex"><div className="bg-[#dbeafe] text-foreground px-3 py-2 font-bold text-sm w-24">BPD :</div><div className="bg-[#dbeafe]/60 px-3 py-2 font-black text-sm flex-1 text-center">{c.bpd}</div></div>
            <div className="flex"><div className="bg-[#fed7aa] text-foreground px-3 py-2 font-bold text-sm w-24">EPD :</div><div className="bg-[#fed7aa]/70 px-3 py-2 font-black text-sm flex-1 text-center">{c.epd}</div></div>
            <div className="flex"><div className="bg-[#fce7f3] text-foreground px-3 py-2 font-semibold text-xs w-24 text-center">Objectif</div><div className="px-3 py-2 text-xs flex-1 text-center">{c.objectifJour} pièces / jour</div></div>
            <div className="flex"><div className="bg-[#86efac] text-foreground px-3 py-2 font-bold text-sm w-24">EHD :</div><div className="bg-[#86efac]/60 px-3 py-2 font-black text-sm flex-1 text-center">{c.ehd}</div></div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Card className=" rounded-sm col-span-3 !p-0 overflow-hidden">
            <div className="flex">
              <div className="bg-[#d803a5] text-white px-3 py-2 font-black text-lg w-1/3 flex items-center justify-center">GTD</div>
              <div className="flex-1 px-3 py-2 text-sm font-bold text-center">{c.gtd}</div>
            </div>
            <div className="flex">
              <div className="px-3 py-2 font-black text-xs font-bold w-1/3 flex items-center justify-center">OBJECTIFS AM</div>
              <div className="flex-1 px-3 py-2 text-sm bg-[#ff9a00]/60 font-bold text-center">{c.objectifsAM}</div>
            </div>
            <div className="flex">
              <div className="px-3 py-2 font-black text-xs font-bold w-1/3 flex items-center justify-center">OBJECTIFS OJ</div>
              <div className="flex-1 px-3 py-2 text-sm bg-[#ff9a00]/60 font-bold text-center">{c.objectifsOJ}</div>
            </div>
          </Card>
          <div className=" rounded-sm col-span-2 xitems-center grid">
          <div className="flex flex-col items-center justify-center bg-[#ffd600]/70 rounded-sm w-full h-full">
                  <div className="text-base font-black text-foreground ">GAP</div>
            <div className="text-xs text-muted-foreground">SAM/SOT</div>
            </div> 
      
            <div className="text-3xl font-black mt-2 items-center">{c.gapSamSot}%</div>
          </div>
          <MetricBig label="Effectif" value={c.effectif.toString().replace(".", ",")} unit="opérateurs" color="#3b82f6" />
          <MetricBig label="SOT" value={c.sot.toLocaleString()} unit="min/pièce" color="#a855f7" />
          <MetricBig label="SAM" value={c.sam.toLocaleString()} unit="min/pièce" color="#ec4899" />
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Card className=" rounded-none col-span-3 !p-0 overflow-hidden border-0">
            <table className="w-full text-[11px] border-0">
              <thead className="bg-secondary/60 text-[9px] uppercase">
                <tr><th className="px-2 py-1.5 text-center">PLAGE HORAIRE</th><th>QTE DEMANDÉE</th><th>QTE RÉELLE/H</th><th>EFFIC( EN MULTIP DES</th></tr>
              </thead>
              <tbody>
                {c.hourlySchedule.map((h, i) => (
                  <tr key={i} className="border-0">
                    <td className="px-2 py-1.5 font-bold bg-[#fde047]/10 text-center">{h.plage}</td>
                    <td className="text-center">{h.dem}</td>
                    <td className={`text-center font-bold ${h.reel > 0 ? "text-foreground" : ""}`}>{h.reel}</td>
                    <td className={`text-center font-black text-white ${h.eff >= 100 ? "bg-[#22c55e]" : "bg-[#ef4444]"}`}>{h.eff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card className=" rounded-sm col-span-4">
            <div className="text-xs font-bold mb-1">EFFICENCE (%)</div>
            <LineKpi data={c.efficienceSerie} target={90} domain={[0, 100]} color="#3b82f6" />
          </Card>
          <Card className=" rounded-sm col-span-3">
            <div className="text-xs font-bold mb-1">PROGRESSION DE LA COMMANDE (%)</div>
            <DonutKpi value={c.progressionRealise} color="#ec4899" label="Complétée" />
            <div className="text-[10px] text-center mt-1"><span className="text-[#ec4899] font-bold">Réalisé 100,00%</span> · <span className="text-muted-foreground">Restant 0,00%</span></div>
          </Card>
          <Card className=" rounded-sm col-span-2">
            <div className="text-[10px] uppercase text-muted-foreground">Problèmes</div>
            <div className="bg-[#fce7f3] px-2 py-1.5 text-xs mt-1">{c.problemes}</div>
            <div className="text-[10px] uppercase text-muted-foreground mt-2">Détail</div>
            <div className="border-0 px-2 py-1.5 text-xs mt-1">{c.detail}</div>
          </Card>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Card className=" rounded-sm col-span-6 rounded-sm">
            <div className="text-xs font-bold mb-1">QTE RÉELLE PAR HEURE</div>
            <BarKpi data={c.hourlySchedule.map((h) => ({ x: h.plage, v: h.reel }))} color="#3b82f6" />
          </Card>
          <Card className=" rounded-sm col-span-6">
            <div className="text-xs font-bold mb-1">EFFICENCE (MULTIPLE DES OBJECTIFS)</div>
            <BarKpi data={c.hourlySchedule.map((h) => ({ x: h.plage, v: h.eff }))} color="#ec4899" />
          </Card>
        </div>
        <div className="grid grid-cols-8 gap-2">
          <FootCard label="GTD" value={c.gtd} color="#ec4899" big={false} />
          <FootCard label="GAP SAM/SOT" value={`${c.gapSamSot}%`} color="#facc15" />
          <FootCard label="Objectif journalier" value={c.objectifJour} unit="pièces / jour" color="#3b82f6" />
          <FootCard label="QTE demandée" value={67} unit="pièces / h" color="#a855f7" />
          <FootCard label="QTE réalisée (heure en cours)" value={85} unit="pièces / h" color="#06b6d4" />
          <FootCard label="Efficience (heure en cours)" value="126%" unit="(multiple des objectifs)" color="#ec4899" />
          <FootCard label="Production du jour" value={85} unit="pièces" color="#f97316" />
          <FootCard label="Ecart vs objectif jour" value="+85" unit="pièces" color="#14b8a6" />
        </div>
      </div>
      <StatusFooter />
    </>
  );
}
function MetricBig({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <Card className=" rounded-sm col-span-2 flex flex-col items-center justify-center text-center">
      <div className="text-xs font-bold" style={{ color }}>{label}</div>
      <div className="text-2xl font-black mt-1" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-foreground" style={{ color }}>{unit}</div>
    </Card>
  );
}
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function FootCard({ label, value, unit, color, big = true }: { label: string; value: any; unit?: string; color: string; big?: boolean }) {
  return (
<Card
  className="rounded-sm text-center"
  style={{
    backgroundColor: hexToRgba(color, 0.05),
  }}
>
      <div className="text-[10px] font-semibold" style={{ color }}>{label}</div>
      <div className={`${big ? "text-2xl" : "text-base"} font-black mt-1`} style={{ color }}>{value}</div>
      {unit && <div className="text-[9px] text-muted-foreground">{unit}</div>}
    </Card>
  );
}
