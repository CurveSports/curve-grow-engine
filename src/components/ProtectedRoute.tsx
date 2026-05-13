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
  if (requiredModule && !hasModule(requiredModule)) {
    // Send user to a module they can access
    if (userRole === "admin") {
      if (requiredModule === "allegiance" && hasModule("acquisitions")) {
        return <Navigate to="/admin/acquisitions" replace />;
      }
      if (requiredModule === "acquisitions" && hasModule("allegiance")) {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
