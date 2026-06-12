import { usePage } from "@inertiajs/react";
import { LayoutDashboard, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { pushAudit } from "@/lib/audit";
import { exportToCsv } from "@/lib/export";
import GlobalFilterBar from "./GlobalFilterBar";
import LiveSyncPill from "./LiveSyncPill";
import ThemeToggle from "./ThemeToggle";

const PAGE_TITLE_MAP: Record<string, string> = {
  "/quality": "SÉRIE 100 : QUALITÉ",
  "/production": "SÉRIE 200 : PRODUCTION",
  "/logistics": "PILOTAGE LOGISTIQUE",
  "/methods": "MÉTHODES & AMÉLIORATION CONTINUE",
  "/development": "DÉVELOPPEMENT & AMÉLIORATION",
  "/admin": "ADMINISTRATION SYSTÈME",
};

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  exportRows?: Record<string, unknown>[];
  exportFilename?: string;
}

const TopBar = ({ title: propTitle, subtitle, exportRows, exportFilename }: TopBarProps) => {
  const { url: pathname } = usePage();
  const { session } = useAuth();

  const title = propTitle || PAGE_TITLE_MAP[pathname] || "DASHBOARD";
  const showFilters = pathname !== "/admin" && pathname !== "/unauthorized";

  const handleExport = () => {
    if (!exportRows || !exportRows.length) {
      pushAudit("WARN", `Export ${title}: aucune donnée disponible`);
      return;
    }
    const name =
      exportFilename ||
      `BACOVET_${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}`;
    exportToCsv(name, exportRows);
    pushAudit("USER", `Export ${title} (${exportRows.length} lignes) par ${session?.matricule}`);
  };

  return (
    <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-10">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-base font-bold tracking-wide uppercase">{title}</h1>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
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

      {showFilters && (
        <div className="px-6 py-2 flex items-center justify-between border-t border-border/60 bg-background/40">
          <GlobalFilterBar />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs uppercase tracking-wider"
          >
            <Printer className="h-3 w-3 mr-2" /> IMPRIMER RAPPORT
          </Button>
        </div>
      )}
    </header>
  );
};

export default TopBar;
