import { type ReactNode } from "react";
import { useAuth, type RolePage } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export function AppShell({
  children,
  page,
  title,
  subtitle,
  exportRows,
  exportFilename,
}: {
  children: ReactNode;
  page: RolePage;
  title?: string;
  subtitle?: string;
  exportRows?: Record<string, unknown>[];
  exportFilename?: string;
}) {
  const { session, hasAccess } = useAuth();

  // If no session, we might want to redirect, but Laravel middleware usually handles this.
  // We'll just return the shell for now.
  if (!session || !hasAccess(page)) {
      return (
          <div className="flex min-h-screen items-center justify-center">
              <p>Accès non autorisé ou session expirée.</p>
          </div>
      )
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={title}
          subtitle={subtitle}
          exportRows={exportRows}
          exportFilename={exportFilename}
        />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

