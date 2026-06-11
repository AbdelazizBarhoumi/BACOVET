import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth, ROLE_HOME } from "@/context/AuthContext";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" />;
  }

  return <Navigate to={ROLE_HOME[session.role]} />;
}
