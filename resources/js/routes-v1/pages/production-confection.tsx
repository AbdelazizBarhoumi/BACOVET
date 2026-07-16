import { useState, useEffect, useCallback } from "react";
import { PageHeader, FilterPill, Filters, StatusFooter } from "@/components/v1/v1-shell";
import { Card, LineKpi, BarKpi, DonutKpi } from "@/components/v1/primitives";
import {
  fetchConfectionKpis,
  type ConfectionKpisResponse,
} from "@/services/productionApi";

// ─── Data shape matching the mock structure ──────────────────────────────────

interface HourlyRow {
  plage: string;
  dem: number;
  reel: number;
  eff: number;
}

interface ConfectionData {
  of: string;
  designation: string;
  efficienceJ1: number | null;
  oweJ1: number | null;
  ofProgressPct: number;
  wip1Pct: number;
  samMidPct: number | null;
  effectif: number;
  sot: number;
  sam: number;
  qteCde: number;
  bpd: string;
  epd: string;
  ehd: string;
  objectifJour: number | string;
  gtd: string | number;
  objectifsAM: number;
  objectifsOJ: number;
  gapSamSot: number;
  problemes: string;
  detail: string;
  efficienceSerie: { x: string; v: number }[];
  hourlySchedule: HourlyRow[];
  progressionRealise: number;
  cumulQty: number;
  cumulRestant: number;
}

// ─── Helper to extract numeric value from kpi_data ──────────────────────────

function extractNumber(val: number | string | null | undefined): number {
  if (val == null) return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

function extractString(val: number | string | null | undefined, fallback: string = "—"): string {
  if (val == null) return fallback;
  return String(val);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Page() {
  const [data, setData] = useState<ConfectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetchConfectionKpis();
      const kpi = res.data;

      if (!kpi) {
        setData(null);
        return;
      }

      // ── Map kpi_data values to page fields ──
      const of = extractString(kpi.of_confection?.value);
      const designation = extractString(kpi.designation_article?.value);
      const effectif = extractNumber(kpi.effectifs?.value);
      const sot = extractNumber(kpi.sot?.value);
      const sam = extractNumber(kpi.sam?.value);
      const objectifJour = extractNumber(kpi.objectif_chaine?.value);
      const qteCde = extractNumber(kpi.quantite_of?.value);
      const bpd = extractString(kpi.bpd?.value);
      const epd = extractString(kpi.epd?.value);
      const ehd = extractString(kpi.ehd?.value);
      const wip1Pct = extractNumber(kpi.wip?.value);
      const efficienceJ1 = kpi.efficience_operateur?.value != null ? extractNumber(kpi.efficience_operateur.value) : null;
      const oweJ1 = kpi.owe?.value != null ? extractNumber(kpi.owe.value) : null;
      const gtdValue = kpi.br_gtd?.value != null ? `${extractNumber(kpi.br_gtd.value).toFixed(1)}%` : "No data";
      const tauxAvancement = extractNumber(kpi.taux_avancement_of?.value);

      // ── HourlySchedule — distribute across elapsed time slots ──
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const workStart = 7.5;
      const elapsed = Math.max(0, currentHour + currentMinute / 60 - workStart);

      const totalSlots = 8;
      const cumulQty = extractNumber(kpi.couverture_chaine?.value);

      const plages = [
        "7:30-8:30", "8:30-9:30", "9:30-10:30", "10:30-11:30",
        "11:30-12:30", "13:00-14:00", "14:00-15:00", "15:00-16:00",
      ];

      const hourlySchedule = plages.map((plage, i) => {
        const slotStart = i < 5 ? 7.5 + i : 13 + (i - 5);
        const slotEnd = slotStart + 1;
        const inSlot = elapsed >= slotEnd ? 1 : elapsed > slotStart ? elapsed - slotStart : 0;

        const dem = objectifJour > 0 ? Math.round(objectifJour / totalSlots) : 0;
        const reel = inSlot > 0 && elapsed > 0
          ? Math.round(cumulQty * inSlot / elapsed)
          : 0;
        const eff = dem > 0 ? Math.round((reel / dem) * 100) : 0;

        return { plage, dem, reel, eff };
      });

      // ── Problemes / Detail from arrets ──
      const arretsValue = kpi.arrets_non_planifies?.value;
      const problemes = arretsValue != null ? extractString(arretsValue) : "Aucun arrêt";
      const detail = arretsValue != null ? `Arrêts: ${extractString(arretsValue)}` : "—";

      // ── EfficienceSerie from efficience_cumulee (placeholder) ──
      const efficienceSerie = [{ x: "Aujourd'hui", v: extractNumber(kpi.efficience_chaine?.value) }];

      setData({
        of,
        designation,
        efficienceJ1,
        oweJ1,
        ofProgressPct: tauxAvancement,
        wip1Pct,
        samMidPct: null,
        effectif,
        sot,
        sam,
        qteCde,
        bpd,
        epd,
        ehd,
        objectifJour,
        gtd: gtdValue,
        objectifsAM: 0,
        objectifsOJ: 0,
        gapSamSot: 0,
        problemes,
        detail,
        efficienceSerie,
        hourlySchedule,
        progressionRealise: tauxAvancement,
        cumulQty,
        cumulRestant: Math.max(0, objectifJour - cumulQty),
      });

      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erreur de chargement",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000); // refetch every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const d = data;

  // ── Loading state ──
  if (loading && !d) {
    return (
      <>
        <PageHeader
          title="TABLEAU DE BORD PRODUCTION – CONFECTION"
          subtitle="Chargement..."
          filters={
            <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
          }
        />
        <div className="p-6 text-center text-muted-foreground text-sm">
          Chargement des données de production...
        </div>
        <StatusFooter />
      </>
    );
  }

  // ── Error state ──
  if (error && !d) {
    return (
      <>
        <PageHeader
          title="TABLEAU DE BORD PRODUCTION – CONFECTION"
          subtitle="Erreur de chargement"
          filters={
            <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
          }
        />
        <div className="p-6 text-center text-destructive text-sm">
          {error}
        </div>
        <StatusFooter />
      </>
    );
  }

  // ── Empty state ──
  if (!d) {
    return (
      <>
        <PageHeader
          title="TABLEAU DE BORD PRODUCTION – CONFECTION"
          subtitle="Aucune donnée"
          filters={
            <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
          }
        />
        <div className="p-6 text-center text-muted-foreground text-sm">
          Aucune donnée de production disponible.
        </div>
        <StatusFooter />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="TABLEAU DE BORD PRODUCTION – CONFECTION"
        subtitle={`${d.of} – CONFECTION`}
        filters={
          <>
            <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
            <FilterPill label="Ligne" value="Ligne 1 - Série 200" icon={Filters.Layers} />
            <FilterPill
              label="Dernière mise à jour"
              value={new Date().toLocaleTimeString("fr-FR") + " · " + new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
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
                        <td className="px-2 py-3 text-2xl font-black text-center border border-border" rowSpan={2}>{d.of}</td>
                        <td className="px-2 py-3 text-center font-semibold border border-border" rowSpan={2}>{d.designation}</td>
                        <td className="px-2 py-3 text-center text-2xl font-black border border-border" rowSpan={2}>{d.efficienceJ1 != null ? `${d.efficienceJ1}%` : "-"}</td>
                        <td className="px-2 py-3 text-center text-2xl font-bold text-muted-foreground border border-border" rowSpan={2}>{d.oweJ1 != null ? `${d.oweJ1}%` : "-"}</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold border border-border">OF</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold border border-border">encours</td>
                        <td className="px-2 border border-border" colSpan={12}>
                          <div className="h-7 w-full bg-muted relative">
                            <div className="absolute inset-y-0 left-0 bg-[#22c55e]" style={{ width: `${d.ofProgressPct}%` }} />
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white"></div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-3 text-center text-[12px] font-bold bg-[#d803a5] text-white border border-border">WIP 1</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold bg-[#22c55e] text-white border border-border" colSpan={2}>{d.wip1Pct}%</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold bg-[#d803a5] text-white border border-border w-[200px]" colSpan={5} >
                          SAM
                        </td>                        <td className="px-2 py-3 text-center text-[12px] font-bold bg-[#22c55e] text-white border border-border">{d.samMidPct != null ? `${d.samMidPct}%` : "N/A"}</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold border border-border" colSpan={2}>Effectif</td>
                        <td className="px-2 py-3 text-center text-[12px] font-bold border border-border">{d.effectif}</td>
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
                          {d.gtd}
                        </div>
                      </div>
                      <div className="flex">
                        <div className="px-3 py-2 font-black text-xs w-1/3 flex items-center justify-center">
                          OBJECTIFS AM
                        </div>
                        <div className="flex-1 px-3 py-2 text-sm bg-[#ffa53c]/60 font-bold text-center flex items-center justify-center">
                          {d.objectifsAM}
                        </div>
                      </div>
                      <div className="flex">
                        <div className="px-3 py-2 font-black text-xs w-1/3 flex items-center justify-center">
                          OBJECTIFS OJ
                        </div>
                        <div className="flex-1 px-3 py-2 text-sm bg-[#ffa53c]/60 font-bold text-center flex items-center justify-center">
                          {d.objectifsOJ}
                        </div>
                      </div>
                    </Card>

                    <Card className="rounded-sm col-span-2 !p-0 overflow-hidden">
                      <div className="flex flex-col items-center justify-center w-full h-full text-center">
                        <div className=" bg-[#ffd600]/70 w-full h-full items-center justify-center flex flex-col">
                           <div className="text-base font-black text-foreground ">GAP</div>
                        <div className="text-xs text-muted-foreground">SAM/SOT</div>
                        </div>
                       
                        <div className="text-3xl font-black h-full items-center justify-center flex">
                          {d.gapSamSot}%
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="col-span-6 grid grid-cols-6 gap-3 ml-6 mt-3">
                    <MetricBig label="Effectif" value={String(d.effectif).replace(".", ",")} unit="opérateurs" color="#3b82f6" />
                    <MetricBig label="SOT" value={Number(d.sot).toLocaleString()} unit="min/pièce" color="#a855f7" />
                    <MetricBig label="SAM" value={Number(d.sam).toLocaleString()} unit="min/pièce" color="#ec4899" />
                  </div>

                </div>
                {/* HOURLY TABLE + 2×2 CHART GRID */}
                <div className="grid grid-cols-11 gap-3">

                  <div className="grid grid-cols-4 col-span-11 gap-3 mr-3">
                    <Card className="rounded-sm">
                      <div className="text-xs font-bold mb-1">EFFICENCE (%)</div>
                      <LineKpi data={d.efficienceSerie} target={90} domain={[0, 100]} color="#3b82f6" />
                    </Card>

                    <Card className="rounded-sm">
                      <div className="text-xs font-bold mb-1">PROGRESSION DE LA COMMANDE (%)</div>
                      <DonutKpi value={d.progressionRealise} color="#ec4899" label="Complétée" />
                      <div className="text-[10px] text-center mt-1">
                        <span className="text-[#ec4899] font-bold">Réalisé {d.progressionRealise.toFixed(2).replace(".", ",")}%</span> ·{" "}
                        <span className="text-muted-foreground">Restant {(100 - d.progressionRealise).toFixed(2).replace(".", ",")}%</span>
                      </div>
                    </Card>

                    <Card className="rounded-sm">
                      <div className="text-xs font-bold mb-1">QTE RÉELLE PAR HEURE</div>
                      <BarKpi data={d.hourlySchedule.map((h) => ({ x: h.plage, v: h.reel }))} color="#3b82f6" />
                    </Card>

                    <Card className="rounded-sm">
                      <div className="text-xs font-bold mb-1">EFFICIENCE (MULTIPLE DES OBJECTIFS)</div>
                      <BarKpi data={d.hourlySchedule.map((h) => ({ x: h.plage, v: h.eff }))} color="#ec4899" />
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
                        <td className="px-2 py-2 text-center text-base font-black text-[#22c55e] border border-border">{d.ofProgressPct},00%</td>
                        <td className="px-2 py-2 text-center text-base font-bold border border-border">{Number(d.qteCde).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-3 text-center text-[13px] font-bold border border-border">SOT</td>
                        <td className="px-2 py-3 text-center text-[13px] font-bold border border-border">{Number(d.sot).toLocaleString()}</td>
                      </tr>
                      <tr className="bg-secondary/30">
                        <td className="px-2 py-3 text-center text-[13px] font-bold border border-border">SAM</td>
                        <td className="px-2 py-3 text-center text-[13px] font-bold border border-border">{Number(d.sam).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* BPD / EPD / Objectif */}
                  <table className="text-xs border border-collapse border-l-0">
                    <tbody className="text-foreground">
                      <tr>
                        <td className="px-2 py-3 text-center text-[10px] font-bold bg-[#dbeafe]/30 border border-border">BPD</td>
                        <td className="px-2 py-3 text-center text-base font-black bg-[#dbeafe]/30 border border-border">{d.bpd}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-3 text-center text-[10px] font-bold bg-[#fed7aa]/30 border border-border">EPD</td>
                        <td className="px-2 py-3 text-center text-base font-black bg-[#fed7aa]/30 border border-border">{d.epd}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-3 text-center text-[10px] font-bold bg-[#fce7f3]/30 border border-border">Objectif</td>
                        <td className="px-2 py-3 text-center text-sm font-semibold bg-[#fce7f3]/30 border border-border">{d.objectifJour} p/j</td>
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
                      {d.ehd}
                    </div>
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">Problèmes</div>
                  <div className="bg-[#fce7f3] px-2 py-1.5 text-xs mt-1">{d.problemes}</div>
                  <div className="text-[10px] uppercase text-muted-foreground mt-2">Détail</div>
                  <div className="px-2 py-1.5 text-xs mt-1">{d.detail}</div>
                </Card>
              </div>

            </div>
            {/* ── end ROW ── */}



          </div>

        </div>
        {/* ============ end MAIN 12-COL GRID ============ */}

        {/* FOOTER METRIC STRIP — full width */}
        <div className="grid grid-cols-8 gap-2">
          <FootCard label="GTD" value={d.gtd} color="#ec4899" big={false} />
          <FootCard label="GAP SAM/SOT" value={`${d.gapSamSot}%`} color="#facc15" />
          <FootCard label="Objectif journalier" value={d.objectifJour} unit="pièces / jour" color="#3b82f6" />
          <FootCard label="QTE demandée" value={Number(d.objectifJour) || "—"} unit="pièces / h" color="#a855f7" />
          <FootCard label="QTE réalisée (heure en cours)" value={d.hourlySchedule[0]?.reel ?? "—"} unit="pièces / h" color="#06b6d4" />
          <FootCard label="Efficience (heure en cours)" value={d.hourlySchedule[0] ? `${d.hourlySchedule[0].eff}%` : "—"} unit="(multiple des objectifs)" color="#ec4899" />
          <FootCard label="Production du jour" value={d.cumulQty} unit="pièces" color="#f97316" />
          <FootCard label="Ecart vs objectif jour" value={d.objectifJour ? `+${d.cumulQty - Number(d.objectifJour)}` : "—"} unit="pièces" color="#14b8a6" />
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
