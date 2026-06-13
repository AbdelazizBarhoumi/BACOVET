import { Head } from "@inertiajs/react";
import { AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { BigNumberCard, Gauge, Panel, TrafficBadge } from "@/components/widgets";
import { logistics, statusFor } from "@/lib/mock";

const tt = { backgroundColor: "var(--card)", border: "1px solid var(--border)", fontSize: 12 };
const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--success)",
  "var(--warning)",
  "var(--muted-foreground)",
];

export default function LogisticsPage() {
  const l = logistics;
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      l.stock.filter((s) =>
        [s.code, s.des, s.famille, s.couleur].join(" ").toLowerCase().includes(q.toLowerCase()),
      ),
    [q, l.stock],
  );
  const exportRows = l.stock.map((s) => ({
    code: s.code,
    designation: s.des,
    famille: s.famille,
    couleur: s.couleur,
    qte: s.qte,
    reserve: s.res,
  }));

  return (
    <>
      <Head title="Logistique & Planning — BACOVET" />
      <AppShell
        page="/logistics"
        title="Logistique & Planning"
        subtitle="Série 300 · Supply Chain"
        exportRows={exportRows}
        exportFilename="BACOVET_Stock_S300"
      >
        {/* A — Delivery */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <BigNumberCard
            label="DOT ·334"
            value={l.dot}
            target="≥ 95%"
            status={statusFor(l.dot, 95)}
            source="GPRO Planning"
          />
          <BigNumberCard
            label="HOT ·335"
            value={l.hot}
            target="≥ 95%"
            status={statusFor(l.hot, 95)}
            source="GPRO Planning"
          />
          <BigNumberCard
            label="Respect Planification ·336"
            value={l.respectPlan}
            target="≥ 95%"
            status={statusFor(l.respectPlan, 95)}
            source="q/qte_produite"
          />
          <BigNumberCard
            label="Lead Time Global ·337"
            value={l.leadTime}
            unit="j"
            target="32 j"
            status="green"
            source="STRH + LT Transport"
          />
        </div>

        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 mb-4 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-primary" />
          <div className="text-xs font-mono uppercase tracking-wider">
            <span className="text-primary font-bold">Alerte prochain export :</span> {l.nextExport}
          </div>
        </div>

        {/* B — Stock KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          <Panel title="Taux de Rotation Stock ·316/317/318">
            <div className="flex justify-around items-end pt-2">
              <Gauge value={l.rotation.accessoires * 10} label="Accessoires" />
              <Gauge value={l.rotation.tissu * 10} label="Tissu" />
              <Gauge value={l.rotation.fg * 10} label="FG" />
            </div>
          </Panel>
          <Panel title="Taux de Stock Mort ·319/320/321">
            <div className="grid grid-cols-3 gap-2 pt-2">
              {(["accessoires", "tissu", "fg"] as const).map((k) => (
                <div
                  key={k}
                  className="rounded-md border border-border bg-secondary/40 p-3 text-center"
                >
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">{k}</div>
                  <div className="text-2xl font-mono font-bold tabular-nums">
                    {l.stockMort[k].toFixed(1)}%
                  </div>
                  <TrafficBadge status={statusFor(l.stockMort[k], 5, "max")} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Taux d'Occupation ·322/323/324">
            <div className="flex justify-around items-end pt-2">
              <Gauge value={l.occupation.accessoires} label="Accessoires" />
              <Gauge value={l.occupation.tissu} label="Tissu" />
              <Gauge value={l.occupation.fg} label="FG" />
            </div>
          </Panel>
        </div>

        {/* C — Pies */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          {[
            { title: "Stock par Provenance ·332", data: l.provenance },
            { title: "Stock par Marque ·333", data: l.brand },
            { title: "Stock par Typologie ·331", data: l.typologie },
          ].map((p) => (
            <Panel key={p.title} title={p.title}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={p.data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {p.data.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tt} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          ))}
        </div>

        {/* D — OF & delivery */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <Panel title="Commandes Livrées à Temps ·325/326/327">
            <div className="grid grid-cols-3 gap-2">
              {(["accessoires", "tissu", "fg"] as const).map((k) => (
                <div
                  key={k}
                  className="rounded-md border border-border bg-secondary/40 p-3 text-center"
                >
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">{k}</div>
                  <div className="text-2xl font-mono font-bold tabular-nums">{l.livrees[k]}%</div>
                  <TrafficBadge status={statusFor(l.livrees[k], 80)} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Délai de Livraison Moyen ·328/329/330">
            <div className="grid grid-cols-3 gap-2">
              {(["accessoires", "tissu", "fg"] as const).map((k) => (
                <div
                  key={k}
                  className="rounded-md border border-border bg-secondary/40 p-3 text-center"
                >
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">{k}</div>
                  <div className="text-2xl font-mono font-bold tabular-nums">
                    {l.delai[k].toFixed(1)} j
                  </div>
                  <TrafficBadge status={statusFor(l.delai[k], 1, "max")} />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* E — OF list */}
        <Panel title="OF en Cours" className="mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono border-b border-border">
                <th className="text-left py-2">OF</th>
                <th className="text-left">Avancement</th>
                <th className="text-right">Qté prévue</th>
                <th className="text-right">Qté réalisée</th>
                <th className="text-right">Engagement</th>
                <th className="text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {l.ofList.map((o) => (
                <tr key={o.of} className="border-b border-border/50">
                  <td className="py-2 text-primary">{o.of}</td>
                  <td className="w-1/3 pr-4">
                    <div className="flex items-center gap-2">
                      <Progress value={o.avancement} className="h-1.5" />
                      <span className="text-xs tabular-nums">{o.avancement}%</span>
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{o.prevue}</td>
                  <td className="text-right tabular-nums">{o.realisee}</td>
                  <td className="text-right tabular-nums">{o.engagement}</td>
                  <td className="text-right">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${o.statut === "terminé" ? "bg-success/15 text-success" : "bg-chart-4/20 text-foreground"}`}
                    >
                      {o.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* F — Couverture */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          {[
            { title: "Couverture Chaîne ·310", data: l.couverture.chaine, target: 10 },
            { title: "Couverture Coupe ·311", data: l.couverture.coupe, target: 7 },
            { title: "Couverture Sérigraphie ·309", data: l.couverture.seri, target: 5 },
          ].map((c) => (
            <Panel key={c.title} title={c.title}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={c.data}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis unit="j" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip contentStyle={tt} />
                  <Bar dataKey="jours" radius={[4, 4, 0, 0]}>
                    {c.data.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.jours >= c.target ? "var(--success)" : "var(--destructive)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          ))}
        </div>

        {/* G — Stock table */}
        <Panel
          title="Stock Matières Premières"
          right={
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher code, désignation…"
              className="h-7 w-64 text-xs bg-secondary border-border"
            />
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono border-b border-border">
                <th className="text-left py-2">Code MP</th>
                <th className="text-left">Désignation</th>
                <th className="text-left">Famille</th>
                <th className="text-left">Couleur</th>
                <th className="text-right">Qté stock</th>
                <th className="text-right">Qté réservée</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {filtered.map((s) => (
                <tr key={s.code} className="border-b border-border/50">
                  <td className="py-2 text-primary">{s.code}</td>
                  <td>{s.des}</td>
                  <td className="text-muted-foreground">{s.famille}</td>
                  <td className="text-muted-foreground">{s.couleur}</td>
                  <td className="text-right tabular-nums">{s.qte.toLocaleString("fr-FR")}</td>
                  <td className="text-right tabular-nums">{s.res.toLocaleString("fr-FR")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">
                    Aucun résultat
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </AppShell>
    </>
  );
}
