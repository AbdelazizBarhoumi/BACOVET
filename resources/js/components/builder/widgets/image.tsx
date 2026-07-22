import type { WidgetConfig } from "../types";
import { SHADOW } from "./shared";

export function ImageWidget({ c }: { c: WidgetConfig }) {
  return (
    <div
      className="h-full w-full bg-card overflow-hidden"
      style={{
        borderRadius: c.radius,
        opacity: c.opacity,
        boxShadow: c.shadow && c.shadow !== "none" ? SHADOW[c.shadow] : undefined,
        borderColor: c.borderColor,
        borderWidth: c.borderWidth,
        borderStyle: c.borderStyle || (c.borderWidth ? "solid" : undefined),
      }}
    >
      {c.imageUrl ? (
        <img src={c.imageUrl} alt={c.label ?? ""} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">Image (URL vide)</div>
      )}
    </div>
  );
}
