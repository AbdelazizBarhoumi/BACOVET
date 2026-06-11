// Simple client-side audit log persisted to localStorage.
export type AuditLevel = "INFO" | "WARN" | "ERROR" | "USER" | "SYSTEM";
export type AuditEntry = { t: string; lvl: AuditLevel; msg: string };

const KEY = "bacovet-audit";
const MAX = 200;

export function getAudit(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushAudit(lvl: AuditLevel, msg: string) {
  if (typeof window === "undefined") return;
  const entries = getAudit();
  const t = new Date().toTimeString().slice(0, 8);
  const next = [{ t, lvl, msg }, ...entries].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("bacovet-audit"));
}

export function isAuditEnabled() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("bacovet-audit-enabled") !== "false";
}

export function setAuditEnabled(v: boolean) {
  localStorage.setItem("bacovet-audit-enabled", v ? "true" : "false");
}
