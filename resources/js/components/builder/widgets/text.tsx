import type { WidgetConfig } from "../types";
import { boxStyle } from "./shared";

export function TextWidget({ c }: { c: WidgetConfig }) {
  const style = boxStyle(c);
  return (
    <div
      className="h-full w-full flex items-center px-2"
      style={{ ...style, justifyContent: c.align === "center" ? "center" : c.align === "right" ? "flex-end" : "flex-start" }}
    >
      <span style={{ fontSize: c.fontSize ?? 16, fontWeight: c.fontWeight ?? 700, color: c.fg, fontFamily: c.fontFamily }}>
        {c.text ?? c.label ?? ""}
      </span>
    </div>
  );
}
