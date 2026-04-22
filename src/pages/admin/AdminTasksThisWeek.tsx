import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { ENGINES, type Engine } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { Calendar, AlertCircle, Clock, ChevronRight, Building2 } from "lucide-react";

type TaskRow = {
  id: string;
  org_id: string;
  title: string;
  engine: Engine;
  status: string;
  due_date: string | null;
  priority: string;
  task_type: string;
  project_id: string | null;
};

type OrgInfo = { id: string; name: string };

export default function AdminTasksThisWeek() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [orgs, setOrgs] = useState<Record<string, OrgInfo>>({});
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekAhead = useMemo(
    () => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    []
  );

  useEffect(() => {
    (async () => {
      const [tasksRes, orgsRes] = await Promise.all([
        supabase
          .from("org_tasks")
          .select("id, org_id, title, engine, status, due_date, priority, task_type, project_id")
          .neq("status", "completed")
          .not("due_date", "is", null)
          .lte("due_date", weekAhead)
          .order("due_date", { ascending: true }),
        supabase.from("organizations").select("id, name"),
      ]);

      const orgMap: Record<string, OrgInfo> = {};
      for (const o of (orgsRes.data ?? []) as OrgInfo[]) orgMap[o.id] = o;
      setOrgs(orgMap);
      setTasks((tasksRes.data ?? []) as TaskRow[]);
      setLoading(false);
    })();
  }, [weekAhead]);

  // Group: org -> engine -> tasks
  const grouped = useMemo(() => {
    const byOrg: Record<string, Record<string, TaskRow[]>> = {};
    for (const t of tasks) {
      const orgId = t.org_id;
      if (!byOrg[orgId]) byOrg[orgId] = {};
      if (!byOrg[orgId][t.engine]) byOrg[orgId][t.engine] = [];
      byOrg[orgId][t.engine].push(t);
    }
    return byOrg;
  }, [tasks]);

  const orgIds = useMemo(
    () =>
      Object.keys(grouped).sort((a, b) =>
        (orgs[a]?.name ?? "").localeCompare(orgs[b]?.name ?? "")
      ),
    [grouped, orgs]
  );

  const totals = useMemo(() => {
    const overdue = tasks.filter((t) => t.due_date && t.due_date < today).length;
    const dueSoon = tasks.length - overdue;
    return { total: tasks.length, overdue, dueSoon };
  }, [tasks, today]);

  return (
    <AppShell title="Tasks This Week">
      <div className="mb-8">
        <p className="curve-eyebrow mb-2">Curve OS</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Tasks This Week</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          All open tasks with a due date on or before {weekAhead}, grouped by organization and engine.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat icon={<Calendar className="h-4 w-4 text-warning" />} label="Due This Week" value={totals.total} />
        <Stat icon={<AlertCircle className="h-4 w-4 text-destructive" />} label="Overdue" value={totals.overdue} valueClass={totals.overdue > 0 ? "text-destructive" : ""} />
        <Stat icon={<Clock className="h-4 w-4 text-accent" />} label="Upcoming (≤7d)" value={totals.dueSoon} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : orgIds.length === 0 ? (
        <div className="curve-card text-center py-12">
          <Calendar className="h-10 w-10 mx-auto text-neutral mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">No tasks due this week</h3>
          <p className="text-sm text-muted-foreground">Nothing on the radar in the next 7 days.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orgIds.map((orgId) => {
            const engineMap = grouped[orgId];
            const engineOrder = ENGINES.filter((e) => engineMap[e]?.length);
            const orgTotal = Object.values(engineMap).reduce((a, l) => a + l.length, 0);
            return (
              <div key={orgId} className="curve-card p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
                  <Link
                    to={`/admin/org/${orgId}`}
                    className="flex items-center gap-2 font-display font-semibold hover:text-accent transition"
                  >
                    <Building2 className="h-4 w-4" />
                    {orgs[orgId]?.name ?? "Unknown org"}
                  </Link>
                  <span className="text-xs text-muted-foreground tabular-nums">{orgTotal} task{orgTotal === 1 ? "" : "s"}</span>
                </div>
                <div className="divide-y divide-border">
                  {engineOrder.map((engine) => {
                    const list = engineMap[engine];
                    return (
                      <div key={engine} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">{engine}</h3>
                          <span className="text-xs text-muted-foreground tabular-nums">{list.length}</span>
                        </div>
                        <div className="space-y-1">
                          {list.map((t) => (
                            <TaskRow key={t.id} task={t} orgId={orgId} today={today} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function TaskRow({ task, orgId, today }: { task: TaskRow; orgId: string; today: string }) {
  const overdue = !!task.due_date && task.due_date < today;
  return (
    <Link
      to={`/admin/org/${orgId}/tasks`}
      className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded hover:bg-muted/40 transition group"
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full flex-shrink-0",
          overdue ? "bg-destructive" : task.priority === "high" ? "bg-warning" : "bg-accent"
        )}
      />
      <span className="text-sm flex-1 truncate">{task.title}</span>
      <span
        className={cn(
          "text-xs tabular-nums flex-shrink-0",
          overdue ? "text-destructive font-semibold" : "text-muted-foreground"
        )}
      >
        {task.due_date}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
    </Link>
  );
}

function Stat({ icon, label, value, valueClass = "" }: { icon: React.ReactNode; label: string; value: any; valueClass?: string }) {
  return (
    <div className="curve-card">
      <div className="flex items-center gap-2 mb-3">{icon}<p className="curve-eyebrow">{label}</p></div>
      <p className={cn("curve-stat", valueClass)}>{value}</p>
    </div>
  );
}
