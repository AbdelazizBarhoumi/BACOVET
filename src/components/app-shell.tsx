import { Navigate } from "@tanstack/react-router";
import { type ReactNode, useState, useEffect } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth guard - only redirect after mount to avoid hydration mismatch
  if (mounted) {
    if (!session) return <Navigate to="/login" />;
    if (!hasAccess(page)) return <Navigate to="/unauthorized" />;
  }

  // On server or before client hydration, we render the shell structure
  // but content will be protected by the 'mounted' check if needed.
  // Actually, to be safe, if we're not mounted, we can just return null
  // or a basic shell without user-specific data.
  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <div className="w-[240px] shrink-0 border-r border-sidebar-border bg-sidebar" />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-[60px] border-b border-border bg-card" />
          <main className="flex-1 p-6 overflow-auto" />
        </div>
      </div>
    );
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
