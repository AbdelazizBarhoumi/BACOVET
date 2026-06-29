import { PageHeader, FilterPill, Filters, StatusFooter } from "@/components/v1/v1-shell";
import { Card, LineKpi, BarKpi, DonutKpi } from "@/components/v1/primitives";
import { confection as c } from "@/lib/mock-v1";

export default function Page() {
  return (
    <>
      <PageHeader
        title="TABLEAU DE BORD PRODUCTION – CONFECTION"
        subtitle="CHAÎNE DE PRODUCTION N°1 – CONFECTION TEXTILE"
        filters={
          <>
            <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
            <FilterPill label="Ligne" value="Ligne 1 - Série 200" icon={Filters.Layers} />
            <FilterPill
              label="Dernière mise à jour"
              value="16:25:43 · 04 Avril 2026"
              icon={Filters.Clock ?? Filters.Calendar}
            />
          </>
        }
      />

      <div className="p-3 space-y-3">
        {/* MAIN 12-COL GRID: left content (9) + persistent right sidebar (3) */}
        <div className="grid grid-cols-12 gap-3">

          {/* ============ LEFT: MAIN CONTENT COLUMN ============ */}
          <div className="col-span-12 space-y-3">

            {/* ── ROW: 3 TABLES SIDE BY SIDE ── */}
            <div className="flex gap-0">

              {/* LEFT COLUMN: main OF table + GTD/GAP/metrics stacked under it */}
              <div className="flex-1 flex flex-col gap-3">

                {/* MAIN DATA TABLE */}
                <div className="!p-0 overflow-hidden">
                  <table className="w-full text-xs border border-collapse">
                    <thead className="bg-secondary/60 text-[13px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-center border border-border">OF</th>
                        <th className="px-3 py-2 text-center border border-border">Désignation</th>
                        <th className="px-3 py-2 text-center border border-border">Efficience J-1</th>
                        <th className="px-3 py-2 text-center border border-border">OWE J-1</th>
                        <th className="px-3 py-2 text-center border border-border" colSpan={3}>N° CDE</th>
                        <th className="px-3 py-2 text-center border border-border" colSpan={12}>Progression de la commande</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      <tr className="border-0">
                        <td className="px-2 py-3 text-2xl font-black text-center border border-border" rowSpan={2}>{c.of}</td>
                        <td className="px-2 py-3 text-center font-semibold border border-border" rowSpan={2}>{c.designation}</td>
                        <td className="px-2 py-3 text-center text-2xl font-black border border-border" rowSpan={2}>{c.efficienceJ1}%</td>
                        <td className="px-2 py-3 text-center text-2xl font-bold text-muted-foreground border border-border" rowSpan={2}>-</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold border border-border">OF</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold border border-border">encours</td>
                        <td className="px-2 border border-border" colSpan={12}>
                          <div className="h-7 w-full bg-muted relative">
                            <div className="absolute inset-y-0 left-0 bg-[#22c55e]" style={{ width: `${c.ofProgressPct}%` }} />
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white"></div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-3 text-center text-[12px] font-bold bg-[#d803a5] text-white border border-border">WIP 1</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold bg-[#22c55e] text-white border border-border" colSpan={2}>{c.wip1Pct}%</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold bg-[#d803a5] text-white border border-border w-[200px]" colSpan={5} >
                          SAM
                        </td>                        <td className="px-2 py-3 text-center text-[12px] font-bold bg-[#22c55e] text-white border border-border">{c.samMidPct}%</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold border border-border" colSpan={2}>Effectif</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold border border-border">{c.effectif}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* GTD · GAP SAM/SOT · EFFECTIF · SOT · SAM — directly under OF table */}
                <div className="grid grid-cols-11 gap-3 mr-3 overflow-hidden">
                  <div className="col-span-5 grid grid-cols-5 gap-3 mr-5">
                    <Card className="rounded-sm col-span-3 !p-0 overflow-hidden">
                      <div className="flex">
                        <div className="bg-[#d803a5] text-white px-3 py-2 font-black text-lg w-1/3 flex items-center justify-center">
                          GTD
                        </div>
                        <div className="flex-1 px-3 py-2 text-sm font-bold text-center flex items-center justify-center">
                          {c.gtd}
                        </div>
                      </div>
                      <div className="flex">
                        <div className="px-3 py-2 font-black text-xs w-1/3 flex items-center justify-center">
                          OBJECTIFS AM
                        </div>
                        <div className="flex-1 px-3 py-2 text-sm bg-[#ffd600]/60 font-bold text-center flex items-center justify-center">
                          {c.objectifsAM}
                        </div>
                      </div>
                      <div className="flex">
                        <div className="px-3 py-2 font-black text-xs w-1/3 flex items-center justify-center">
                          OBJECTIFS OJ
                        </div>
                        <div className="flex-1 px-3 py-2 text-sm bg-[#ffd600]/60 font-bold text-center flex items-center justify-center">
                          {c.objectifsOJ}
                        </div>
                      </div>
                    </Card>

                    <Card className="rounded-sm col-span-2 !p-0 overflow-hidden">
                      <div className="flex flex-col items-center justify-center bg-[#ffd600]/70 w-full h-full py-3 text-center">
                        <div className="text-base font-black text-foreground">GAP</div>
                        <div className="text-xs text-muted-foreground">SAM/SOT</div>
                        <div className="text-3xl font-black mt-2">{c.gapSamSot}%</div>
                      </div>
                    </Card>
                  </div>

                  <div className="col-span-6 grid grid-cols-6 gap-3 ml-6 mt-3">
                    <MetricBig label="Effectif" value={c.effectif.toString().replace(".", ",")} unit="opérateurs" color="#3b82f6" />
                    <MetricBig label="SOT" value={c.sot.toLocaleString()} unit="min/pièce" color="#a855f7" />
                    <MetricBig label="SAM" value={c.sam.toLocaleString()} unit="min/pièce" color="#ec4899" />
                  </div>

                </div>
                {/* HOURLY TABLE + 2×2 CHART GRID */}
                <div className="grid grid-cols-11 gap-3">
                  <Card className="rounded-none !p-0 overflow-hidden border-0 col-span-5">
                    <table className="w-full text-[12px] border-0">
                      <thead className="bg-secondary/60 text-[9px] uppercase">
                        <tr>
                          <th className="px-2 py-1.5 text-center">PLAGE HORAIRE</th>
                          <th>QTE DEMANDÉE</th>
                          <th>QTE RÉELLE/H</th>
                          <th>EFFIC( EN MULTIP DES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.hourlySchedule.map((h, i) => (
                          <tr key={i} className="border-0">
                            <td className="px-2 py-1.5 font-bold bg-[#fde047]/10 text-center">
                              {h.plage}
                            </td>
                            <td className="text-center">{h.dem}</td>
                            <td className={`text-center font-bold ${h.reel > 0 ? "text-foreground" : ""}`}>
                              {h.reel}
                            </td>
                            <td
                              className={`text-center font-black text-white ${h.eff >= 100 ? "bg-[#22c55e]" : "bg-[#ef4444]"
                                }`}
                            >
                              {h.eff}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>

                  <div className="grid grid-cols-2 col-span-6 gap-3 mr-3">
                    <Card className="rounded-sm">
                      <div className="text-xs font-bold mb-1">EFFICENCE (%)</div>
                      <LineKpi data={c.efficienceSerie} target={90} domain={[0, 100]} color="#3b82f6" />
                    </Card>

                    <Card className="rounded-sm">
                      <div className="text-xs font-bold mb-1">PROGRESSION DE LA COMMANDE (%)</div>
                      <DonutKpi value={c.progressionRealise} color="#ec4899" label="Complétée" />
                      <div className="text-[10px] text-center mt-1">
                        <span className="text-[#ec4899] font-bold">Réalisé 100,00%</span> ·{" "}
                        <span className="text-muted-foreground">Restant 0,00%</span>
                      </div>
                    </Card>

                    <Card className="rounded-sm">
                      <div className="text-xs font-bold mb-1">QTE RÉELLE PAR HEURE</div>
                      <BarKpi data={c.hourlySchedule.map((h) => ({ x: h.plage, v: h.reel }))} color="#3b82f6" />
                    </Card>

                    <Card className="rounded-sm">
                      <div className="text-xs font-bold mb-1">EFFICIENCE (MULTIPLE DES OBJECTIFS)</div>
                      <BarKpi data={c.hourlySchedule.map((h) => ({ x: h.plage, v: h.eff }))} color="#ec4899" />
                    </Card>
                  </div>
                </div>
              </div>
              {/* ── end LEFT COLUMN ── */}

              {/* % / QTÉ CDE + BPD/EPD/Objectif + EHD — stacked together on the right */}
              <div className="flex flex-col self-start">
                <div className="flex">
                  {/* % / QTÉ CDE */}
                  <table className="text-xs border border-collapse border-l-0">
                    <thead className="bg-secondary/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 text-center border border-border">%</th>
                        <th className="px-2 py-2 text-center border border-border">QTÉ CDE</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      <tr>
                        <td className="px-2 py-2 text-center text-base font-black text-[#22c55e] border border-border">{c.ofProgressPct},00%</td>
                        <td className="px-2 py-2 text-center text-base font-bold border border-border">{c.qteCde.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-3 text-center text-[13px] font-bold border border-border">SOT</td>
                        <td className="px-2 py-3 text-center text-[13px] font-bold border border-border">{c.sot.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-secondary/30">
                        <td className="px-2 py-3 text-center text-[13px] font-bold border border-border">SAM</td>
                        <td className="px-2 py-3 text-center text-[13px] font-bold border border-border">{c.sam.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* BPD / EPD / Objectif */}
                  <table className="text-xs border border-collapse border-l-0">
                    <tbody className="text-foreground">
                      <tr>
                        <td className="px-2 py-3 text-center text-[10px] font-bold bg-[#dbeafe]/30 border border-border">BPD</td>
                        <td className="px-2 py-3 text-center text-base font-black bg-[#dbeafe]/30 border border-border">{c.bpd}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-3 text-center text-[10px] font-bold bg-[#fed7aa]/30 border border-border">EPD</td>
                        <td className="px-2 py-3 text-center text-base font-black bg-[#fed7aa]/30 border border-border">{c.epd}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-3 text-center text-[10px] font-bold bg-[#fce7f3]/30 border border-border">Objectif</td>
                        <td className="px-2 py-3 text-center text-sm font-semibold bg-[#fce7f3]/30 border border-border">{c.objectifJour} p/j</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* PROBLÈMES / DÉTAIL — directly under EHD */}
                <Card className="rounded-sm mt-1">
                  <div className="flex">
                    <div className="bg-[#86efac] text-foreground px-3 py-2 font-bold text-sm w-24">
                      EHD :
                    </div>
                    <div className="bg-[#86efac]/60 px-3 py-2 font-black text-sm flex-1 text-center">
                      {c.ehd}
                    </div>
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">Problèmes</div>
                  <div className="bg-[#fce7f3] px-2 py-1.5 text-xs mt-1">pth qualité</div>
                  <div className="text-[10px] uppercase text-muted-foreground mt-2">Détail</div>
                  <div className="px-2 py-1.5 text-xs mt-1">t-shirt souillé</div>
                </Card>
              </div>

            </div>
            {/* ── end ROW ── */}



          </div>

        </div>
        {/* ============ end MAIN 12-COL GRID ============ */}

        {/* FOOTER METRIC STRIP — full width */}
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

function MetricBig({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <Card className="rounded-m col-span-2 flex flex-col items-center justify-center text-center">
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

function FootCard({
  label,
  value,
  unit,
  color,
  big = true,
}: {
  label: string;
  value: any;
  unit?: string;
  color: string;
  big?: boolean;
}) {
  return (
    <Card
      className="rounded-sm text-center"
      style={{ backgroundColor: hexToRgba(color, 0.05) }}
    >
      <div className="text-[10px] font-semibold" style={{ color }}>{label}</div>
      <div className={`${big ? "text-2xl" : "text-base"} font-black mt-1`} style={{ color }}>{value}</div>
      {unit && <div className="text-[9px] text-muted-foreground">{unit}</div>}
    </Card>
  );
}
