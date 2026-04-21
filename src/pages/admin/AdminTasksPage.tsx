import AppShell from "@/components/AppShell";
import AdminTasks from "@/pages/admin/AdminTasks";

export default function AdminTasksPage() {
  return (
    <AppShell title="Tasks">
      <div className="mb-6">
        <p className="curve-eyebrow mb-2">Cross-Org</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">Task progress across every active organization.</p>
      </div>
      <AdminTasks />
    </AppShell>
  );
}
