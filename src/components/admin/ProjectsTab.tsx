import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ChevronDown, ChevronRight, CheckCircle2, Lock, Sparkles, Pencil, PlayCircle, X, BookmarkPlus, ExternalLink, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ENGINES, TASK_SOURCE_LABEL, TASK_SOURCE_STYLE, type OrgTask } from "@/lib/tasks";
import TaskLibraryPicker from "@/components/admin/TaskLibraryPicker";
import {
  PROJECT_NAME_SUGGESTIONS,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_STYLE,
  buildProjectWithTasks,
  type OrgProject,
  type OrgProjectStatus,
  type ProjectWithTasks,
} from "@/lib/projects";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = { orgId: string; orgName: string };

export default function ProjectsTab({ orgId, orgName }: Props) {
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [planActivatedAt, setPlanActivatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgProject | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<OrgProject | null>(null);
  const [completeTarget, setCompleteTarget] = useState<OrgProject | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: t }, { data: o }] = await Promise.all([
      supabase.from("org_projects").select("*").eq("org_id", orgId).order("display_order").order("created_at"),
      supabase.from("org_tasks").select("*").eq("org_id", orgId),
      supabase.from("organizations").select("plan_activated_at").eq("id", orgId).maybeSingle(),
    ]);
    setProjects((p as OrgProject[]) ?? []);
    setTasks((t as OrgTask[]) ?? []);
    setPlanActivatedAt((o as any)?.plan_activated_at ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const enriched = useMemo(
    () => projects.map((p) => buildProjectWithTasks(p, tasks)),
    [projects, tasks],
  );
  const byStatus = useMemo(() => {
    const out: Record<OrgProjectStatus, ProjectWithTasks[]> = { draft: [], active: [], completed: [] };
    for (const p of enriched) out[p.status].push(p);
    return out;
  }, [enriched]);

  const activeCount = byStatus.active.length;

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const unassignedCount = tasks.filter((t) => !(t as any).project_id).length;
  const hasNoProjects = projects.length === 0;
  const showApprovalNudge = !planActivatedAt && unassignedCount > 0;
  const showFirstProjectNudge = !!planActivatedAt && hasNoProjects && unassignedCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Projects</h2>
        <Button onClick={() => setCreateOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4 mr-1" /> New Project
        </Button>
      </div>

      {showApprovalNudge && (
        <div className="rounded-lg border border-warning/40 bg-warning-soft p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Approve the recommended plan first</p>
            <p className="text-sm text-muted-foreground mt-1">
              {unassignedCount} draft task{unassignedCount === 1 ? "" : "s"} are waiting for review on the Action Plan tab. Approve them to start organizing work into projects.
            </p>
          </div>
        </div>
      )}

      {showFirstProjectNudge && (
        <div className="rounded-lg border border-accent/40 bg-accent-soft p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Plan approved — create your first project</p>
            <p className="text-sm text-muted-foreground mt-1">
              You have {unassignedCount} approved task{unassignedCount === 1 ? "" : "s"} ready to release. Bundle them into a project to send the first wave of work to the org.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground flex-shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Create First Project
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Column title="Draft" count={byStatus.draft.length}>
          {byStatus.draft.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              orgId={orgId}
              expanded={expanded.has(p.id)}
              onToggle={() => toggleExpand(p.id)}
              onEdit={() => setEditTarget(p)}
              onRelease={() => setReleaseTarget(p)}
              onChanged={load}
            />
          ))}
          {byStatus.draft.length === 0 && <EmptyColumn label="No draft projects" />}
        </Column>
        <Column title="Active" count={byStatus.active.length}>
          {byStatus.active.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              orgId={orgId}
              expanded={expanded.has(p.id)}
              onToggle={() => toggleExpand(p.id)}
              onEdit={() => setEditTarget(p)}
              onComplete={p.awaiting_completion_approval ? () => setCompleteTarget(p) : undefined}
              onChanged={load}
            />
          ))}
          {byStatus.active.length === 0 && <EmptyColumn label="No active projects" />}
        </Column>
        <Column title="Completed" count={byStatus.completed.length}>
          {byStatus.completed.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              orgId={orgId}
              expanded={expanded.has(p.id)}
              onToggle={() => toggleExpand(p.id)}
              onEdit={() => setEditTarget(p)}
              onChanged={load}
            />
          ))}
          {byStatus.completed.length === 0 && <EmptyColumn label="No completed projects" />}
        </Column>
      </div>

      {createOpen && (
        <ProjectFormModal
          orgId={orgId}
          unassignedTasks={tasks.filter((t) => !(t as any).project_id)}
          onClose={() => setCreateOpen(false)}
          onSaved={() => { setCreateOpen(false); load(); }}
        />
      )}
      {editTarget && (
        <ProjectFormModal
          orgId={orgId}
          project={editTarget}
          unassignedTasks={tasks.filter((t) => !(t as any).project_id)}
          assignedTasks={tasks.filter((t) => (t as any).project_id === editTarget.id)}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); }}
        />
      )}
      {releaseTarget && (
        <ReleaseProjectModal
          project={enriched.find((p) => p.id === releaseTarget.id)!}
          orgName={orgName}
          activeCount={activeCount}
          onClose={() => setReleaseTarget(null)}
          onReleased={() => { setReleaseTarget(null); load(); }}
        />
      )}
      {completeTarget && (
        <CompleteProjectModal
          project={enriched.find((p) => p.id === completeTarget.id)!}
          orgId={orgId}
          orgName={orgName}
          allProjects={enriched}
          onClose={() => setCompleteTarget(null)}
          onApproved={() => { setCompleteTarget(null); load(); }}
        />
      )}
    </div>
  );
}

/* ────────────────────────── Column / Cards ────────────────────────── */

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <p className="curve-eyebrow">{title}</p>
        <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="curve-card text-center py-8 text-xs text-muted-foreground border-dashed">
      {label}
    </div>
  );
}

function ProjectCard({
  project,
  orgId,
  expanded,
  onToggle,
  onEdit,
  onRelease,
  onComplete,
  onChanged,
}: {
  project: ProjectWithTasks;
  orgId: string;
  expanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onRelease?: () => void;
  onComplete?: () => void;
  onChanged: () => void;
}) {
  const engineLabel = project.engine ?? "Cross-Engine";
  const [pickerOpen, setPickerOpen] = useState(false);
  const canCurate = project.status !== "completed";

  // Source breakdown summary
  const counts = useMemo(() => {
    const c = { system: 0, library: 0, custom: 0 };
    for (const t of project.tasks) {
      const src = ((t as any).source ?? "system") as keyof typeof c;
      if (src in c) c[src]++;
    }
    return c;
  }, [project.tasks]);

  const removeTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Remove "${taskTitle}" from this project?`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    // For draft projects, fully delete the task. For active, just unassign so history is preserved.
    if (project.status === "draft") {
      const { error } = await supabase.from("org_tasks").delete().eq("id", taskId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("org_tasks").update({ project_id: null }).eq("id", taskId);
      if (error) { toast.error(error.message); return; }
      await supabase.from("task_activity_log").insert({
        task_id: taskId, org_id: orgId, action: "removed_from_project" as const,
        performed_by: user?.id ?? null, old_value: project.name,
      });
    }
    toast.success("Task removed");
    onChanged();
  };

  const saveToLibrary = async (task: OrgTask) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("task_templates").insert({
      title: task.title,
      description: task.description,
      engine: task.engine,
      task_type: task.task_type,
      suggested_days_to_complete: 30,
      is_system_template: false,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Saved to Task Library as Custom");
  };

  return (
    <div className={cn(
      "curve-card p-4 space-y-3 transition-all",
      project.awaiting_completion_approval && "ring-2 ring-accent/40 bg-accent-soft/30",
    )}>
      <button onClick={onToggle} className="w-full text-left space-y-3">
        <div className="flex items-start gap-2 justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{project.name}</p>
            <span className={cn(
              "inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
              project.engine ? "bg-info-soft text-info border-info/30" : "bg-secondary text-muted-foreground border-border",
            )}>
              {engineLabel}
            </span>
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{project.taskTotal} task{project.taskTotal === 1 ? "" : "s"} · {project.taskComplete} complete</span>
            <span className="tabular-nums font-medium">{project.progressPct}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${project.progressPct}%` }} />
          </div>
        </div>

        {project.release_date && project.status === "draft" && (
          <p className="text-xs text-muted-foreground">Scheduled: {formatDate(project.release_date)}</p>
        )}
        {project.released_at && project.status !== "draft" && (
          <p className="text-xs text-muted-foreground">Released: {formatDate(project.released_at)}</p>
        )}
        {project.completion_approved_at && (
          <p className="text-xs text-accent">Completed: {formatDate(project.completion_approved_at)}</p>
        )}
      </button>

      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", PROJECT_STATUS_STYLE[project.status])}>
          {PROJECT_STATUS_LABEL[project.status]}
        </span>
        {project.awaiting_completion_approval && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground">
            Awaiting Approval
          </span>
        )}
        <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs ml-auto" onClick={(e) => e.stopPropagation()}>
          <Link to={`/admin/org/${orgId}/projects/${project.id}`}>
            <ExternalLink className="h-3 w-3 mr-1" /> Manage
          </Link>
        </Button>
        {onEdit && (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="h-7 px-2 text-xs">
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            if (!confirm(`Delete project "${project.name}"? Tasks inside it will be unassigned (not deleted).`)) return;
            (async () => {
              const { error: e1 } = await supabase.from("org_tasks").update({ project_id: null }).eq("project_id", project.id);
              if (e1) { toast.error(e1.message); return; }
              const { error: e2 } = await supabase.from("org_projects").delete().eq("id", project.id);
              if (e2) { toast.error(e2.message); return; }
              toast.success("Project deleted");
              onChanged();
            })();
          }}
          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
        {onRelease && (
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onRelease(); }} className="h-7 px-2 text-xs bg-accent hover:bg-accent/90 text-accent-foreground">
            <PlayCircle className="h-3 w-3 mr-1" /> Release
          </Button>
        )}
        {onComplete && (
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onComplete(); }} className="h-7 px-2 text-xs bg-accent hover:bg-accent/90 text-accent-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
          </Button>
        )}
      </div>

      {expanded && (
        <div className="pt-2 border-t border-border space-y-2.5">
          {/* Source breakdown summary */}
          {project.taskTotal > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="text-muted-foreground">Source mix:</span>
              {counts.system > 0 && (
                <span className={cn("px-1.5 py-0.5 rounded-full border", TASK_SOURCE_STYLE.system)}>
                  {counts.system} {TASK_SOURCE_LABEL.system}
                </span>
              )}
              {counts.library > 0 && (
                <span className={cn("px-1.5 py-0.5 rounded-full border", TASK_SOURCE_STYLE.library)}>
                  {counts.library} {TASK_SOURCE_LABEL.library}
                </span>
              )}
              {counts.custom > 0 && (
                <span className={cn("px-1.5 py-0.5 rounded-full border", TASK_SOURCE_STYLE.custom)}>
                  {counts.custom} {TASK_SOURCE_LABEL.custom}
                </span>
              )}
            </div>
          )}

          {project.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No tasks in this project yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {project.tasks.map((t) => {
                const source = ((t as any).source ?? "system") as keyof typeof TASK_SOURCE_LABEL;
                return (
                  <li key={t.id} className="text-xs flex items-start gap-2 group">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1.5",
                      t.status === "completed" ? "bg-accent" : t.status === "overdue" ? "bg-destructive" : "bg-neutral",
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{t.title}</span>
                        <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] border", TASK_SOURCE_STYLE[source])}>
                          {TASK_SOURCE_LABEL[source]}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {t.engine}{t.due_date ? ` · ${formatDate(t.due_date)}` : ""}
                      </div>
                    </div>
                    {canCurate && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        {source === "custom" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); saveToLibrary(t); }}
                            title="Save to Task Library"
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-accent"
                          >
                            <BookmarkPlus className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeTask(t.id, t.title); }}
                          title={project.status === "draft" ? "Delete task" : "Remove from project"}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {canCurate && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); setPickerOpen(true); }}
              className="w-full h-8 text-xs border-dashed"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Task
            </Button>
          )}
        </div>
      )}

      {pickerOpen && (
        <TaskLibraryPicker
          orgId={orgId}
          projectId={project.id}
          projectName={project.name}
          existingTemplateIds={project.tasks.map((t) => t.template_id).filter((x): x is string => !!x)}
          onClose={() => setPickerOpen(false)}
          onAdded={onChanged}
        />
      )}
    </div>
  );
}

/* ────────────────────────── Form Modal (Create / Edit) ────────────────────────── */

function ProjectFormModal({
  orgId,
  project,
  unassignedTasks,
  assignedTasks,
  onClose,
  onSaved,
}: {
  orgId: string;
  project?: OrgProject;
  unassignedTasks: OrgTask[];
  assignedTasks?: OrgTask[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!project;
  const [nameSelect, setNameSelect] = useState<string>(
    isEdit && PROJECT_NAME_SUGGESTIONS.includes(project!.name as any) ? project!.name : (isEdit ? "Custom" : ""),
  );
  const [customName, setCustomName] = useState(
    isEdit && !PROJECT_NAME_SUGGESTIONS.includes(project!.name as any) ? project!.name : "",
  );
  const [engine, setEngine] = useState<string>(project?.engine ?? "cross");
  const [description, setDescription] = useState(project?.description ?? "");
  const [releaseDate, setReleaseDate] = useState(project?.release_date ?? "");
  const [engineFilter, setEngineFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const candidates = useMemo(() => {
    const pool = isEdit ? [...unassignedTasks, ...(assignedTasks ?? [])] : unassignedTasks;
    return pool.filter((t) => {
      if (engineFilter !== "all" && t.engine !== engineFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [unassignedTasks, assignedTasks, engineFilter, priorityFilter, isEdit]);

  const initialSelected = useMemo(
    () => new Set((assignedTasks ?? []).map((t) => t.id)),
    [assignedTasks],
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const finalName = nameSelect === "Custom" ? customName.trim() : nameSelect;

  const save = async () => {
    if (!finalName) { toast.error("Project name required"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      name: finalName,
      description: description || null,
      engine: engine === "cross" ? null : (engine as any),
      release_date: releaseDate || null,
    };

    let projectId = project?.id;
    if (isEdit) {
      const { error } = await supabase.from("org_projects").update(payload).eq("id", project!.id);
      if (error) { toast.error(error.message); setBusy(false); return; }
    } else {
      const { data, error } = await supabase
        .from("org_projects")
        .insert({ ...payload, org_id: orgId, created_by: user?.id, status: "draft" })
        .select("id")
        .single();
      if (error || !data) { toast.error(error?.message ?? "Failed"); setBusy(false); return; }
      projectId = data.id;
    }

    // Reconcile task assignments
    const previouslyAssigned = new Set((assignedTasks ?? []).map((t) => t.id));
    const toAdd = Array.from(selected).filter((id) => !previouslyAssigned.has(id));
    const toRemove = Array.from(previouslyAssigned).filter((id) => !selected.has(id));

    if (toAdd.length > 0) {
      await supabase.from("org_tasks").update({ project_id: projectId }).in("id", toAdd);
      await supabase.from("task_activity_log").insert(
        toAdd.map((id) => ({
          task_id: id, org_id: orgId, action: "assigned_to_project" as const,
          performed_by: user?.id, new_value: finalName,
        })),
      );
    }
    if (toRemove.length > 0) {
      await supabase.from("org_tasks").update({ project_id: null }).in("id", toRemove);
      await supabase.from("task_activity_log").insert(
        toRemove.map((id) => ({
          task_id: id, org_id: orgId, action: "removed_from_project" as const,
          performed_by: user?.id, old_value: finalName,
        })),
      );
    }

    setBusy(false);
    toast.success(isEdit ? "Project updated" : "Project created");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="curve-eyebrow block mb-1.5">Project Name</label>
            <Select value={nameSelect} onValueChange={setNameSelect}>
              <SelectTrigger><SelectValue placeholder="Select a name…" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {PROJECT_NAME_SUGGESTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                <SelectItem value="Custom">Custom…</SelectItem>
              </SelectContent>
            </Select>
            {nameSelect === "Custom" && (
              <Input className="mt-2" placeholder="Custom project name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="curve-eyebrow block mb-1.5">Engine (optional)</label>
              <Select value={engine} onValueChange={setEngine}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cross">Cross-Engine</SelectItem>
                  {ENGINES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="curve-eyebrow block mb-1.5">Planned Release Date</label>
              <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="curve-eyebrow block mb-1.5">Description (optional)</label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="curve-eyebrow">Tasks ({selected.size} selected)</label>
              <div className="flex gap-2">
                <Select value={engineFilter} onValueChange={setEngineFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All engines</SelectItem>
                    {ENGINES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border border-border rounded-lg max-h-[240px] overflow-y-auto divide-y divide-border">
              {candidates.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4">No tasks match.</p>
              ) : (
                candidates.map((t) => (
                  <label key={t.id} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 cursor-pointer">
                    <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{t.engine} · {t.priority}{t.due_date ? ` · ${formatDate(t.due_date)}` : ""}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {busy ? "Saving…" : (isEdit ? "Save Changes" : "Create Project")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────── Release Modal ────────────────────────── */

function ReleaseProjectModal({
  project, orgName, activeCount, onClose, onReleased,
}: {
  project: ProjectWithTasks;
  orgName: string;
  activeCount: number;
  onClose: () => void;
  onReleased: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const release = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("project-action", {
      body: { type: "release", project_id: project.id },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Release failed");
    } else {
      toast.success(`Released — ${(data as any)?.tasks_activated ?? 0} tasks now live`);
      onReleased();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release {project.name} to {orgName}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">This will:</p>
          <ul className="space-y-1.5 text-foreground">
            <li>• Make <strong>{project.taskTotal}</strong> task{project.taskTotal === 1 ? "" : "s"} visible to the org immediately</li>
            <li>• Notify all org users that a new project is available</li>
            <li>• Move this project to Active status</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2">Currently active projects: <strong className="tabular-nums">{activeCount}</strong></p>
          {activeCount >= 3 && (
            <div className="p-3 rounded-lg border border-warning/40 bg-warning-soft text-xs">
              This org already has {activeCount} active projects. Consider whether they have capacity for another workstream before releasing.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={release} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {busy ? "Releasing…" : "Release Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────── Completion Modal ────────────────────────── */

const ENGINE_FIELD_MAP: Record<string, string> = {
  Pricing: "pricing_score", Sponsorship: "sponsorship_score", Apparel: "apparel_score",
  Events: "event_score", "Add-Ons": "addon_score", Retention: "retention_score",
  Facility: "facility_score", Affiliate: "affiliate_score",
};
const ENGINE_OPP_LOW: Record<string, string> = {
  Pricing: "pricing_opportunity_low", Sponsorship: "sponsorship_opportunity_low", Apparel: "apparel_opportunity_low",
  Events: "event_opportunity_low", "Add-Ons": "addon_opportunity_low", Retention: "retention_opportunity_low",
  Facility: "facility_opportunity_low", Affiliate: "affiliate_fee_opportunity_low",
};
const ENGINE_OPP_HIGH: Record<string, string> = {
  Pricing: "pricing_opportunity_high", Sponsorship: "sponsorship_opportunity_high", Apparel: "apparel_opportunity_high",
  Events: "event_opportunity_high", "Add-Ons": "addon_opportunity_high", Retention: "retention_opportunity_high",
  Facility: "facility_opportunity_high", Affiliate: "affiliate_fee_opportunity_high",
};

export function CompleteProjectModal({
  project, orgId, orgName, allProjects, onClose, onApproved,
}: {
  project: ProjectWithTasks;
  orgId: string;
  orgName: string;
  allProjects: ProjectWithTasks[];
  onClose: () => void;
  onApproved: () => void;
}) {
  const [metrics, setMetrics] = useState<any>(null);
  const [chosenNext, setChosenNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("derived_metrics").select("*").eq("org_id", orgId).maybeSingle();
      setMetrics(data);
    })();
  }, [orgId]);

  const drafts = allProjects.filter((p) => p.status === "draft");
  const activeEngines = new Set(allProjects.filter((p) => p.status === "active" && p.id !== project.id).map((p) => p.engine).filter(Boolean));

  // Suggest engine: lowest score among engines without an active project, with highest opportunity
  const suggestedEngine = useMemo(() => {
    if (!metrics) return null;
    const candidates = Object.keys(ENGINE_FIELD_MAP).filter((e) => !activeEngines.has(e as any));
    const scored = candidates.map((e) => ({
      engine: e,
      score: Number(metrics[ENGINE_FIELD_MAP[e]] ?? 99),
      oppLow: Number(metrics[ENGINE_OPP_LOW[e]] ?? 0),
      oppHigh: Number(metrics[ENGINE_OPP_HIGH[e]] ?? 0),
    })).filter((x) => x.oppHigh > 0);
    scored.sort((a, b) => a.score - b.score || b.oppHigh - a.oppHigh);
    return scored[0] ?? null;
  }, [metrics, activeEngines]);

  const suggestedDraft = suggestedEngine ? drafts.find((p) => p.engine === suggestedEngine.engine) : null;

  const releasedAt = project.released_at ? new Date(project.released_at) : null;
  const completedAt = new Date();
  const duration = releasedAt ? Math.max(0, Math.round((completedAt.getTime() - releasedAt.getTime()) / 86400000)) : null;

  const approve = async (releaseNextId: string | null) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("project-action", {
      body: { type: "approve_completion", project_id: project.id, release_next_project_id: releaseNextId },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Approval failed");
    } else {
      toast.success(releaseNextId ? "Project completed and next released" : "Project completed");
      onApproved();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Great work — {orgName} completed {project.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="curve-card bg-accent-soft/40 border-accent/30">
            <p className="curve-eyebrow mb-2">Completion summary</p>
            <ul className="text-sm space-y-1">
              <li>{project.taskComplete} tasks completed</li>
              {releasedAt && <li>Started: {formatDate(releasedAt.toISOString())} → Completed: {formatDate(completedAt.toISOString())}</li>}
              {duration !== null && <li>Duration: {duration} day{duration === 1 ? "" : "s"}</li>}
            </ul>
          </div>

          <div>
            <p className="curve-eyebrow mb-2">Recommended Next Project</p>
            {suggestedDraft ? (
              <div className="curve-card border-accent/40 space-y-3">
                <div>
                  <p className="font-semibold">{suggestedDraft.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Engine: {suggestedEngine!.engine} — Score: {suggestedEngine!.score}/10
                    {" · "}Opportunity: ${suggestedEngine!.oppLow.toLocaleString()}–${suggestedEngine!.oppHigh.toLocaleString()}
                    {" · "}Tasks ready: {suggestedDraft.taskTotal}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  {suggestedEngine!.engine} has the lowest engine score among open opportunities — this is the highest-leverage next move.
                </p>
                <Button
                  onClick={() => approve(suggestedDraft.id)}
                  disabled={busy}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  Release This Project
                </Button>
              </div>
            ) : suggestedEngine ? (
              <div className="curve-card border-warning/40 space-y-3">
                <p className="font-semibold">No draft project for {suggestedEngine.engine}</p>
                <p className="text-xs text-muted-foreground">
                  Engine score: {suggestedEngine.score}/10 · Opportunity: ${suggestedEngine.oppLow.toLocaleString()}–${suggestedEngine.oppHigh.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground italic">
                  Create a {suggestedEngine.engine} project to capture this opportunity.
                </p>
                <Button
                  variant="outline"
                  onClick={() => approve(null)}
                  disabled={busy}
                  className="w-full"
                >
                  Approve & Create Later
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No engine recommendation available.</p>
            )}
          </div>

          {drafts.filter((p) => p.id !== suggestedDraft?.id).length > 0 && (
            <div>
              <p className="curve-eyebrow mb-2">Or choose a different path</p>
              <div className="space-y-2">
                {drafts.filter((p) => p.id !== suggestedDraft?.id).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setChosenNext(chosenNext === p.id ? null : p.id)}
                    className={cn(
                      "w-full text-left curve-card p-3 transition-all",
                      chosenNext === p.id ? "border-accent ring-2 ring-accent/30" : "hover:border-accent/50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.engine ?? "Cross-Engine"} · {p.taskTotal} task{p.taskTotal === 1 ? "" : "s"}</p>
                      </div>
                      {chosenNext === p.id && <CheckCircle2 className="h-4 w-4 text-accent" />}
                    </div>
                  </button>
                ))}
              </div>
              {chosenNext && (
                <Button
                  onClick={() => approve(chosenNext)}
                  disabled={busy}
                  className="w-full mt-3 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  Release Selected Project
                </Button>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-border text-center">
            <button
              onClick={() => approve(null)}
              disabled={busy}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Close for now (approve completion without releasing next)
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────── Banner (used in OrgDetail) ────────────────────────── */

export function ProjectCompletionBanner({
  orgId, orgName, onApproved,
}: { orgId: string; orgName: string; onApproved: () => void }) {
  const [pending, setPending] = useState<ProjectWithTasks | null>(null);
  const [allProjects, setAllProjects] = useState<ProjectWithTasks[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from("org_projects").select("*").eq("org_id", orgId),
        supabase.from("org_tasks").select("*").eq("org_id", orgId),
      ]);
      const projs = (p as OrgProject[]) ?? [];
      const tasks = (t as OrgTask[]) ?? [];
      const enriched = projs.map((proj) => buildProjectWithTasks(proj, tasks));
      setAllProjects(enriched);
      setPending(enriched.find((proj) => proj.awaiting_completion_approval && proj.status === "active") ?? null);
    })();
  }, [orgId]);

  if (!pending) return null;

  return (
    <>
      <div className="mb-4 p-4 rounded-lg border border-accent/40 bg-accent-soft flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">🎉 {pending.name} is complete — all {pending.taskTotal} tasks finished</p>
          <p className="text-xs text-muted-foreground mt-0.5">Review and approve to close this project and release what's next</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          Approve & Continue
        </Button>
      </div>
      {modalOpen && (
        <CompleteProjectModal
          project={pending}
          orgId={orgId}
          orgName={orgName}
          allProjects={allProjects}
          onClose={() => setModalOpen(false)}
          onApproved={() => { setModalOpen(false); onApproved(); }}
        />
      )}
    </>
  );
}
