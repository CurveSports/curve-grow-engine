import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminOrgAssignments from "@/components/admin/AdminOrgAssignments";
import { Plus } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <AppShell title="Users">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">Curve Admin</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage Curve admins and organization users across the platform.
          </p>
        </div>
        <Link
          to="/admin/invite"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New organization
        </Link>
      </div>

      <AdminUsers />
    </AppShell>
  );
}
