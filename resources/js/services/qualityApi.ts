/**
 * BACOVET Quality API Service
 *
 * Calls Laravel backend endpoints for quality dashboard data.
 * Frontend NEVER calls Novacity directly.
 */

function getXsrfToken(): string {
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("XSRF-TOKEN="))
      ?.split("=")[1] ?? "",
  );
}

async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`/quality${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== "") url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": getXsrfToken(),
    },
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Non authentifié");
  }
  if (res.status === 403) {
    window.location.href = "/unauthorized";
    throw new Error("Accès refusé");
  }
  if (!res.ok) {
    throw new Error(`Erreur API ${res.status}: ${path}`);
  }

  return res.json();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type KpiStatus = "green" | "orange" | "red" | "grey" | "pending" | "inactive";

export type KpiCard = {
  value: number | null;
  status: KpiStatus;
  blocker?: string | null;
  raw?: Record<string, unknown>;
  source?: string;
};

export type QualityKpis = {
  br_cgl: KpiCard;
  br_gtd_jour: KpiCard;
  rft_jour: KpiCard;
  br_bundling_jour: KpiCard;
  br_gtd_annee: KpiCard;
  rft_annee: KpiCard;
  br_bundling_annee: KpiCard;
  br_print: KpiCard;
  br_print_dda: KpiCard;
  br_care_label_jour: KpiCard;
  br_care_label_dda: KpiCard;
  br_accessoires_jour: KpiCard;
  br_accessoires_dda: KpiCard;
  br_compo_jour: KpiCard;
  br_compo_dda: KpiCard;
  synced_at: string | null;
};

export type BrChartItem = {
  stage: string;
  defect_pct: number | null;
  status: KpiStatus;
  blocker?: string | null;
  source?: string;
};

export type BrChartResponse = {
  data: BrChartItem[];
  target: number;
};

export type DefectChartItem = {
  op_no: string;
  total_qty: number;
};

export type QpTeam = {
  rank?: number;
  chain: string;
  score: number;
  max_score: number;
  rft_ok: boolean;
  rft_pct: number;
  br_in_ok: boolean | null;
  br_gtd_ok: boolean | null;
  br_ok: boolean | null;
  defect_pct: number;
  partial_score: boolean;
};

export type QpTeamsResponse = {
  best: QpTeam[];
  worst: QpTeam[];
  is_partial: boolean;
  missing_blockers: string[];
};

export type Alert = {
  type: string;
  level: "green" | "orange" | "red";
  message: string;
};

export type AnnualTrendItem = {
  month: string;
  rft: number | null;
  br_gtd: number | null;
};

export type ParetoItem = {
  label: string;
  value: number;
  cumulative: number;
};

// ─── API Functions ──────────────────────────────────────────────────────────

export const fetchQualityKpis = (filters?: Record<string, string>) =>
  apiGet<QualityKpis>("/kpis", filters);

export const fetchQualityBrChart = (filters?: Record<string, string>) =>
  apiGet<BrChartResponse>("/br-chart", filters);

export const fetchQualityDefectChart = (filters?: Record<string, string>) =>
  apiGet<{ data: DefectChartItem[] }>("/defect-chart", filters);

export const fetchQualityQpTeams = (filters?: Record<string, string>) =>
  apiGet<QpTeamsResponse>("/qp-teams", filters);

export const fetchQualityAlerts = () => apiGet<{ alerts: Alert[] }>("/alerts");

export const fetchQualityAnnualTrend = () =>
  apiGet<{ data: AnnualTrendItem[] }>("/annual-trend");

export const fetchQualityParetoRft = (filters?: Record<string, string>) =>
  apiGet<{ data: ParetoItem[] }>("/pareto/rft", filters);

export const fetchQualityParetoInspection = (filters?: Record<string, string>) =>
  apiGet<{ data: ParetoItem[] }>("/pareto/inspection", filters);
