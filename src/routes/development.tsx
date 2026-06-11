import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { BigNumberCard, Panel, TrafficBadge } from "@/components/widgets";
import { development, statusFor } from "@/lib/mock";

export const Route = createFileRoute("/development")({
  head: () => ({ meta: [{ title: "Développement — BACOVET" }] }),
  component: DevPage,
});

const tt = { backgroundColor: "var(--card)", border: "1px solid var(--border)", fontSize: 12 };

function DevPage() {
  const d = development;
  const exportRows = [
    { kpi: "F-REQ-350 RFT Dev", valeur: d.rft, cible: "≥95%" },
    { kpi: "F-REQ-351 Lead Time Dev", valeur: d.livraison, cible: "≥95%" },
    { kpi: "F-REQ-352 Fiabilité Nomenclature", valeur: d.fiabilite, cible: "≥98%" },
    { kpi: "F-REQ-353 Réclamations Prod", valeur: d.reclamations, cible: "<2%" },
    { kpi: "F-REQ-354 Déchiffrage Cotation", valeur: d.decifrage, cible: "—" },
    { kpi: "F-REQ-355 Étalonnage", valeur: d.etalonnage, cible: "100%" },
  ];
  return (
    <AppShell page="/development" title="Développement & Amélioration" subtitle="Série 350 · KPIs mensuels prototype"
      exportRows={exportRows} exportFilename="BACOVET_Dev_S350">

      <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 mb-4 text-xs font-mono">
        <span className="uppercase tracking-wider text-warning font-bold">Source manuelle :</span>{" "}
        <span className="text-foreground/90">
          KPIs Série 350 alimentés via Google Sheets (Drive). Connecteur Google Sheets à activer côté Lovable Cloud pour synchronisation automatique.
        </span>
      </div>

      {/* Row 1 */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <BigNumberCard label="RFT Dev · F-REQ-350" value={d.rft} target="≥ 95%" status={statusFor(d.rft, 95)} source="Google Drive" trend="up" freq="Freq: Mensuel" />
        <BigNumberCard label="Respect Livraison · F-REQ-351" value={d.livraison} target="≥ 95%" status={statusFor(d.livraison, 95)} source="Google Drive" trend="down" freq="Freq: Mensuel" />
        <BigNumberCard label="Fiabilité Nomenclature · F-REQ-352" value={d.fiabilite} target="≥ 98%" status={statusFor(d.fiabilite, 98)} source="Google Drive" trend="up" freq="Freq: Mensuel" />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <BigNumberCard label="Réclamations Prod · F-REQ-353" value={d.reclamations} target="< 2%" status={statusFor(d.reclamations, 2, "max")} source="Google Drive" freq="Freq: Mensuel" />
        <BigNumberCard label="Déchiffrage Cotation · F-REQ-354" value={d.decifrage} target="—" source="Excel / Cotation" freq="Freq: Per new start" />
        <BigNumberCard label="Étalonnage · F-REQ-355" value={d.etalonnage} target="100%" status="green" source="Internal" freq="Freq: Trimestriel" />
      </div>

      {/* Detail table + trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title="Détails des Indicateurs Mensuels (Série 350)" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono border-b border-border">
                <th className="text-left py-2">ID</th><th className="text-left">Indicateur</th>
                <th className="text-right">Valeur</th><th className="text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {[
                ["F-REQ-350", "Right First Time", d.rft, statusFor(d.rft, 95)],
                ["F-REQ-351", "Lead Time (Dev)", d.livraison, statusFor(d.livraison, 95)],
                ["F-REQ-352", "Fiabilité Nomenclature", d.fiabilite, statusFor(d.fiabilite, 98)],
                ["F-REQ-353", "Réclamations Prod", d.reclamations, statusFor(d.reclamations, 2, "max")],
                ["F-REQ-354", "Déchiffrage Cotation", d.decifrage, statusFor(d.decifrage, 80)],
              ].map((r, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 text-primary">{r[0]}</td>
                  <td>{r[1]}</td>
                  <td className="text-right tabular-nums">{(r[2] as number).toFixed(1)}%</td>
                  <td className="text-right"><TrafficBadge status={r[3] as "green" | "orange" | "red"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Fiabilité Nomenclature · Tendance">
          <div className="text-center mb-2">
            <div className="text-4xl font-mono font-bold tabular-nums">{d.fiabilite.toFixed(1)}%</div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Cible: 98%</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={d.fiabiliteTrend}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mois" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <YAxis domain={[92, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <ReferenceLine y={98} stroke="var(--success)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="valeur" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </AppShell>
  );
}
