import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";
import OwnerPill from "@/components/tasks/OwnerPill";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/format";
import {
  OrgTask,
  ENGINE_SCORE_FIELD,
  STATUS_LABEL,
  STATUS_STYLE,
  PRIORITY_STYLE,
  type TaskStatus,
} from "@/lib/tasks";
import { PROJECT_STATUS_LABEL, type OrgProject } from "@/lib/projects";

const STATUS_ORDER: TaskStatus[] = ["overdue", "in_progress", "not_started", "completed"];

export default function AdminEngineFocus() {
  const { orgId, engine } = useParams<{ orgId: string; engine: string }>();
  const [orgName, setOrgName] = useState("");
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrgTask | null>(null);

  const load = async () => {
    if (!orgId || !engine) return;
    const [{ data: org }, { data: t }, { data: pj }, { data: m }] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      supabase.from("org_tasks").select("*").eq("org_id", orgId).eq("engine", engine as any).order("priority").order("due_date"),
      supabase.from("org_projects").select("*").eq("org_id", orgId),
      supabase.from("derived_metrics").select("*").eq("org_id", orgId).maybeSingle(),
    ]);
    setOrgName((org as any)?.name ?? "");
    setTasks((t as OrgTask[]) ?? []);
    setProjects((pj as OrgProject[]) ?? []);
    const field = ENGINE_SCORE_FIELD[engine];
    setScore(field && m ? ((m as any)[field] ?? null) : null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId, engine]);

  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );

  const tasksByStatus = useMemo(() => {
    const out: Record<TaskStatus, OrgTask[]> = { not_started: [], in_progress: [], completed: [], overdue: [] };
    for (const t of tasks) out[t.status as TaskStatus]?.push(t);
    return out;
  }, [tasks]);

  const total = tasks.length;
  const completed = tasksByStatus.completed.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <AppShell title={`${engine} Focus`}>
      <div className="mb-2">
        <Link to={`/admin/org/${orgId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to {orgName || "organization"}
        </Link>
      </div>

      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">Engine Focus</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{engine}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All {engine} tasks for {orgName} across every project, grouped by completion stage.
          </p>
        </div>
        <Link to={`/admin/org/${orgId}?tab=plan`}>
          <Button variant="outline" size="sm">Open Action Plan</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="curve-card flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {score !== null && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-border tabular-nums">
                  Score {score}/10
                </span>
              )}
              <span className="text-xs text-muted-foreground tabular-nums">
                {completed}/{total} complete · {pct}%
              </span>
            </div>
          </div>

          {total === 0 ? (
            <div className="curve-card text-sm text-muted-foreground text-center py-10">
              No {engine} tasks yet.
            </div>
          ) : (
            STATUS_ORDER.map((status) => {
              const list = tasksByStatus[status];
              if (!list || list.length === 0) return null;
              return (
                <div key={status} className="curve-card p-0 overflow-hidden">
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{list.length}</span>
                    </div>
                  </div>
                  <ul className="divide-y divide-border">
                    {list.map((t) => {
                      const proj = t.project_id ? projectsById[t.project_id] : null;
                      return (
                        <li key={t.id}>
                          <button
                            onClick={() => setSelected(t)}
                            className="w-full text-left px-5 py-3 hover:bg-secondary/40 transition-colors flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                {t.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t.task_type}
                                {t.due_date ? ` · Due ${formatDate(t.due_date)}` : ""}
                                {proj
                                  ? ` · ${proj.name} (${PROJECT_STATUS_LABEL[proj.status]})`
                                  : " · Unassigned"}
                              </p>
                            </div>
                            <OwnerPill owner={t.owner_type} size="xs" />
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}

      <TaskDetailPanel task={selected} open={!!selected} onClose={() => setSelected(null)} isAdmin={true} onChanged={load} />
    </AppShell>
  );
}
