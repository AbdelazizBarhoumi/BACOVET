import type { Widget } from "@/components/builder/types";
import { confection as c } from "@/lib/mock-v1";
import { production as v0p } from "@/lib/mock";

const wid = (n: string) => `w_${n}`;

// V2 default layout — reproduces the v0 production dashboard essentials
export const V2_PRODUCTION_DEFAULT: Widget[] = [
  { id: wid("t1"), type: "text", x: 0, y: 0, w: 24, h: 1,
    config: { text: "PRODUCTION & FLUX — SÉRIE 200", fontSize: 20, fontWeight: 900, align: "left", showLabel: false } },

  { id: wid("k1"), type: "kpi", x: 0, y: 1, w: 6, h: 3,
    config: { kpiCode: "F-REQ-202", label: "Efficience chaîne", mockValue: 89.6, unit: "%", target: 85, decimals: 1, accent: "#22c55e", showTarget: true } },
  { id: wid("k2"), type: "kpi", x: 6, y: 1, w: 6, h: 3,
    config: { kpiCode: "F-REQ-204", label: "OWE chaîne", mockValue: 72.4, unit: "%", target: 70, decimals: 1, accent: "#3b82f6", showTarget: true } },
  { id: wid("k3"), type: "kpi", x: 12, y: 1, w: 6, h: 3,
    config: { kpiCode: "F-REQ-205", label: "WIP chaîne", mockValue: 42, unit: "pc", target: 60, decimals: 0, accent: "#ec4899", showTarget: true } },
  { id: wid("k4"), type: "kpi", x: 18, y: 1, w: 6, h: 3,
    config: { kpiCode: "F-REQ-207", label: "Arrêts non planifiés", mockValue: 12, unit: "min", target: 10, decimals: 0, accent: "#ef4444", showTarget: true } },

  { id: wid("g1"), type: "gauge", x: 0, y: 4, w: 6, h: 5,
    config: { label: "Efficience CH1", mockValue: v0p.chains[0]?.eff ?? 88, target: 85, accent: "#22c55e" } },
  { id: wid("g2"), type: "gauge", x: 6, y: 4, w: 6, h: 5,
    config: { label: "Efficience CH2", mockValue: v0p.chains[1]?.eff ?? 91, target: 85, accent: "#3b82f6" } },
  { id: wid("g3"), type: "gauge", x: 12, y: 4, w: 6, h: 5,
    config: { label: "Efficience CH3", mockValue: v0p.chains[2]?.eff ?? 84, target: 85, accent: "#f59e0b" } },
  { id: wid("d1"), type: "donut", x: 18, y: 4, w: 6, h: 5,
    config: { label: "Avancement OF moyen", mockValue: 76, accent: "#a855f7" } },

  { id: wid("l1"), type: "line", x: 0, y: 9, w: 12, h: 5,
    config: { label: "Efficience cumulée (7j)",
      mockSeries: v0p.effCumul.map((d: any) => ({ x: d.jour, v: d.eff })),
      accent: "#3b82f6", target: 85, showTarget: true } },
  { id: wid("b1"), type: "bar", x: 12, y: 9, w: 12, h: 5,
    config: { label: "Top opérateurs (efficience %)",
      mockSeries: v0p.topOperators.map((o: any) => ({ x: o.nom, v: o.eff })),
      accent: "#22c55e", target: 90, showTarget: true } },
];

// V3 default layout — reproduces the v1 production-confection page
export const V3_CONFECTION_DEFAULT: Widget[] = [
  { id: wid("h"), type: "text", x: 0, y: 0, w: 24, h: 1,
    config: { text: "TABLEAU DE BORD PRODUCTION – CONFECTION", fontSize: 20, fontWeight: 900, align: "left", showLabel: false } },
  { id: wid("h2"), type: "text", x: 0, y: 1, w: 24, h: 1,
    config: { text: `OF ${c.of} · ${c.designation}`, fontSize: 12, fontWeight: 600, align: "left", fg: "#1e90d8", showLabel: false } },

  { id: wid("k1"), type: "kpi", x: 0, y: 2, w: 4, h: 3,
    config: { label: "Efficience J-1", mockValue: c.efficienceJ1, unit: "%", decimals: 1, target: 90, accent: "#3b82f6", showTarget: true } },
  { id: wid("k2"), type: "kpi", x: 4, y: 2, w: 4, h: 3,
    config: { label: "Progression OF", mockValue: c.ofProgressPct, unit: "%", decimals: 0, target: 100, accent: "#22c55e", showTarget: true } },
  { id: wid("k3"), type: "kpi", x: 8, y: 2, w: 4, h: 3,
    config: { label: "GAP SAM/SOT", mockValue: c.gapSamSot, unit: "%", decimals: 1, target: 90, accent: "#f59e0b", showTarget: true } },
  { id: wid("k4"), type: "kpi", x: 12, y: 2, w: 4, h: 3,
    config: { label: "Effectif", mockValue: c.effectif, unit: "op", decimals: 2, accent: "#3b82f6", showTarget: false } },
  { id: wid("k5"), type: "kpi", x: 16, y: 2, w: 4, h: 3,
    config: { label: "SOT", mockValue: c.sot, unit: "min", decimals: 0, accent: "#a855f7", showTarget: false } },
  { id: wid("k6"), type: "kpi", x: 20, y: 2, w: 4, h: 3,
    config: { label: "SAM", mockValue: c.sam, unit: "min", decimals: 0, accent: "#ec4899", showTarget: false } },

  { id: wid("l"), type: "line", x: 0, y: 5, w: 12, h: 5,
    config: { label: "Efficience horaire (%)", mockSeries: c.efficienceSerie.map((d) => ({ x: d.x, v: d.v })),
      accent: "#3b82f6", target: 90, showTarget: true } },
  { id: wid("d"), type: "donut", x: 12, y: 5, w: 6, h: 5,
    config: { label: "Progression de la commande", mockValue: c.progressionRealise, accent: "#ec4899", subtitle: "Complétée" } },
  { id: wid("g"), type: "gauge", x: 18, y: 5, w: 6, h: 5,
    config: { label: "OWE", mockValue: 72, target: 70, accent: "#22c55e" } },

  { id: wid("b1"), type: "bar", x: 0, y: 10, w: 12, h: 5,
    config: { label: "QTE réelle par heure",
      mockSeries: c.hourlySchedule.map((h) => ({ x: h.plage, v: h.reel })),
      accent: "#3b82f6" } },
  { id: wid("b2"), type: "bar", x: 12, y: 10, w: 12, h: 5,
    config: { label: "Efficience horaire (%)",
      mockSeries: c.hourlySchedule.map((h) => ({ x: h.plage, v: h.eff })),
      accent: "#ec4899", target: 100, showTarget: true } },

  { id: wid("t"), type: "table", x: 0, y: 15, w: 12, h: 5,
    config: { label: "Plage horaire — QTE réelle",
      mockSeries: c.hourlySchedule.map((h) => ({ x: h.plage, v: h.reel })) } },
];

