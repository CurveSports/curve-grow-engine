import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import TaskList from "@/components/tasks/TaskList";
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";
import { useAuth } from "@/hooks/useAuth";
import { OrgTask, ENGINE_SCORE_FIELD } from "@/lib/tasks";
import { formatDate } from "@/lib/format";
import { CheckCircle2, AlertCircle, Calendar, ListChecks } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [planActivated, setPlanActivated] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrgTask | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile?.org_id) return;
    const [{ data: t }, { data: m }, { data: o }] = await Promise.all([
      supabase.from("org_tasks").select("*").eq("org_id", profile.org_id).order("priority").order("due_date"),
      supabase.from("derived_metrics").select("*").eq("org_id", profile.org_id).maybeSingle(),
      supabase.from("organizations").select("plan_activated_at").eq("id", profile.org_id).maybeSingle(),
    ]);
    setTasks((t as OrgTask[]) ?? []);
    if (m) {
      const s: Record<string, number | null> = {};
      for (const [eng, field] of Object.entries(ENGINE_SCORE_FIELD)) s[eng] = (m as any)[field];
      setScores(s);
    }
    setPlanActivated(o?.plan_activated_at ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.org_id]);

  const stats = useMemo(() => {
    const sevenAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const completedThisWeek = tasks.filter(t => t.completed_at && new Date(t.completed_at).getTime() > sevenAgo).length;
    const open = tasks.filter(t => t.status === "not_started" || t.status === "in_progress").length;
    const overdue = tasks.filter(t => t.status === "overdue").length;
    const upcoming = tasks
      .filter(t => t.status !== "completed" && t.due_date)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0] ?? null;
    return { completedThisWeek, open, overdue, upcoming };
  }, [tasks]);

  return (
    <AppShell>
      <div className="mb-8">
        <p className="curve-eyebrow mb-2">Action Plan</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Your dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {planActivated ? `Plan activated ${formatDate(planActivated)}` : "Your action plan hasn't been activated yet — your Curve consultant will activate it after reviewing your report."}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-accent" />} label="Tasks This Week" value={stats.completedThisWeek} />
        <StatCard icon={<ListChecks className="h-4 w-4" />} label="Open Tasks" value={stats.open} />
        <StatCard
          icon={<AlertCircle className={`h-4 w-4 ${stats.overdue > 0 ? "text-red-600" : "text-accent"}`} />}
          label="Overdue Tasks"
          value={stats.overdue}
          valueClass={stats.overdue > 0 ? "text-red-600" : ""}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Next Due"
          value={stats.upcoming ? formatDate(stats.upcoming.due_date!) : "—"}
          subtitle={stats.upcoming?.title}
          valueClass="text-base font-medium"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <TaskList tasks={tasks} scores={scores} onSelect={setSelected} />
      )}

      <TaskDetailPanel task={selected} open={!!selected} onClose={() => setSelected(null)} isAdmin={false} onChanged={load} />

      <div className="mt-10 pt-6 border-t border-border text-sm text-muted-foreground">
        Need to review your numbers? <Link to="/report" className="text-accent hover:underline">View Revenue Leak Report →</Link>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, subtitle, valueClass = "" }: { icon: React.ReactNode; label: string; value: any; subtitle?: string; valueClass?: string; }) {
  return (
    <div className="curve-card">
      <div className="flex items-center gap-2 mb-2">{icon}<p className="curve-eyebrow">{label}</p></div>
      <p className={`font-display text-3xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
    </div>
  );
}
