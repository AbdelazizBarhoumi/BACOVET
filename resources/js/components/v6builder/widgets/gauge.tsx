import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, useWidgetData } from "./shared";

// ---- color helpers -------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

function lighten(hex: string, amt: number): string {
  return mix(hex, "#ffffff", amt);
}

// Continuous red → amber → green scale driven purely by position in [min, max].
const SCALE_RED = "#ef4444";
const SCALE_AMBER = "#f59e0b";
const SCALE_GREEN = "#22c55e";

function colorAt(t: number): string {
  const tt = Math.min(1, Math.max(0, t));
  return tt <= 0.5 ? mix(SCALE_RED, SCALE_AMBER, tt / 0.5) : mix(SCALE_AMBER, SCALE_GREEN, (tt - 0.5) / 0.5);
}

function buildTrackStops(steps = 24): [number, string][] {
  const stops: [number, string][] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    stops.push([(i + 1) / steps, lighten(colorAt(t), 0.72)]);
  }
  return stops;
}

// ---------------------------------------------------------------------------

export function GaugeWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { scalar: value, hasScalar: hasData } = useWidgetData(c, id);
  const min = c.gaugeMin ?? 0;
  const max = c.gaugeMax ?? (c.target ? c.target * 1.2 : 100);
  const startAngle = c.gaugeStartAngle ?? 210;
  const endAngle = c.gaugeEndAngle ?? -30;

  const hasMapping = Boolean(c.datasetSlug && c.dataValue);
  const [showPercent, setShowPercent] = useState(false);

  const t = hasData ? (value - min) / (max - min || 1) : 0;
  const valueColor = colorAt(t);
  const gradFrom = colorAt(Math.max(0, t - 0.001));
  const trackStops = useMemo(() => buildTrackStops(), []);

  const option = useMemo(() => ({
    series: [{
      type: "gauge",
      startAngle,
      endAngle,
      min,
      max,
      splitNumber: 5,
      radius: "88%",
      center: ["50%", "56%"],
      itemStyle: {
        color: {
          type: "linear",
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: colorAt(0) },
            { offset: 1, color: gradFrom },
          ],
        },
        shadowColor: `${valueColor}66`,
        shadowBlur: 10,
      },
      progress: { show: true, width: 22, roundCap: true },
      pointer: { show: false },
      axisLine: {
        roundCap: true,
        lineStyle: { width: 22, color: trackStops },
      },
      axisTick: { distance: -34, length: 4, lineStyle: { width: 1, color: "#cbd5e1" } },
      splitLine: { distance: -38, length: 10, lineStyle: { width: 2, color: "#94a3b8" } },
      axisLabel: { distance: -46, fontSize: 10, color: "#94a3b8", fontWeight: 500 },
      anchor: { show: false },
      title: { show: false },
      detail: { show: false },
      data: [{ value }],
    }],
  }), [value, min, max, startAngle, endAngle, gradFrom, valueColor, trackStops]);

  const decimals = c.decimals ?? 1;
  const displayValue = !hasMapping
    ? "Glissez\nune colonne"
    : !hasData
    ? "—"
    : showPercent
    ? `${Math.round(t * 100)}%`
    : `${value.toFixed(decimals).replace(".", ",")}${c.unit ?? ""}`;

  const interactive = hasMapping && hasData;

  const content = (
    <div className="relative w-full h-full flex flex-col">
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />

      <div
        className="absolute left-1/2 flex flex-col items-center select-none"
        style={{ top: "56%", transform: "translate(-50%, -50%)" }}
      >
        <span
          onClick={interactive ? () => setShowPercent((s) => !s) : undefined}
          title={interactive ? `${value.toFixed(Math.max(decimals, 2)).replace(".", ",")}${c.unit ?? ""} — cliquer pour ${showPercent ? "voir la valeur" : "voir en %"}` : undefined}
          className={`whitespace-pre-line text-center font-bold leading-tight transition-transform duration-150 ${
            interactive ? "cursor-pointer hover:scale-110 active:scale-95" : ""
          }`}
          style={{
            fontSize: !hasMapping || !hasData ? 15 : 30,
            backgroundImage: !hasMapping || !hasData
              ? undefined
              : `linear-gradient(135deg, ${lighten(valueColor, 0.25)}, ${valueColor})`,
            WebkitBackgroundClip: !hasMapping || !hasData ? undefined : "text",
            backgroundClip: !hasMapping || !hasData ? undefined : "text",
            color: !hasMapping || !hasData ? "#94a3b8" : "transparent",
          }}
        >
          {displayValue}
        </span>
        {interactive && (
          <span className="text-[11px] font-medium text-slate-400 mt-0.5">
            {showPercent ? `sur ${max}${c.unit ?? ""}` : "sur l'échelle"}
          </span>
        )}
      </div>

      {hasMapping && hasData && c.target != null && (
        <div className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-slate-400">
          Objectif&nbsp;: {c.target.toFixed(decimals).replace(".", ",")}{c.unit ?? ""}
        </div>
      )}
    </div>
  );

  return wrap(c, boxStyle(c), content);
}