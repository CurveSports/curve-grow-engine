import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import TaskList from "@/components/tasks/TaskList";
import type { OrgTask } from "@/lib/tasks";
import type { OrgProject } from "@/lib/projects";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_STYLE, buildProjectWithTasks } from "@/lib/projects";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Props = {
  projects: OrgProject[];
  tasks: OrgTask[];
  scores: Record<string, number | null>;
  orgId: string;
  onSelect: (t: OrgTask) => void;
  onChanged: () => void;
};

export default function AdminTasksByProject({ projects, tasks, scores, orgId, onSelect, onChanged }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({});

  const grouped = useMemo(
    () => projects.map((p) => buildProjectWithTasks(p, tasks)),
    [projects, tasks]
  );
  const unassigned = useMemo(() => tasks.filter((t) => !(t as any).project_id), [tasks]);
  const draftProjects = useMemo(() => projects.filter((p) => p.status === "draft"), [projects]);

  const toggle = (id: string) => setCollapsed((s) => ({ ...s, [id]: !s[id] }));

  const addToProject = async (taskId: string) => {
    const projectId = assignTarget[taskId];
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("org_tasks").update({ project_id: projectId }).eq("id", taskId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("task_activity_log").insert({
      task_id: taskId,
      org_id: orgId,
      action: "assigned_to_project",
      performed_by: user?.id,
      new_value: projects.find((p) => p.id === projectId)?.name ?? null,
    });
    toast.success("Task added to project");
    setAssignTarget((s) => ({ ...s, [taskId]: "" }));
    onChanged();
  };

  return (
    <div className="space-y-6">
      {grouped.length === 0 && unassigned.length === 0 && (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      )}

      {grouped.map((p) => {
        const isCollapsed = collapsed[p.id];
        return (
          <div key={p.id} className="curve-card p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(p.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PROJECT_STATUS_STYLE[p.status]}`}>
                    {PROJECT_STATUS_LABEL[p.status]}
                  </span>
                  {p.engine && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-secondary text-foreground/70 border-border">
                      {p.engine}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={p.progressPct} className="h-1.5 flex-1 max-w-[240px]" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.taskComplete}/{p.taskTotal} complete
                  </span>
                </div>
              </div>
            </button>
            {!isCollapsed && (
              <div className="px-4 pb-4">
                {p.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks in this project.</p>
                ) : (
                  <TaskList tasks={p.tasks} scores={scores} onSelect={onSelect} showPlanStatus />
                )}
              </div>
            )}
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="curve-card p-0 overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-medium">Unassigned Tasks <span className="text-muted-foreground font-normal">({unassigned.length})</span></div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks not yet added to any project. Use the dropdown to assign.
            </p>
          </div>
          <div className="divide-y">
            {unassigned.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                <button
                  type="button"
                  onClick={() => onSelect(t)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{t.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-secondary text-foreground/70 border-border">
                      {t.engine}
                    </span>
                  </div>
                </button>
                <Select
                  value={assignTarget[t.id] ?? ""}
                  onValueChange={(v) => setAssignTarget((s) => ({ ...s, [t.id]: v }))}
                >
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue placeholder="Add to project…" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No projects yet</div>
                    ) : (
                      projects
                        .filter((p) => p.status !== "completed")
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({PROJECT_STATUS_LABEL[p.status]})
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => addToProject(t.id)}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {grouped.length > 0 && unassigned.length === 0 && (
        <p className="text-xs text-center text-muted-foreground">All tasks are organized into projects.</p>
      )}

      {draftProjects.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {draftProjects.length} draft project{draftProjects.length === 1 ? "" : "s"} not yet released to org.
        </p>
      )}
    </div>
  );
}
