import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { BigNumberCard, Panel, TrafficBadge } from "@/components/widgets";
import { quality, statusFor } from "@/lib/mock";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { auth } from "@/hooks/use-auth";

export const Route = createFileRoute("/quality")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    if (!auth.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (!auth.hasAccess("/quality")) {
      throw redirect({ to: "/unauthorized" });
    }
  },
  head: () => ({ meta: [{ title: "Qualité — BACOVET" }] }),
  component: QualityPage,
});

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  fontSize: 12,
};

function colorFor(v: number, target: number, kind: "min" | "max") {
  const s = statusFor(v, target, kind);
  return s === "green"
    ? "var(--success)"
    : s === "orange"
      ? "var(--warning)"
      : "var(--destructive)";
}

type Alert = { type: string; of: string; time: string; level: "green" | "orange" | "red" };
function generateAlerts(q: typeof quality): Alert[] {
  const now = new Date().toTimeString().slice(0, 5);
  const out: Alert[] = [];
  const push = (cond: boolean, type: string, of: string, level: Alert["level"]) => {
    if (cond) out.push({ type, of, time: now, level });
  };
  push(q.rftToday < 95, "RFT CRITIQUE", "OF-courant", "red");
  push(q.rftToday >= 95 && q.rftToday < 98, "RFT EN BAISSE", "OF-courant", "orange");
  push(q.brBundlingToday > 5, "BR BUNDLING DÉPASSÉ", "OF-courant", "red");
  push(
    q.brBundlingToday > 4 && q.brBundlingToday <= 5,
    "BR BUNDLING VIGILANCE",
    "OF-courant",
    "orange",
  );
  push(q.brPrintToday > 5, "BR PRINT CRITIQUE", "Sérigraphie", "red");
  push(q.brCglYear > 5, "BR CGL ANNÉE DÉPASSÉ", "DDA", "red");
  // Stage-level
  q.brByStage.forEach((s) =>
    push(s.value > 5, `BR ${s.stage.toUpperCase()} DÉPASSÉ`, s.stage, "red"),
  );
  if (out.length === 0) out.push({ type: "TOUS LES KPIs OK", of: "—", time: now, level: "green" });
  return out.slice(0, 6);
}

function QualityPage() {
  const q = quality;
  const exportRows = [
    { kpi: "F-REQ-104 RFT (jour)", valeur: q.rftToday, cible: "≥98%" },
    { kpi: "F-REQ-105 RFT DDA (année)", valeur: q.rftYear, cible: "≥98%" },
    { kpi: "F-REQ-106 BR Bundling (jour)", valeur: q.brBundlingToday, cible: "≤5%" },
    { kpi: "F-REQ-107 BR Bundling DDA (année)", valeur: q.brBundlingYear, cible: "≤5%" },
    { kpi: "F-REQ-108 BR Print (jour)", valeur: q.brPrintToday, cible: "≤5%" },
    { kpi: "F-REQ-101 BR CGL (année)", valeur: q.brCglYear, cible: "≤5%" },
    ...q.brByStage.map((s) => ({ kpi: `BR ${s.stage}`, valeur: s.value, cible: "≤5%" })),
  ];
  return (
    <AppShell
      page="/quality"
      title="Qualité"
      subtitle="Série 100 · Performance Qualité"
      exportRows={exportRows}
      exportFilename="BACOVET_Qualite_S100"
    >
      {/* Section A — Big KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <BigNumberCard
          label="RFT (Ce jour) · F-REQ-104"
          value={q.rftToday}
          target="≥ 98%"
          status={statusFor(q.rftToday, 98)}
          source="q/pieces_ok_premier_coup"
        />
        <BigNumberCard
          label="BR Bundling (Ce jour) · F-REQ-106"
          value={q.brBundlingToday}
          target="≤ 5%"
          status={statusFor(q.brBundlingToday, 5, "max")}
          source="q/rejets_inspection_paquet"
        />
        <BigNumberCard
          label="BR Print (Ce jour) · F-REQ-108"
          value={q.brPrintToday}
          target="≤ 5%"
          status={statusFor(q.brPrintToday, 5, "max")}
          source="Google Drive"
        />
        <BigNumberCard
          label="BR CGL (Année) · F-REQ-101"
          value={q.brCglYear}
          target="≤ 5%"
          status={statusFor(q.brCglYear, 5, "max")}
          source="DIVA database"
        />
      </div>

      {/* Section B */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Panel title="Bad Rate par étape de contrôle" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={q.brByStage}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="stage" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis unit="%" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine
                y={5}
                stroke="var(--warning)"
                strokeDasharray="4 4"
                label={{ value: "Cible 5%", fill: "var(--warning)", fontSize: 10 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {q.brByStage.map((d, i) => (
                  <Cell key={i} fill={colorFor(d.value, 5, "max")} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Dernières alertes qualité">
          <div className="space-y-2">
            {generateAlerts(q).map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <TrafficBadge status={a.level} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider truncate">
                      {a.type}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">{a.of}</div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">{a.time}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Section C — Annual trend */}
      <Panel title="RFT & BR — Année en cours" className="mb-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={q.trend}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mois" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <YAxis unit="%" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={98} stroke="var(--success)" strokeDasharray="4 4" />
            <ReferenceLine y={5} stroke="var(--destructive)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="rft"
              name="RFT DDA"
              stroke="var(--chart-4)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="br"
              name="BR Bundling DDA"
              stroke="var(--destructive)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Section D — Pareto Tabs */}
      <Panel title="Pareto des défauts">
        <Tabs defaultValue="rft">
          <TabsList>
            <TabsTrigger value="rft" className="text-xs uppercase tracking-wider">
              Pareto RFT (F-REQ-116)
            </TabsTrigger>
            <TabsTrigger value="colis" className="text-xs uppercase tracking-wider">
              Pareto Inspection Colis (F-REQ-117)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="rft">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={q.paretoRft} layout="vertical">
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis
                  dataKey="op"
                  type="category"
                  width={130}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="qty" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="colis">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={q.paretoColis} layout="vertical">
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis
                  dataKey="item"
                  type="category"
                  width={130}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--chart-4)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </Panel>

      {/* KPI summary table */}
      <Panel title="Synthèse des indicateurs Qualité" className="mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono border-b border-border">
              <th className="text-left py-2">KPI ID</th>
              <th className="text-left">Indicateur</th>
              <th className="text-right">Valeur</th>
              <th className="text-right">Cible</th>
              <th className="text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {[
              ["F-REQ-104", "RFT Prod (jour)", q.rftToday, "≥ 98%", statusFor(q.rftToday, 98)],
              ["F-REQ-105", "RFT DDA (année)", q.rftYear, "≥ 98%", statusFor(q.rftYear, 98)],
              [
                "F-REQ-106",
                "BR Bundling (jour)",
                q.brBundlingToday,
                "≤ 5%",
                statusFor(q.brBundlingToday, 5, "max"),
              ],
              [
                "F-REQ-107",
                "BR Bundling DDA",
                q.brBundlingYear,
                "≤ 5%",
                statusFor(q.brBundlingYear, 5, "max"),
              ],
            ].map((r, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 text-primary">{r[0]}</td>
                <td>{r[1]}</td>
                <td className="text-right tabular-nums">{(r[2] as number).toFixed(1)}%</td>
                <td className="text-right text-muted-foreground">{r[3] as string}</td>
                <td className="text-right">
                  <TrafficBadge status={r[4] as "green" | "orange" | "red"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
