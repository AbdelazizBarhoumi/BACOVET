import { useRef, useEffect, useState, useCallback } from 'react';

const DARK_COLORS: Record<string, string> = {
  '--blue': '#1e88ff', '--green': '#65b83d', '--orange': '#ff9800',
  '--red': '#ff2020', '--purple': '#9c6cff', '--border': '#153a5c',
  '--muted-foreground': '#f8fafc', '--foreground': '#f8fafc', '--cyan': '#22d3ee',
};
function getVar(v: string) {
  const val = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return val || DARK_COLORS[v] || '#888';
}

function useThemeVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setV(n => n + 1));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return v;
}

function axes(ctx: CanvasRenderingContext2D, w: number, h: number, max = 100) {
  ctx.strokeStyle = getVar('--border');
  ctx.fillStyle = getVar('--muted-foreground');
  ctx.font = '11px Segoe UI';
  for (let i = 0; i <= 4; i++) {
    const y = 25 + (h - 50) * i / 4;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 15, y);
    ctx.stroke();
    ctx.fillText(Math.round(max * (1 - i / 4)) + '%', 5, y + 4);
  }
  ctx.beginPath();
  ctx.moveTo(40, 20);
  ctx.lineTo(40, h - 25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(40, h - 25);
  ctx.lineTo(w - 15, h - 25);
  ctx.stroke();
}

function setupCanvas(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!;
  const r = c.getBoundingClientRect();
  const d = window.devicePixelRatio || 1;
  c.width = r.width * d;
  c.height = r.height * d;
  ctx.scale(d, d);
  ctx.clearRect(0, 0, r.width, r.height);
  return { ctx, w: r.width, h: r.height };
}

function Tooltip({ x, y, label, value }: { x: number; y: number; label: string; value: string }) {
  return (
    <div
      className="pointer-events-none absolute z-50 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-lg"
      style={{ left: x, top: y, transform: 'translate(-50%, -110%)' }}
    >
      <div className="font-bold text-[var(--foreground)]">{label}</div>
      <div className="text-[var(--muted-foreground)]">{value}</div>
    </div>
  );
}

function useChartHover() {
  const [tip, setTip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>, label: string, value: string) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, label, value });
  }, []);
  const onLeave = useCallback(() => setTip(null), []);
  return { tip, onMove, onLeave };
}

/* ─── COMBO CHART (bar + target line) ─── */
export function ComboChart({ values, target = 90, labels }: { values: number[]; target?: number; labels?: string[] }) {
  const { tip, onMove, onLeave } = useChartHover();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tv = useThemeVersion();

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx, w, h } = setupCanvas(c);
    ctx.strokeStyle = getVar('--border');
    ctx.fillStyle = getVar('--muted-foreground');
    ctx.font = '11px Segoe UI';
    [0, 50, 100, 150].forEach((v, i) => {
      const y = 25 + (h - 50) * (3 - i) / 3;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 15, y);
      ctx.stroke();
      ctx.fillText(String(v), 10, y + 4);
    });
    const blue = getVar('--blue');
    const green = getVar('--green');
    const text = getVar('--foreground');
    values.forEach((v, i) => {
      const x = 55 + i * (w - 85) / values.length;
      const bw = (w - 100) / values.length * .38;
      const bh = v / 150 * (h - 55);
      const g = ctx.createLinearGradient(0, h - 25 - bh, 0, h - 25);
      g.addColorStop(0, blue);
      g.addColorStop(1, '#003b8f');
      ctx.fillStyle = g;
      ctx.fillRect(x, h - 25 - bh, bw, bh);
      ctx.fillStyle = text;
      ctx.font = '12px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(v.toFixed(1).replace('.', ',') + '%', x + bw / 2, h - 32 - bh);
      ctx.fillText(labels?.[i] ?? 'OP0' + (i + 1), x + bw / 2, h - 6);
    });
    const barTopY = (v: number) => h - 25 - (v / 150) * (h - 55);
    const targetRefY = 25 + (150 - target) / 150 * (h - 55);
    ctx.strokeStyle = green;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(40, targetRefY);
    ctx.lineTo(w - 15, targetRefY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = green;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = 55 + i * (w - 85) / values.length + ((w - 100) / values.length * .38) / 2;
      const y = barTopY(v);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    values.forEach((v, i) => {
      const x = 55 + i * (w - 85) / values.length + ((w - 100) / values.length * .38) / 2;
      const y = barTopY(v);
      ctx.fillStyle = green;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = green;
    ctx.font = 'bold 12px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(target + '%', w - 30, targetRefY - 5);
  }, [values, target, labels, tv]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const bw = (r.width - 100) / values.length;
    const idx = Math.floor((mx - 55) / bw);
    if (idx >= 0 && idx < values.length) {
      const lbl = labels?.[idx] ?? 'OP0' + (idx + 1);
      onMove(e, lbl, values[idx].toFixed(1).replace('.', ',') + '%');
    } else {
      onLeave();
    }
  };

  return (
    <div className="relative" onMouseMove={handleMove} onMouseLeave={onLeave}>
      <div className="flex items-center gap-4 my-2 ml-9 text-[10px] text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: getVar('--blue') }} />Efficience</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 rounded-full relative" style={{ background: getVar('--green') }}><span className="absolute w-1.5 h-1.5 rounded-full bg-current top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: getVar('--green') }} /></span>Objectif (%)</span>
      </div>
      <canvas ref={canvasRef} className="w-full h-[170px]" />
      {tip && <Tooltip {...tip} />}
    </div>
  );
}

/* ─── GAUGE CHART (semicircle) ─── */
export function GaugeChart({ value, target, color = 'green' }: { value: number; target: string; color?: 'green' | 'orange' }) {
  const { tip, onMove, onLeave } = useChartHover();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tv = useThemeVersion();

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx, w, h } = setupCanvas(c);
    const cx = w / 2, cy = h * .62, r = Math.min(w, h) * .42;
    ctx.lineWidth = 19;
    ctx.strokeStyle = getVar('--border');
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = color === 'orange' ? getVar('--orange') : getVar('--green');
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + (value / 100) * Math.PI);
    ctx.stroke();
    const gaugeColor = color === 'orange' ? getVar('--orange') : getVar('--green');
    const small = w < 250;
    const tiny = w < 160;
    ctx.fillStyle = gaugeColor;
    ctx.textAlign = 'center';
    ctx.font = `bold ${tiny ? 18 : small ? 28 : 38}px Segoe UI`;
    ctx.fillText(value.toString().replace('.', ',') + ' %', cx, cy - 10);
    ctx.fillStyle = getVar('--foreground');
    ctx.font = `${tiny ? 8 : small ? 10 : 11}px Segoe UI`;
    ctx.fillText('Objectif : ' + target, cx, cy + 28);
    ctx.font = `${tiny ? 9 : small ? 11 : 13}px Segoe UI`;
    ctx.fillText('0%', cx - r, cy + 30);
    ctx.fillText('100%', cx + r, cy + 30);
  }, [value, target, color, tv]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    onMove(e, 'Valeur', value.toFixed(1).replace('.', ',') + ' %');
  };

  return (
    <div className="h-[210px] relative" onMouseMove={handleMove} onMouseLeave={onLeave}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      {tip && <Tooltip {...tip} />}
    </div>
  );
}

/* ─── LINE CHART ─── */
export function LineChart({ values, target = 85, timeLabels }: { values: number[]; target?: number; timeLabels?: string[] }) {
  const labels = timeLabels ?? ['08:00', '09:00', '10:00', '11:00', '12:00', '16:00'];
  const { tip, onMove, onLeave } = useChartHover();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tv = useThemeVersion();

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx, w, h } = setupCanvas(c);
    const dataMin = Math.min(...values, target);
    const dataMax = Math.max(...values, target);
    const step = 10;
    const axisMin = Math.floor(dataMin / step) * step - step;
    const axisMax = Math.ceil(dataMax / step) * step + step;
    const range = axisMax - axisMin;
    const toY = (v: number) => 25 + (1 - (v - axisMin) / range) * (h - 55);
    ctx.strokeStyle = getVar('--border');
    ctx.fillStyle = getVar('--muted-foreground');
    ctx.font = '11px Segoe UI';
    for (let v = axisMin; v <= axisMax; v += step) {
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 15, y);
      ctx.stroke();
      ctx.fillText(String(v), 5, y + 4);
    }
    const blue = getVar('--blue');
    const green = getVar('--green');
    const text = getVar('--foreground');
    ctx.strokeStyle = green;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    const yo = toY(target);
    ctx.moveTo(45, yo);
    ctx.lineTo(w - 20, yo);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = 45 + i * (w - 70) / (values.length - 1);
      const y = toY(v);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    values.forEach((v, i) => {
      const x = 45 + i * (w - 70) / (values.length - 1);
      const y = toY(v);
      ctx.fillStyle = blue;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = text;
      ctx.font = '12px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(v.toFixed(1).replace('.', ',') + '%', x, y - 10);
      ctx.fillText(labels[i], x, h - 8);
    });
  }, [values, target, labels, tv]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const step = (r.width - 70) / (values.length - 1);
    const idx = Math.round((mx - 45) / step);
    const clamp = Math.max(0, Math.min(values.length - 1, idx));
    if (mx >= 35 && mx <= r.width - 15) {
      onMove(e, labels[clamp], values[clamp].toFixed(1).replace('.', ',') + '%');
    } else {
      onLeave();
    }
  };

  return (
    <div className="relative" onMouseMove={handleMove} onMouseLeave={onLeave}>
      <canvas ref={canvasRef} className="w-full h-full" />
      {tip && <Tooltip {...tip} />}
    </div>
  );
}

/* ─── AREA CHART ─── */
export function AreaChart({ values, yLabels }: { values: number[]; yLabels?: number[] }) {
  const yTicks = yLabels ?? [0, 500, 1000, 1500, 2000];
  const maxY = yTicks[yTicks.length - 1];
  const { tip, onMove, onLeave } = useChartHover();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tv = useThemeVersion();

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx, w, h } = setupCanvas(c);
    ctx.strokeStyle = getVar('--border');
    ctx.fillStyle = getVar('--muted-foreground');
    ctx.font = '11px Segoe UI';
    yTicks.forEach(v => {
      const y = h - 25 - (v / maxY) * (h - 55);
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 15, y);
      ctx.stroke();
      ctx.fillText(v >= 1000 ? (v / 1000) + 'K' : String(v), 5, y + 4);
    });
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(40, h - 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, h - 25);
    ctx.lineTo(w - 15, h - 25);
    ctx.stroke();
    const green = getVar('--green');
    const grad = ctx.createLinearGradient(0, 25, 0, h - 25);
    grad.addColorStop(0, 'rgba(76,175,50,.7)');
    grad.addColorStop(1, 'rgba(76,175,50,.12)');
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = 50 + i * (w - 80) / (values.length - 1);
      const y = h - 25 - (v / maxY) * (h - 55);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.lineTo(w - 30, h - 25);
    ctx.lineTo(50, h - 25);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = green;
    ctx.lineWidth = 3;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = 50 + i * (w - 80) / (values.length - 1);
      const y = h - 25 - (v / maxY) * (h - 55);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    values.forEach((v, i) => {
      const x = 50 + i * (w - 80) / (values.length - 1);
      const y = h - 25 - (v / maxY) * (h - 55);
      ctx.fillStyle = green;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = getVar('--foreground');
      ctx.fillText(String(v), x - 12, y - 12);
    });
  }, [values, yTicks, maxY, tv]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const step = (r.width - 80) / (values.length - 1);
    const idx = Math.round((mx - 50) / step);
    const clamp = Math.max(0, Math.min(values.length - 1, idx));
    if (mx >= 40 && mx <= r.width - 15) {
      onMove(e, 'WIP', String(values[clamp]));
    } else {
      onLeave();
    }
  };

  return (
    <div className="relative" onMouseMove={handleMove} onMouseLeave={onLeave}>
      <canvas ref={canvasRef} className="w-full h-[220px]" />
      {tip && <Tooltip {...tip} />}
    </div>
  );
}

/* ─── TIMELINE CHART ─── */
export function TimelineChart({ points }: { points: { time: string; min: number }[] }) {
  const { tip, onMove, onLeave } = useChartHover();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tv = useThemeVersion();

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx, w } = setupCanvas(c);
    const red = getVar('--red');
    const text = getVar('--foreground');
    ctx.strokeStyle = red;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(35, 55);
    ctx.lineTo(w - 30, 55);
    ctx.stroke();
    points.forEach((p, i) => {
      const x = 45 + i * (w - 90) / (points.length - 1);
      ctx.fillStyle = red;
      ctx.beginPath();
      ctx.arc(x, 55, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = text;
      ctx.font = '12px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(p.time, x, 35);
      ctx.fillText(p.min + ' min', x, 78);
    });
  }, [points, tv]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const step = (r.width - 90) / (points.length - 1);
    const idx = Math.round((mx - 45) / step);
    const clamp = Math.max(0, Math.min(points.length - 1, idx));
    if (mx >= 30 && mx <= r.width - 25) {
      onMove(e, points[clamp].time, points[clamp].min + ' min');
    } else {
      onLeave();
    }
  };

  return (
    <div className="relative" onMouseMove={handleMove} onMouseLeave={onLeave}>
      <canvas ref={canvasRef} className="w-full" style={{ height: 90 }} />
      {tip && <Tooltip {...tip} />}
    </div>
  );
}

/* ─── HORIZONTAL BAR CHART ─── */
export function HBarChart({ names, values, target }: { names: string[]; values: number[]; target?: number }) {
  const { tip, onMove, onLeave } = useChartHover();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tv = useThemeVersion();

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx, w, h } = setupCanvas(c);
    const green = getVar('--green');
    const text = getVar('--foreground');
    const muted = getVar('--muted-foreground');
    const border = getVar('--border');
    const chartLeft = 70;
    const chartRight = w - 15;
    const chartWidth = chartRight - chartLeft;
    for (let p = 0; p <= 100; p += 20) {
      const x = chartLeft + (p / 100) * chartWidth;
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, 30 + names.length * 28);
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.font = '10px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(p + '%', x, 30 + names.length * 28 + 14);
    }
    const bottomY = 30 + names.length * 28;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartLeft, bottomY);
    ctx.lineTo(chartRight, bottomY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(chartLeft, 30);
    ctx.lineTo(chartLeft, bottomY);
    ctx.stroke();
    if (target) {
      const tx = chartLeft + (target / 100) * chartWidth;
      ctx.strokeStyle = green;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(tx, 30);
      ctx.lineTo(tx, 30 + names.length * 28);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = green;
      ctx.font = 'bold 10px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(target + '%', tx, 25);
    }
    values.forEach((v, i) => {
      const y = 35 + i * 28;
      ctx.fillStyle = text;
      ctx.font = '13px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText(names[i], 15, y + 12);
      ctx.fillStyle = green;
      ctx.fillRect(chartLeft, y, (v / 100) * chartWidth, 16);
      ctx.fillStyle = text;
      ctx.fillText(v.toString().replace('.', ',') + '%', w - 55, y + 13);
    });
  }, [names, values, target, tv]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const my = e.clientY - r.top;
    const idx = Math.floor((my - 35) / 28);
    if (idx >= 0 && idx < values.length) {
      onMove(e, names[idx], values[idx].toString().replace('.', ',') + '%');
    } else {
      onLeave();
    }
  };

  return (
    <div className="relative" onMouseMove={handleMove} onMouseLeave={onLeave}>
      <canvas ref={canvasRef} className="w-full h-[180px]" />
      {tip && <Tooltip {...tip} />}
    </div>
  );
}
export function SparkCanvas({ fullWidth }: { fullWidth?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tv = useThemeVersion();
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { ctx, w, h } = setupCanvas(c);
    const green = getVar('--green');
    ctx.strokeStyle = green;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const pts = [70, 72, 71, 73, 72, 74, 72, 73, 65, 71, 73, 65, 74, 73, 72, 71, 78,72, 71, 70, 72, 74, 65, 72, 71, 72, 79, 73];
    pts.forEach((v, i) => {
      const x = i * w / (pts.length - 1);
      const y = h - 8 - (v - 68) * 3;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }, [tv]);
  if (fullWidth) return <canvas ref={ref} className="w-full h-[40px] mt-2" />;
  return <canvas ref={ref} className="absolute right-4 bottom-3 w-[95px] h-[40px]" />;
}
