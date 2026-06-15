export type BreakdownRow = Record<string, string | number | null>;

export interface BreakdownData {
    kpi_key: string;
    period: string;
    rows: BreakdownRow[];
    trend?: BreakdownRow[];
    synced_at: string;
}
