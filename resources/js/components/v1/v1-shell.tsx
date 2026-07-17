import { Link } from "@tanstack/react-router";
import { Calendar, Layers, Factory, Users, Circle, Sun, Moon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
const NAV = [
  { to: "/v1/production-confection", label: "Prod. Confection" },
  { to: "/v1/production-flux", label: "Prod. & Flux (S200)" },
  { to: "/v1/qualite", label: "Qualité (S100)" },
  { to: "/v1/comparaison", label: "Comparaison 18 Chaînes" },
] as const;
export function V1Shell({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* top nav strip */}
      <div className="border-b border-border bg-card/60 backdrop-blur">
        <div className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-3">V1 ·</span>
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`text-[11px] uppercase tracking-wider px-3 py-1 rounded ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <Link to="/v1/login" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              ← /v0
            </Link>
            <button onClick={toggle} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
export function BacovetLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="px-2.5 py-1 bg-[#1e6cb8] text-white font-black tracking-tight text-lg leading-none rounded-sm">
        BACOVET
      </div>
      <div className="text-[10px] italic text-muted-foreground -ml-1">International</div>
      <div className="flex gap-0.5 ml-1">
        <span className="h-2 w-2 bg-[#e63946]" />
        <span className="h-2 w-2 bg-[#2a9d8f]" />
        <span className="h-2 w-2 bg-[#f4a261]" />
      </div>
    </div>
  );
}
export function PageHeader({
  title, subtitle, filters, showTime = true,
}: { title: string; subtitle?: string; filters?: ReactNode; showTime?: boolean }) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-border">
      <div className="flex items-start gap-6 flex-wrap">
        <BacovetLogo />
        <div className="flex-1 min-w-[300px]">
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <div className="text-sm font-semibold text-[#1e90d8] uppercase tracking-wide mt-0.5">{subtitle}</div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">{filters}</div>
        {showTime && <LiveClock />}
      </div>
    </div>
  );
}
export function FilterPill({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-1.5 min-w-[140px]">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1.5 text-sm font-semibold mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {value}
      </div>
    </div>
  );
}
export function FilterSelect({
  label, value, options, onChange, icon: Icon,
}: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-1.5 min-w-[140px]">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-sm font-semibold outline-none cursor-pointer truncate w-full"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
export const Filters = { Calendar, Layers, Factory, Users };
function LiveClock() {
  const [now, setNow] = useState(new Date(2026, 3, 4, 16, 25, 43));
  useEffect(() => {
    const t = setInterval(() => setNow((d) => new Date(d.getTime() + 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return (
    <div className="rounded-md border border-border bg-card px-3 py-1.5 flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Circle className="h-2 w-2 fill-green-500 text-green-500 animate-pulse" />
        <div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Temps Réel</div>
          <div className="text-[10px] text-muted-foreground">1 Seconde</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-mono font-bold leading-none">{hh}:{mm}:{ss}</div>
        <div className="text-[10px] text-muted-foreground">04 Avril 2026</div>
      </div>
    </div>
  );
}
export function StatusFooter({ user = "ADMIN" }: { user?: string }) {
  return (
    <div className="border-t border-border bg-card/40 px-4 py-2 flex items-center gap-6 text-[10px] uppercase tracking-widest text-muted-foreground flex-wrap">
      <div className="flex items-center gap-1.5">
        STATUT SYSTÈME <Circle className="h-2 w-2 fill-green-500 text-green-500" /> <span className="text-foreground">CONNECTÉ</span>
      </div>
      <div>SOURCE DONNÉES : <span className="text-foreground">G.PRO / DIVA / GOOGLE SHEETS / API MIDDLEWARE</span></div>
      <div>FRÉQUENCE MISE À JOUR : <span className="text-foreground">1 SECONDE</span></div>
      <div className="flex items-center gap-1"><Users className="h-3 w-3" /> UTILISATEUR : <span className="text-foreground">{user}</span></div>
      <div className="ml-auto">MODE : <span className="text-foreground">TEMPS RÉEL</span></div>
    </div>
  );
}
