import { Link, useRouterState, Navigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Boxes,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Settings,
  Printer,
  ChevronRight,
  Sun,
  Moon,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { useAuth, ROLE_LABEL, ROLE_HOME, type RolePage } from "@/hooks/use-auth";
import { useLiveData } from "@/hooks/use-live-data";
import { exportToCsv } from "@/lib/export";
import { pushAudit } from "@/lib/audit";

export function LiveSyncPill() {
  const { lastSync, isStale, forceSync } = useLiveData();
  const ago = Math.floor((Date.now() - lastSync) / 1000);
  return (
    <button
      onClick={() => {
        forceSync();
        pushAudit("SYSTEM", "Synchronisation forcée par l'utilisateur");
      }}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors ${
        isStale
          ? "bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30"
          : "bg-success/15 text-success border-success/30 hover:bg-success/25"
      }`}
      title="Cliquez pour forcer la synchronisation"
    >
      <span
        className={`h-2 w-2 rounded-full ${isStale ? "bg-destructive" : "bg-success animate-pulse"}`}
      />
      Live Sync: {isStale ? "STALE" : "OK"}
      <span className="opacity-60">· {ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`}</span>
    </button>
  );
}

export function GlobalFilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        { name: "Marque", opts: ["Toutes", "DOMYOS", "NABAIJI", "KALENJI", "QUECHUA"] },
        { name: "Atelier", opts: ["Tous", "Atelier 1", "Atelier 2", "Coupe", "Sérigraphie"] },
        { name: "Ligne", opts: ["Toutes", "CH1", "CH2", "CH3"] },
        { name: "OF", opts: ["Tous", "OF-4402", "OF-4391", "OF-4388"] },
      ].map((f) => (
        <Select key={f.name} defaultValue={f.opts[0]}>
          <SelectTrigger className="w-[140px] h-8 text-xs font-mono uppercase bg-secondary border-border">
            <span className="text-muted-foreground mr-1">{f.name}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {f.opts.map((o) => (
              <SelectItem key={o} value={o} className="text-xs font-mono">
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="h-7 w-7 p-0"
      aria-label="Basculer le thème"
    >
      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </Button>
  );
}

const NAV: {
  to: RolePage;
  label: string;
  code: string;
  icon: typeof Activity;
  children?: { to: string; label: string }[];
}[] = [
  { to: "/quality", label: "Qualité", code: "100", icon: FlaskConical },
  {
    to: "/production",
    label: "Production",
    code: "200",
    icon: BarChart3,
    children: [
      { to: "/production?tab=confection", label: "Confection" },
      { to: "/production?tab=coupe", label: "Coupe" },
      { to: "/production?tab=serigraphie", label: "Sérigraphie" },
    ],
  },
  { to: "/logistics", label: "Logistique & Planning", code: "300", icon: Boxes },
  { to: "/methods", label: "Méthodes", code: "400", icon: LayoutDashboard },
  { to: "/development", label: "Développement", code: "350", icon: Activity },
];

export function AppShell({
  title,
  subtitle,
  children,
  page,
  exportRows,
  exportFilename,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  page: RolePage;
  exportRows?: Record<string, unknown>[];
  exportFilename?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, logout, hasAccess } = useAuth();

  // Auth guard — also enforced globally in AuthProvider, this is the per-page RBAC check
  if (!session) return <Navigate to="/login" />;
  if (!hasAccess(page)) return <Navigate to="/unauthorized" />;

  const initials = session.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const visibleNav = NAV.filter((n) => hasAccess(n.to));
  const canSeeAdmin = hasAccess("/admin");

  const handleExport = () => {
    if (!exportRows || !exportRows.length) {
      pushAudit("WARN", `Export ${title}: aucune donnée disponible`);
      return;
    }
    const name =
      exportFilename ||
      `BACOVET_${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}`;
    exportToCsv(name, exportRows);
    pushAudit("USER", `Export ${title} (${exportRows.length} lignes) par ${session.matricule}`);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-mono font-bold">
              B
            </div>
            <div>
              <div className="text-sm font-bold tracking-widest">BACOVET</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Pilotage Op.
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono mt-2">
          Dashboard
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <div key={item.to}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary/15 text-primary border-l-2 border-primary"
                      : "hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 uppercase tracking-wide text-[12px] font-semibold">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">{item.code}</span>
                </Link>
                {active && item.children && (
                  <div className="ml-9 mt-0.5 mb-1 space-y-0.5">
                    {item.children.map((c) => (
                      <a
                        key={c.to}
                        href={c.to}
                        className="block text-xs py-1 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="inline h-3 w-3 mr-1" />
                        {c.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {canSeeAdmin && (
            <>
              <div className="px-3 pt-5 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
                Système
              </div>
              <Link
                to="/admin"
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  pathname.startsWith("/admin")
                    ? "bg-primary/15 text-primary border-l-2 border-primary"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="flex-1 uppercase tracking-wide text-[12px] font-semibold">
                  Administration
                </span>
              </Link>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-secondary grid place-items-center text-xs font-bold">
              {initials}
            </div>
            <div className="text-xs leading-tight min-w-0">
              <div className="font-semibold truncate">{session.name}</div>
              <div className="text-muted-foreground text-[10px] truncate">
                {ROLE_LABEL[session.role]}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              pushAudit("USER", `Déconnexion ${session.matricule}`);
              logout();
            }}
            className="w-full justify-start text-xs uppercase tracking-wider"
          >
            <LogOut className="h-3 w-3 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-10">
          <div className="px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-base font-bold tracking-wide uppercase">{title}</h1>
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LiveSyncPill />
            </div>
          </div>
          {page !== "/admin" && (
            <div className="px-6 py-2 flex items-center justify-between border-t border-border/60 bg-background/40">
              <GlobalFilterBar />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="text-xs uppercase tracking-wider"
              >
                <Printer className="h-3 w-3 mr-2" /> Imprimer / Export Excel
              </Button>
            </div>
          )}
        </header>
        <div className="p-6 flex-1">{children}</div>
      </main>
    </div>
  );
}

export function RefreshButton() {
  const { forceSync } = useLiveData();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={forceSync}
      className="h-7 text-[10px] uppercase tracking-wider"
    >
      <RefreshCw className="h-3 w-3 mr-1" /> Rafraîchir
    </Button>
  );
}
