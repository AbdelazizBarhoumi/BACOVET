import { ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth, RolePage } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, hasAccess } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!session) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" search={{ redirect: pathname }} />;
  }

  if (!hasAccess(pathname as RolePage)) {
    // Redirect to unauthorized if authenticated but no access
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}
