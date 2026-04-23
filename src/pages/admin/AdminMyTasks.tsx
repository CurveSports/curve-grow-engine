import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { OrgTask, STATUS_LABEL, STATUS_STYLE, PRIORITY_STYLE, daysSince } from "@/lib/tasks";
import { formatDate } from "@/lib/format";
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OrgRow = { id: string; name: string };

type Filter = "open" | "all" | "completed";

export default function AdminMyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [orgsById, setOrgsById] = useState<Record<string, OrgRow>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const [selected, setSelected] = useState<OrgTask | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: assignments } = await supabase
      .from("org_task_assignees" as any)
      .select("task_id")
      .eq("user_id", user.id);
    const taskIds = ((assignments ?? []) as any[]).map((a) => a.task_id);
    if (taskIds.length === 0) {
      setTasks([]);
      setOrgsById({});
      setLoading(false);
      return;
    }
    const [{ data: t }, { data: o }] = await Promise.all([
      supabase.from("org_tasks").select("*").in("id", taskIds),
      supabase.from("organizations").select("id, name"),
    ]);
    setTasks(((t ?? []) as OrgTask[]));
    const map: Record<string, OrgRow> = {};
    for (const row of (o ?? []) as any[]) map[row.id] = { id: row.id, name: row.name };
    setOrgsById(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (filter === "open" && t.status === "completed") return false;
        if (filter === "completed" && t.status !== "completed") return false;
        if (q) {
          const hay = `${t.title} ${t.description} ${orgsById[t.org_id]?.name ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Overdue first, then by due date asc, then by last activity desc
        const aOver = a.status === "overdue" ? 0 : 1;
        const bOver = b.status === "overdue" ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        const ad = a.due_date ?? "9999-12-31";
        const bd = b.due_date ?? "9999-12-31";
        if (ad !== bd) return ad.localeCompare(bd);
        return (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? "");
      });
  }, [tasks, filter, search, orgsById]);

  const counts = useMemo(() => ({
    open: tasks.filter((t) => t.status !== "completed").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  }), [tasks]);

  return (
    <AppShell title="My Tasks">
      <div className="mb-6">
        <p className="curve-eyebrow mb-2">Your queue</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tasks assigned to you across every organization.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Open" value={counts.open} />
        <StatCard label="Overdue" value={counts.overdue} tone={counts.overdue > 0 ? "danger" : "neutral"} />
        <StatCard label="Completed" value={counts.completed} tone="muted" />
      </div>

      <div className="curve-card p-3 mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search task or organization…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open only</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
          {filtered.length} task{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="curve-card text-center py-12">
          <p className="text-sm text-muted-foreground">
            {tasks.length === 0
              ? "No tasks are assigned to you yet. When an admin assigns one, it'll show up here."
              : "No tasks match your filters."}
          </p>
        </div>
      ) : (
        <div className="curve-card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Task</th>
                <th className="px-5 py-3 font-medium">Organization</th>
                <th className="px-5 py-3 font-medium">Engine</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => {
                const org = orgsById[t.org_id];
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-secondary/40 transition-colors cursor-pointer"
                    onClick={() => setSelected(t)}
                  >
                    <td className="px-5 py-3">
                      <p className={`font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {t.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.task_type}</p>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {org ? (
                        <Link
                          to={`/admin/org/${org.id}/tasks`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-accent transition-colors"
                        >
                          {org.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{t.engine}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground tabular-nums">
                      {t.due_date ? formatDate(t.due_date) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground tabular-nums">
                      {t.last_activity_at ? `${daysSince(t.last_activity_at)}d ago` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TaskDetailPanel
        task={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        isAdmin={true}
        onChanged={() => {
          load();
          // refresh selection from new list
          if (selected) {
            setTimeout(() => {
              const fresh = tasks.find((x) => x.id === selected.id) ?? null;
              setSelected(fresh);
            }, 200);
          }
        }}
      />
    </AppShell>
  );
}

function StatCard({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "danger" | "muted" }) {
  const toneClass =
    tone === "danger" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="curve-card">
      <p className="curve-eyebrow">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
