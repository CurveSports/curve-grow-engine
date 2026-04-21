import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode;
  role?: "admin" | "org_user";
}) {
  const { loading, session, role: userRole } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  if (role && userRole !== role) {
    if (userRole === "admin") return <Navigate to="/admin" replace />;
    if (userRole === "org_user") return <Navigate to="/intake" replace />;
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}
