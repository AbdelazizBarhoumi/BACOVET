import type { WidgetConfig } from "../types";
import { boxStyle, wrap } from "./shared";

export function ImageWidget({ c }: { c: WidgetConfig }) {
  return wrap(c, boxStyle(c),
    c.imageUrl ? (
      <img src={c.imageUrl} alt={c.altText || c.label || "Image"} className="h-full w-full object-contain" />
    ) : (
      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
        Image — set a URL in the inspector
      </div>
    )
  );
}

export function ButtonWidget({ c }: { c: WidgetConfig }) {
  return wrap(c, boxStyle(c),
    <div className="h-full w-full flex items-center justify-center">
      <a
        href={c.linkUrl || undefined}
        target={c.linkUrl ? "_blank" : undefined}
        rel={c.linkUrl ? "noreferrer" : undefined}
        className="rounded px-4 py-2 text-[12px] font-medium text-brand-foreground"
        style={{ background: c.accent ?? "var(--brand)" }}
        onClick={(e) => { if (!c.linkUrl) e.preventDefault(); }}
      >
        {c.buttonText || c.label || "Button"}
      </a>
    </div>
  );
}
