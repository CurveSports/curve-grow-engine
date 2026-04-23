import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OrgTask, ENGINES } from "@/lib/tasks";
import { ArrowRight, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { formatDate } from "@/lib/format";

type Props = {
  orgId: string;
  tasks: OrgTask[];
  scores: Record<string, number | null>;
  tasksGeneratedAt?: string | null;
};

export default function PlanManageSummary({ orgId, tasks, scores, tasksGeneratedAt }: Props) {
  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.plan_status === "active");
    const parked = tasks.filter((t) => t.plan_status === "parked");
    const completed = active.filter((t) => t.status === "completed").length;
    const inProgress = active.filter((t) => t.status === "in_progress").length;
    const overdue = active.filter((t) => {
      if (t.status === "completed" || !t.due_date) return false;
      return new Date(t.due_date).getTime() < Date.now();
    }).length;
    const recent = [...active]
      .filter((t) => t.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
      .slice(0, 5);
    return { active: active.length, parked: parked.length, completed, inProgress, overdue, recent };
  }, [tasks]);

  const byEngine = useMemo(() => {
    const out: Record<string, { total: number; done: number }> = {};
    for (const t of tasks) {
      if (t.plan_status !== "active") continue;
      out[t.engine] ||= { total: 0, done: 0 };
      out[t.engine].total += 1;
      if (t.status === "completed") out[t.engine].done += 1;
    }
    return out;
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Active tasks" value={stats.active} />
        <Stat label="Completed" value={stats.completed} icon={<CheckCircle2 className="h-3.5 w-3.5 text-accent" />} />
        <Stat label="In progress" value={stats.inProgress} icon={<Clock className="h-3.5 w-3.5 text-info" />} />
        <Stat
          label="Overdue"
          value={stats.overdue}
          tone={stats.overdue > 0 ? "warning" : undefined}
          icon={stats.overdue > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : undefined}
        />
      </div>

      <div className="curve-card p-5">
        <div className="flex items-baseline justify-between mb-4">
          <p className="curve-eyebrow">Engine progress</p>
          {stats.parked > 0 && (
            <span className="text-xs text-muted-foreground">{stats.parked} parked task{stats.parked === 1 ? "" : "s"}</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ENGINES.filter((e) => byEngine[e]).map((e) => {
            const { total, done } = byEngine[e];
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={e} className="p-3 rounded-lg border bg-background">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{e}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{done}/{total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stats.recent.length > 0 && (
        <div className="curve-card p-5">
          <p className="curve-eyebrow mb-3">Recently completed</p>
          <ul className="space-y-2">
            {stats.recent.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
                <span className="flex-1 truncate">{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.completed_at ? formatDate(t.completed_at) : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between p-4 rounded-lg border border-accent/30 bg-accent-soft">
        <div>
          <p className="text-sm font-medium">Day-to-day work happens in Projects</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group these tasks into release waves and track progress on the Projects tab.
          </p>
        </div>
        <Link to={`/admin/org/${orgId}?tab=projects`}>
          <Button size="sm">Open Projects <ArrowRight className="h-4 w-4 ml-1" /></Button>
        </Link>
      </div>

      {tasksGeneratedAt && (
        <p className="text-xs text-muted-foreground text-center">
          Recommendations last refreshed {formatDate(tasksGeneratedAt)}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon?: any; tone?: "warning" }) {
  return (
    <div className={`curve-card p-4 ${tone === "warning" && value > 0 ? "border-destructive/30" : ""}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
