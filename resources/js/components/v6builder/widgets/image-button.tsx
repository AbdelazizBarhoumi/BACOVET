import type { WidgetConfig } from "../types";
import { boxStyle, wrap } from "./shared";

export function ImageWidget({ c }: { c: WidgetConfig }) {
  return wrap(c, boxStyle(c),
    c.imageUrl ? (
      <div className="h-full w-full overflow-hidden group">
        <img
          src={c.imageUrl}
          alt={c.altText || c.label || "Image"}
          className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      </div>
    ) : (
      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-md m-1">
        Image — set a URL in the inspector
      </div>
    )
  );
}

export function ButtonWidget({ c }: { c: WidgetConfig }) {
  const accent = c.accent ?? "var(--brand)";
  return wrap(c, boxStyle(c),
    <div className="h-full w-full flex items-center justify-center">
      <a
        href={c.linkUrl || undefined}
        target={c.linkUrl ? "_blank" : undefined}
        rel={c.linkUrl ? "noreferrer" : undefined}
        className="rounded-lg px-4 py-2 text-[12px] font-semibold text-brand-foreground shadow-sm transition-all duration-150 hover:shadow-md hover:brightness-105 active:scale-[0.97]"
        style={{ background: accent }}
        onClick={(e) => { if (!c.linkUrl) e.preventDefault(); }}
      >
        {c.buttonText || c.label || "Button"}
      </a>
    </div>
  );
}