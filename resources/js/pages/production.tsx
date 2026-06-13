import { Head } from "@inertiajs/react";
import {
  Area,
  AreaChart,
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
  PieChart,
  Pie,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BigNumberCard, Gauge, Panel } from "@/components/widgets";
import { production, statusFor } from "@/lib/mock";

const tt = { backgroundColor: "var(--card)", border: "1px solid var(--border)", fontSize: 12 };

function ProductionTab({ workshop }: { workshop: "confection" | "coupe" | "serigraphie" }) {
  const p = production;
  const totalArrets = p.chains.reduce((s, c) => s + c.arrets, 0);
  const avgEff = p.chains.reduce((s, c) => s + c.eff, 0) / p.chains.length;
  const avgOwe = p.chains.reduce((s, c) => s + c.owe, 0) / p.chains.length;
  const totalWip = p.chains.reduce((s, c) => s + c.wip, 0);

  return (
    <>
      {/* Row 1 — Chain info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {p.chains.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold tracking-wider">{c.id}</div>
              <div className="text-[10px] font-mono uppercase text-primary">{c.of}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono uppercase">
              <KV label="Article" value={c.article} />
              <KV label="SAM" value={`${c.sam} min`} />
              <KV label="Effectif" value={String(c.effectif)} />
              <KV label="Objectif" value={`${c.objectif} pc`} />
              <KV label="Eff." value={`${c.eff.toFixed(0)}%`} />
              <KV label="WIP" value={String(c.wip)} />
            </div>
          </div>
        ))}
      </div>

      {/* Row 2 — KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <BigNumberCard
          label="Efficience Chaîne ·202"
          value={avgEff}
          target="> 85%"
          status={statusFor(avgEff, 85)}
          source="q/efficience_chaine"
        />
        <BigNumberCard
          label="OWE Chaîne ·204"
          value={avgOwe}
          target="> 70%"
          status={statusFor(avgOwe, 70)}
          source="q/minutes_*"
        />
        <BigNumberCard
          label="WIP Chaîne ·205"
          value={totalWip}
          unit="pc"
          target="≤ ½ cadence"
          status={totalWip < 1200 ? "green" : "orange"}
          source="q/wip_chaine"
        />
        <BigNumberCard
          label="Arrêts non planifiés ·207"
          value={totalArrets}
          unit="min"
          target="< 10 min"
          status={statusFor(totalArrets, 10, "max")}
          source="q/lost_time"
        />
      </div>

      {/* Row 3 — Gauges + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Panel title="Efficience par Chaîne · Gauges">
          <div className="flex justify-around items-end pt-2">
            {p.chains.map((c) => (
              <Gauge key={c.id} value={c.eff} label={c.id} />
            ))}
          </div>
        </Panel>

        <Panel title="Chronologie des arrêts (S1 + S2)">
          <div className="space-y-3 font-mono text-xs">
            {["CH1", "CH2", "CH3"].map((ch) => (
              <div key={ch} className="flex items-center gap-2">
                <div className="w-10 text-muted-foreground">{ch}</div>
                <div className="relative flex-1 h-6 rounded bg-secondary overflow-hidden">
                  {p.stoppages
                    .filter((s) => s.chaine === ch)
                    .map((s, i) => {
                      const left = ((s.start - 6) / 12) * 100;
                      const width = (s.duration / 12) * 100;
                      const color =
                        s.motif === "MAINT"
                          ? "var(--chart-4)"
                          : s.motif === "MATIERE"
                            ? "var(--warning)"
                            : "var(--destructive)";
                      return (
                        <div
                          key={i}
                          className="absolute top-0 h-full rounded text-[10px] flex items-center justify-center text-background font-bold"
                          style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}
                          title={`${s.motif} · ${s.duration}h`}
                        >
                          {s.motif}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
            <div className="flex justify-between text-[10px] text-muted-foreground pl-12">
              <span>06h</span>
              <span>09h</span>
              <span>12h</span>
              <span>15h</span>
              <span>18h</span>
            </div>
            <div className="flex gap-3 text-[10px] pt-2 border-t border-border">
              <Legend2 color="var(--chart-4)" label="Maintenance" />
              <Legend2 color="var(--warning)" label="Matière" />
              <Legend2 color="var(--destructive)" label="Qualité" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 4 — OF progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Panel title="Taux d'avancement OF ·305">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {p.ofProgress.map((o) => (
              <div key={o.of} className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={[{ v: o.pct }, { v: 100 - o.pct }]}
                      dataKey="v"
                      innerRadius={32}
                      outerRadius={48}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill={o.statut === "terminé" ? "var(--success)" : "var(--chart-4)"} />
                      <Cell fill="var(--muted)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-xs font-mono font-bold">{o.of}</div>
                <div className="text-[10px] text-muted-foreground">{o.pct}%</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="SO Progress par OF ·304">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={p.soByOf} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis
                dataKey="of"
                type="category"
                width={80}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="realise" name="Réalisé" stackId="a" fill="var(--chart-4)" />
              <Bar dataKey="restant" name="Restant" stackId="a" fill="var(--muted)" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Row 5 — Operators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Panel title="Top Opérateurs ·210">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={p.topOperators} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                unit="%"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                dataKey="nom"
                type="category"
                width={90}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip contentStyle={tt} />
              <ReferenceLine x={90} stroke="var(--success)" strokeDasharray="4 4" />
              <Bar dataKey="eff" fill="var(--primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Efficience par Opérateur ·201">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={p.effPerOp}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nom" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={tt} />
              <ReferenceLine y={420} stroke="var(--success)" strokeDasharray="4 4" />
              <Bar dataKey="minutes" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Row 6 / Sérigraphie special */}
      {workshop === "serigraphie" ? (
        <Panel title="Couverture Sérigraphie ·309" className="mb-4">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={p.serigraphie}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="article" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="entree" name="Entrée" fill="var(--chart-4)" />
              <Bar dataKey="sortie" name="Sortie" fill="var(--success)" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      ) : (
        <Panel title="WIP Optimal (7 derniers jours) ·206" className="mb-4">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={p.wip7d}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="sortie"
                name="Sortie coupe"
                stroke="var(--success)"
                fill="var(--success)"
                fillOpacity={0.25}
              />
              <Area
                type="monotone"
                dataKey="engagement"
                name="Engagement"
                stroke="var(--warning)"
                fill="var(--warning)"
                fillOpacity={0.25}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* Row 7 */}
      <Panel title="Efficience Cumulée ·203">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={production.effCumul}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="jour" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <YAxis
              domain={[60, 120]}
              unit="%"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Tooltip contentStyle={tt} />
            <ReferenceLine y={85} stroke="var(--success)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="eff"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground font-bold truncate">{value}</div>
    </div>
  );
}

function Legend2({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

export default function ProductionPage() {
  const exportRows = production.chains.map((c) => ({
    chaine: c.id,
    of: c.of,
    article: c.article,
    sam: c.sam,
    effectif: c.effectif,
    objectif: c.objectif,
    efficience_pct: c.eff,
    owe_pct: c.owe,
    wip: c.wip,
    arrets_min: c.arrets,
  }));
  return (
    <>
      <Head title="Production — BACOVET" />
      <AppShell
        page="/production"
        title="Production & Flux"
        subtitle="Série 200 · Performance Atelier"
        exportRows={exportRows}
        exportFilename="BACOVET_Production_S200"
      >
        <Tabs defaultValue="confection">
          <TabsList>
            <TabsTrigger value="confection" className="text-xs uppercase tracking-wider">
              Confection
            </TabsTrigger>
            <TabsTrigger value="coupe" className="text-xs uppercase tracking-wider">
              Coupe
            </TabsTrigger>
            <TabsTrigger value="serigraphie" className="text-xs uppercase tracking-wider">
              Sérigraphie
            </TabsTrigger>
          </TabsList>
          <TabsContent value="confection">
            <ProductionTab workshop="confection" />
          </TabsContent>
          <TabsContent value="coupe">
            <ProductionTab workshop="coupe" />
          </TabsContent>
          <TabsContent value="serigraphie">
            <ProductionTab workshop="serigraphie" />
          </TabsContent>
        </Tabs>
      </AppShell>
    </>
  );
}
