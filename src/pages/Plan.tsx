import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import TaskList from "@/components/tasks/TaskList";
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";
import { useAuth } from "@/hooks/useAuth";
import { OrgTask, ENGINE_SCORE_FIELD } from "@/lib/tasks";
import { OrgProject, buildProjectWithTasks } from "@/lib/projects";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Lock, ListChecks, ChevronDown, ChevronRight, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Plan() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [planActivated, setPlanActivated] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrgTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  const load = async () => {
    if (!profile?.org_id) return;
    const [{ data: t }, { data: m }, { data: o }, { data: p }] = await Promise.all([
      supabase.from("org_tasks").select("*").eq("org_id", profile.org_id).order("priority").order("due_date"),
      supabase.from("derived_metrics").select("*").eq("org_id", profile.org_id).maybeSingle(),
      supabase.from("organizations").select("plan_activated_at").eq("id", profile.org_id).maybeSingle(),
      supabase.from("org_projects").select("*").eq("org_id", profile.org_id).order("display_order"),
    ]);
    setTasks((t as OrgTask[]) ?? []);
    setProjects((p as OrgProject[]) ?? []);
    if (m) {
      const s: Record<string, number | null> = {};
      for (const [eng, field] of Object.entries(ENGINE_SCORE_FIELD)) s[eng] = (m as any)[field];
      setScores(s);
    }
    setPlanActivated(o?.plan_activated_at ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.org_id]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "active").map((p) => buildProjectWithTasks(p, tasks)),
    [projects, tasks],
  );
  const completedProjects = useMemo(
    () => projects.filter((p) => p.status === "completed").map((p) => buildProjectWithTasks(p, tasks)),
    [projects, tasks],
  );
  const hasDrafts = projects.some((p) => p.status === "draft");

  if (loading) {
    return <AppShell title="Action Plan"><PlanSkeleton /></AppShell>;
  }

  if (activeProjects.length === 0 && completedProjects.length === 0) {
    return (
      <AppShell title="Action Plan">
        <EmptyState
          icon={<Lock className="h-10 w-10 text-muted-foreground" />}
          title="No projects released yet"
          description={hasDrafts
            ? "Your Curve team is preparing your first project. You'll see your tasks here as soon as it's released."
            : "Your Curve consultant is reviewing your report. Your action plan will appear here once your first project is released."}
          action={<Link to="/report"><Button variant="outline">View Report</Button></Link>}
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Action Plan">
      <div className="mb-6">
        <p className="curve-eyebrow mb-2">90-Day Plan</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Action Plan</h1>
        {planActivated && <p className="text-sm text-muted-foreground mt-1">Activated {formatDate(planActivated)}</p>}
      </div>

      {/* Active project sections */}
      <div className="space-y-6">
        {activeProjects.length === 0 && (
          <EmptyState
            icon={<ListChecks className="h-10 w-10 text-muted-foreground" />}
            title="No active projects right now"
            description="Your Curve team is preparing your next project."
          />
        )}

        {activeProjects.map((p) => (
          <div key={p.id} className="curve-card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-secondary/30">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-semibold text-lg">{p.name}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">{p.taskComplete}/{p.taskTotal} complete</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${p.progressPct}%` }} />
              </div>
            </div>
            {p.tasks.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No tasks in this project yet.</p>
            ) : (
              <TaskList tasks={p.tasks} scores={scores} onSelect={setSelected} />
            )}
          </div>
        ))}

        {/* Completed projects (collapsed) */}
        {completedProjects.length > 0 && (
          <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
            <CollapsibleTrigger className="w-full curve-card flex items-center justify-between hover:border-accent/50 transition-colors">
              <span className="font-medium text-sm">Completed Projects ({completedProjects.length})</span>
              {completedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {completedProjects.map((p) => (
                <div key={p.id} className="curve-card opacity-80">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{p.name}</h4>
                    <span className="text-xs text-accent">Completed {p.completion_approved_at ? formatDate(p.completion_approved_at) : ""}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.taskComplete} of {p.taskTotal} tasks completed</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* More coming soon teaser */}
        {hasDrafts && (
          <div className="curve-card border-dashed text-center py-8 bg-secondary/30">
            <Lock className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium text-sm">More Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Your Curve team is preparing your next project. Stay focused on your current priorities.
            </p>
          </div>
        )}
      </div>

      <TaskDetailPanel task={selected} open={!!selected} onClose={() => setSelected(null)} isAdmin={false} onChanged={load} />
    </AppShell>
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
      <div className="curve-shimmer h-64 rounded-xl mt-6" />
    </div>
  );
}
