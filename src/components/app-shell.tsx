import { Navigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useAuth, type RolePage } from "@/hooks/use-auth";
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

  // Auth guard
  if (!session) return <Navigate to="/login" />;
  if (!hasAccess(page)) return <Navigate to="/unauthorized" />;

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
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
