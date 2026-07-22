import type { WidgetConfig } from "../types";

export function DividerWidget({ c }: { c: WidgetConfig }) {
  return <div className="w-full" style={{ height: c.borderWidth ?? 2, background: c.bg ?? "var(--border)", opacity: c.opacity }} />;
}
