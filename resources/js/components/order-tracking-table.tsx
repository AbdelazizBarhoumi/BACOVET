import { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type OrderStage = { label: string; pct: number };
export type OrderTracking = {
  orderId: string;
  designation: string;
  priorEff: number;
  priorOwe: number;
  stages: OrderStage[];
  overallPct: number;
  actual: number;
  planned: number;
  qtyOrdered: number;
  qtySC1: number;
  qtySAM: number;
  bpd: string;
  epd: string;
  ehd: string;
  gtd: string;
  amObjective: number;
  soObjective: number;
  gapSamSo: number;
  dailyTarget: number;
  qteDemandee: number;
  qteRealiseeHeure: number;
  cumulEff: number;
  cumulQty: number;
  cumulRestant: number;
};
const cellBase = "border border-border px-2 py-1.5 text-[11px] font-mono align-middle";
const headBase = `${cellBase} bg-secondary uppercase tracking-wider text-muted-foreground text-[10px] font-bold`;
function statusColor(pct: number) {
  if (pct >= 95) return "bg-success/30 text-success-foreground";
  if (pct >= 70) return "bg-warning/30 text-warning-foreground";
  return "bg-destructive/30 text-destructive-foreground";
}

function OrderTrackingRow({ order }: { order: OrderTracking }) {
  const variance = order.actual - order.planned;
  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto mb-4">
      <table className="w-full border-collapse min-w-[1100px]">
        <thead>
          <tr>
            <th className={headBase}>CC</th>
            <th className={headBase}>Désignation</th>
            <th className={headBase}>Efficience J-1</th>
            <th className={headBase}>OWE J-1</th>
            <th className={headBase}>N° cmde</th>
            <th className={headBase} colSpan={3}>Progression de la commande</th>
            <th className={headBase}>%</th>
            <th className={headBase}>Qté cmde</th>
            <th className={headBase}>Début/fin</th>
            <th className={headBase}>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${cellBase} font-bold text-center`} rowSpan={2}>{order.orderId}</td>
            <td className={`${cellBase} text-center`} rowSpan={2}>{order.designation}</td>
            <td className={`${cellBase} text-center ${statusColor(order.priorEff)}`} rowSpan={2}>
              {order.priorEff.toFixed(1)}%
            </td>
            <td className={`${cellBase} text-center ${statusColor(order.priorOwe)}`} rowSpan={2}>
              {order.priorOwe.toFixed(1)}%
            </td>
            <td className={`${cellBase} text-center font-bold`}>{order.stages[0]?.label ?? "CIP"}</td>
            <td className={`${cellBase} p-0`} colSpan={3}>
              <div className="relative h-6 w-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 bg-success"
                  style={{ width: `${order.stages[0]?.pct ?? 100}%` }}
                />
                <div className="relative z-10 flex items-center justify-center h-full text-[10px] font-bold">
                  {(order.stages[0]?.pct ?? 100).toFixed(0)}%
                </div>
              </div>
            </td>
            <td className={`${cellBase} text-center font-bold text-success`}>
              {order.overallPct.toFixed(2)}
            </td>
            <td className={`${cellBase} text-center font-bold`}>{order.qtyOrdered.toLocaleString()}</td>
            <td className={`${cellBase} text-center font-bold bg-info/20`}>BPD :</td>
            <td className={`${cellBase} text-center font-bold bg-info/10`}>{order.bpd}</td>
          </tr>
          <tr>
            <td className={`${cellBase} text-center font-bold`}>{order.stages[1]?.label ?? "MP-1"}</td>
            <td className={`${cellBase} p-0`} colSpan={2}>
              <div className="flex h-6 w-full">
                {order.stages.slice(1).map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-center text-[10px] font-bold border-r border-border last:border-r-0`}
                    style={{
                      width: `${s.pct}%`,
                      backgroundColor: i === 0 ? "var(--success)" : i === 1 ? "hsl(320 80% 60%)" : "var(--warning)",
                      color: "var(--background)",
                    }}
                    title={`${s.label}: ${s.pct}%`}
                  >
                    {s.pct}%
                  </div>
                ))}
              </div>
            </td>
            <td className={`${cellBase} text-center`}>
              <div className="text-[9px] text-muted-foreground">Effectif</div>
              <div className="font-bold">{order.actual} / {order.planned}</div>
              <div className={variance >= 0 ? "text-success text-[9px]" : "text-destructive text-[9px]"}>
                {variance >= 0 ? "+" : ""}{variance}
              </div>
            </td>
            <td className={`${cellBase} text-center`}>
              <div className="text-[9px] text-muted-foreground">SC1</div>
              <div className="font-bold">{order.qtySC1.toLocaleString()}</div>
            </td>
            <td className={`${cellBase} text-center`}>{order.qtyOrdered.toLocaleString()}</td>
            <td className={`${cellBase} text-center font-bold bg-warning/30`}>EPD :</td>
            <td className={`${cellBase} text-center font-bold bg-warning/20`}>{order.epd}</td>
          </tr>
          <tr>
            <td className={`${cellBase} text-center font-bold bg-destructive/30`}>GTD</td>
            <td className={`${cellBase} text-center`}>{order.gtd}</td>
            <td className={`${cellBase} text-center font-bold bg-warning/40`} colSpan={2}>
              <div className="text-[9px]">GAP SAM/SO</div>
              <div className="text-base font-bold">{order.gapSamSo.toFixed(2)}%</div>
            </td>
            <td className={`${cellBase}`} colSpan={4} />
            <td className={`${cellBase} text-center font-bold`}>SAM</td>
            <td className={`${cellBase} text-center font-bold`}>{order.qtySAM.toLocaleString()}</td>
            <td className={`${cellBase} text-center font-bold`}>Objectif</td>
            <td className={`${cellBase} text-center font-bold`}>{order.dailyTarget} pièces / jour</td>
          </tr>
          <tr>
            <td className={`${cellBase} text-center font-bold bg-secondary text-[9px]`}>OBJECTIF/S AM</td>
            <td className={`${cellBase} text-center`}>{order.amObjective}</td>
            <td className={`${cellBase} text-center`} colSpan={2}>—</td>
            <td className={`${cellBase}`} colSpan={4} />
            <td className={`${cellBase} text-center`} colSpan={2} />
            <td className={`${cellBase} text-center`} />
            <td className={`${cellBase} text-center`} />
          </tr>
          <tr>
            <td className={`${cellBase} text-center font-bold bg-secondary text-[9px]`}>OBJECTIF/S OI</td>
            <td className={`${cellBase} text-center`}>{order.soObjective}</td>
            <td className={`${cellBase} text-center`}>QTE demandée</td>
            <td className={`${cellBase} text-center`}>QTE réelle / h</td>
            <td className={`${cellBase} text-center text-muted-foreground italic text-[10px]`} colSpan={4}>
              affich qte real/qte dem
            </td>
            <td className={`${cellBase} text-center`}>{order.qteDemandee}</td>
            <td className={`${cellBase} text-center`}>{order.qteRealiseeHeure}</td>
            <td className={`${cellBase} text-center font-bold bg-success/40`}>EHD :</td>
            <td className={`${cellBase} text-center font-bold bg-success/30`}>{order.ehd}</td>
          </tr>
          <tr>
            <td className={`${cellBase} text-center font-bold bg-primary/20 uppercase text-[10px]`} colSpan={2}>
              Cumul global
            </td>
            <td className={`${cellBase} text-center bg-primary/10`}>
              <div className="text-[9px] text-muted-foreground">Eff. cumulée</div>
              <div className="font-bold">{order.cumulEff.toFixed(1)}%</div>
            </td>
            <td className={`${cellBase} text-center bg-primary/10`} colSpan={4}>
              <div className="text-[9px] text-muted-foreground">Qté produite cumulée</div>
              <div className="font-bold">{order.cumulQty.toLocaleString()} pc</div>
            </td>
            <td className={`${cellBase} text-center bg-primary/10`} colSpan={3}>
              <div className="text-[9px] text-muted-foreground">Reste à produire</div>
              <div className="font-bold">{order.cumulRestant.toLocaleString()} pc</div>
            </td>
            <td className={`${cellBase} text-center bg-primary/10`} colSpan={2}>
              <div className="text-[9px] text-muted-foreground">Avancement / Cible</div>
              <div className="font-bold">
                {order.qtyOrdered > 0 ? ((order.cumulQty / order.qtyOrdered) * 100).toFixed(1) : '0'}%
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function OrderTrackingTable({ orders, isLoading }: { orders: OrderTracking[]; isLoading?: boolean }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 mb-4 animate-pulse">
        <div className="h-6 w-48 rounded bg-muted mb-3" />
        <div className="h-20 w-full rounded bg-muted" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <div className="text-xs text-muted-foreground text-center py-4">
          Aucune commande en cours
        </div>
      </div>
    );
  }

  const selected = orders[selectedIdx] ?? orders[0];

  return (
    <div className="mb-4">
      {orders.length > 1 && (
        <div className="mb-2 flex items-center gap-3">
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Commande :
          </span>
          <Select
            value={String(selectedIdx)}
            onValueChange={(v) => setSelectedIdx(Number(v))}
          >
            <SelectTrigger className="h-8 w-[300px] border-border bg-secondary font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {orders.map((o, i) => (
                <SelectItem key={o.orderId} value={String(i)} className="font-mono text-xs">
                  {o.orderId} — {o.designation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <OrderTrackingRow order={selected} />
    </div>
  );
}
