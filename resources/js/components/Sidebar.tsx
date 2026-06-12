import { Link, usePage } from "@inertiajs/react";
import {
  Activity,
  BarChart3,
  Boxes,
  FlaskConical,
  LogOut,
  Settings,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, ROLE_LABEL, type RolePage } from "@/context/AuthContext";
import { pushAudit } from "@/lib/audit";

const NAV_ITEMS: {
  href: RolePage;
  label: string;
  code: string;
  icon: typeof Activity;
  children?: { href: string; label: string }[];
}[] = [
  { href: "/quality", label: "QUALITÉ", code: "100", icon: FlaskConical },
  {
    href: "/production",
    label: "PRODUCTION",
    code: "200",
    icon: BarChart3,
    children: [
      { href: "/production?tab=confection", label: "Confection" },
      { href: "/production?tab=coupe", label: "Coupe" },
      { href: "/production?tab=serigraphie", label: "Sérigraphie" },
    ],
  },
  { href: "/logistics", label: "LOGISTIQUE & PLANNING", code: "300", icon: Boxes },
  { href: "/development", label: "DÉVELOPPEMENT & AMÉLIORATION", code: "350", icon: Activity },
  { href: "/methods", label: "MÉTHODES", code: "", icon: LayoutDashboard },
];

const Sidebar = () => {
  const { url: pathname } = usePage();
  const { session, logout, hasAccess } = useAuth();

  if (!session) return null;

  const initials = session.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const visibleNav = NAV_ITEMS.filter((n) => hasAccess(n.href));
  const canSeeAdmin = hasAccess("/admin");

  return (
    <aside className="w-[240px] shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary text-white grid place-items-center font-mono font-bold">
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

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const isParentOfActive = pathname.startsWith(item.href);

          return (
            <div key={item.href}>
              <Link
                href={item.href}
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
                {item.code && (
                  <span
                    className={`text-[10px] font-mono ${active ? "text-white/70" : "text-muted-foreground"}`}
                  >
                    ({item.code})
                  </span>
                )}
              </Link>

              {isParentOfActive && item.children && (
                <div className="ml-9 mt-1 mb-2 space-y-1 border-l border-border pl-2">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href as RolePage}
                      className="block text-xs py-1.5 px-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="inline h-3 w-3 mr-1 opacity-50" />
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {canSeeAdmin && (
          <>
            <div className="px-3 pt-6 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
              SYSTÈME
            </div>
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                pathname === "/admin"
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "hover:bg-sidebar-accent"
              }`}
            >
              <Settings
                className={`h-4 w-4 ${pathname === "/admin" ? "text-white" : "text-primary"}`}
              />
              <span className="flex-1 uppercase tracking-wide text-[12px] font-semibold">
                ADMINISTRATION
              </span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-primary text-white grid place-items-center text-xs font-bold shadow-sm">
            {initials}
          </div>
          <div className="text-xs leading-tight min-w-0">
            <div className="font-bold truncate uppercase">{session.name}</div>
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
          className="w-full justify-start text-[11px] uppercase tracking-wider hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5 mr-2" /> DÉCONNEXION
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
