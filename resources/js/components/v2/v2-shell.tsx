import { Link } from "@tanstack/react-router";
import { Sun, Moon } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "@/hooks/use-theme";

const NAV = [
  { to: "/v2/production", label: "Production" },
] as const;

export function V2Shell({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="border-b border-border bg-card/60 backdrop-blur">
        <div className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-3">V2 ·</span>
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as string}
                className={`text-[11px] uppercase tracking-wider px-3 py-1 rounded ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <Link to="/v1" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              ← /v1
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
