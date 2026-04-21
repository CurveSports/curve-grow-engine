import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import TaskList from "@/components/tasks/TaskList";
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";
import { useAuth } from "@/hooks/useAuth";
import { OrgTask, ENGINE_SCORE_FIELD, ENGINES } from "@/lib/tasks";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Lock, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Plan() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [planActivated, setPlanActivated] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrgTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [engineFilter, setEngineFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [thisWeekOnly, setThisWeekOnly] = useState(false);

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

  const filtered = useMemo(() => {
    const sevenAhead = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return tasks.filter(t => {
      if (engineFilter !== "all" && t.engine !== engineFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (thisWeekOnly) {
        if (!t.due_date) return false;
        if (new Date(t.due_date).getTime() > sevenAhead) return false;
        if (t.status === "completed") return false;
      }
      return true;
    });
  }, [tasks, engineFilter, statusFilter, thisWeekOnly]);

  // Derive "projects" by engine for tabs
  const projects = useMemo(() => {
    const out: { engine: string; total: number; complete: number }[] = [];
    for (const e of ENGINES) {
      const list = tasks.filter(t => t.engine === e);
      if (list.length === 0) continue;
      out.push({ engine: e, total: list.length, complete: list.filter(t => t.status === "completed").length });
    }
    return out;
  }, [tasks]);

  if (loading) {
    return (
      <AppShell title="Action Plan">
        <PlanSkeleton />
      </AppShell>
    );
  }

  if (!planActivated) {
    return (
      <AppShell title="Action Plan">
        <EmptyState
          icon={<Lock className="h-10 w-10 text-muted-foreground" />}
          title="Plan not yet activated"
          description="Your Curve consultant is reviewing your report. Your action plan will appear here once activated."
          action={<Link to="/report"><Button variant="outline">View Report</Button></Link>}
        />
      </AppShell>
    );
  }

  if (tasks.length === 0) {
    return (
      <AppShell title="Action Plan">
        <EmptyState
          icon={<ListChecks className="h-10 w-10 text-muted-foreground" />}
          title="No tasks yet"
          description="Once tasks are added to your plan they'll appear here."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Action Plan">
      <div className="mb-6">
        <p className="curve-eyebrow mb-2">90-Day Plan</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Action Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">Activated {formatDate(planActivated)}</p>
      </div>

      {/* Project tabs (derived from engines) */}
      <div className="flex flex-wrap gap-2 mb-6 -mx-1 px-1 overflow-x-auto">
        <ProjectTab
          active={engineFilter === "all"}
          onClick={() => setEngineFilter("all")}
          label="All Tasks"
          complete={tasks.filter(t => t.status === "completed").length}
          total={tasks.length}
        />
        {projects.map(p => (
          <ProjectTab
            key={p.engine}
            active={engineFilter === p.engine}
            onClick={() => setEngineFilter(p.engine)}
            label={p.engine}
            complete={p.complete}
            total={p.total}
          />
        ))}
        {/* Coming-soon locked project example */}
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 text-muted-foreground text-sm cursor-not-allowed border border-dashed border-border">
          <Lock className="h-3.5 w-3.5" /> Sponsorship Pipeline · Coming soon
        </div>
      </div>

      {/* Filter bar */}
      <div className="curve-card mb-6 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="not_started">Not started</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={thisWeekOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setThisWeekOnly(v => !v)}
          className={cn("h-9", thisWeekOnly && "bg-warning text-warning-foreground hover:bg-warning/90")}
        >
          This Week
        </Button>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">{filtered.length} task{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-10 w-10 text-muted-foreground" />}
          title="No tasks match your filters"
          description="Try clearing filters or selecting a different project."
        />
      ) : (
        <TaskList tasks={filtered} scores={scores} onSelect={setSelected} />
      )}

      <TaskDetailPanel task={selected} open={!!selected} onClose={() => setSelected(null)} isAdmin={false} onChanged={load} />
    </AppShell>
  );
}

function ProjectTab({ active, onClick, label, complete, total }: { active: boolean; onClick: () => void; label: string; complete: number; total: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all whitespace-nowrap",
        active
          ? "bg-accent text-accent-foreground border-accent"
          : "bg-card text-foreground border-border hover:border-accent",
      )}
    >
      <span>{label}</span>
      <span className={cn("text-xs tabular-nums px-1.5 py-0.5 rounded", active ? "bg-white/20" : "bg-secondary text-muted-foreground")}>
        {complete}/{total}
      </span>
    </button>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="curve-card text-center py-16">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div className="space-y-4">
      <div className="curve-skeleton h-8 w-48 rounded" />
      <div className="curve-skeleton h-4 w-80 rounded" />
      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="curve-skeleton h-12 rounded-lg" />
        <div className="curve-skeleton h-12 rounded-lg" />
        <div className="curve-skeleton h-12 rounded-lg" />
      </div>
      <div className="curve-skeleton h-64 rounded-xl mt-6" />
    </div>
  );
}
