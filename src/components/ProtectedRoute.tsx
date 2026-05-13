import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

type ModuleName = "allegiance" | "acquisitions" | "marketing";

export default function ProtectedRoute({
  children,
  role,
  module: requiredModule,
}: {
  children: ReactNode;
  role?: "admin" | "org_user" | "seller_portal";
  module?: ModuleName;
}) {
  const { loading, session, role: userRole, hasModule } = useAuth();
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
    if (userRole === "seller_portal") return <Navigate to="/" replace />;
    return <Navigate to="/auth" replace />;
  }
  // Admins can access any module without the gating check
  if (requiredModule && userRole !== "admin" && !hasModule(requiredModule)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
