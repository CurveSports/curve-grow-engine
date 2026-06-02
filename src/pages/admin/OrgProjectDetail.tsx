import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Lock, Trash2, CheckCircle2, Circle, Loader2,
} from "lucide-react";
import {
  groupTasksByPhase, isPhaseUnlocked, PROJECT_STATUS_LABEL,
  PROJECT_STATUS_STYLE, type OrgProject,
} from "@/lib/projects";
import {
  TASK_PRIORITIES, TASK_STATUSES, STATUS_LABEL, type OrgTask,
} from "@/lib/tasks";
import TaskAssigneePicker from "@/components/tasks/TaskAssigneePicker";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function OrgProjectDetail() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<OrgProject | null>(null);
  const [orgName, setOrgName] = useState("");
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!projectId || !orgId) return;
    setLoading(true);
    const [{ data: p }, { data: t }, { data: o }] = await Promise.all([
      supabase.from("org_projects").select("*").eq("id", projectId).maybeSingle(),
      supabase.from("org_tasks").select("*").eq("project_id", projectId)
        .order("phase").order("display_order"),
      supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    ]);
    setProject((p as OrgProject) ?? null);
    setTasks(((t as OrgTask[]) ?? []));
    setOrgName((o as any)?.name ?? "");
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const phases = useMemo(() => groupTasksByPhase(tasks), [tasks]);
  const maxPhase = phases.length ? Math.max(...phases.map((p) => p.phase)) : 0;
  const completePct = tasks.length
    ? Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100)
    : 0;

  const addPhase = async () => {
    // No-op until a task gets added there; create a placeholder task at next phase.
    const nextPhase = maxPhase + 1;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("org_tasks").insert({
      org_id: orgId!, project_id: projectId!, title: `Phase ${nextPhase} task`,
      description: "", engine: "Platform", task_type: "Execute",
      source: "custom", phase: nextPhase, display_order: 0,
      assigned_by: user?.id ?? null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`Phase ${nextPhase} added`);
    load();
  };

  const deleteProject = async () => {
    if (!projectId) return;
    setDeleting(true);
    const { error: e1 } = await supabase.from("org_tasks")
      .update({ project_id: null }).eq("project_id", projectId);
    if (e1) { toast.error(e1.message); setDeleting(false); return; }
    const { error: e2 } = await supabase.from("org_projects").delete().eq("id", projectId);
    if (e2) { toast.error(e2.message); setDeleting(false); return; }
    toast.success("Project deleted. Tasks moved back to the task pool.");
    navigate(`/admin/org/${orgId}`);
  };

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading project…</div>;
  }
  if (!project) {
    return (
      <div className="p-8 space-y-3">
        <p className="text-sm text-muted-foreground">Project not found.</p>
        <Button asChild variant="outline"><Link to={`/admin/org/${orgId}`}>Back to org</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <Link
            to={`/admin/org/${orgId}`}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3 mr-1" /> {orgName || "Back"}
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
              PROJECT_STATUS_STYLE[project.status],
            )}>{PROJECT_STATUS_LABEL[project.status]}</span>
            <span className="text-xs text-muted-foreground">
              {tasks.length} task{tasks.length === 1 ? "" : "s"} · {completePct}% complete
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={addPhase}>
            <Plus className="h-4 w-4 mr-1" /> Add Phase
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete project
          </Button>
        </div>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${completePct}%` }} />
      </div>

      {phases.length === 0 && (
        <div className="curve-card p-6 text-sm text-muted-foreground text-center border-dashed">
          No tasks in this project yet.
        </div>
      )}

      {phases.map(({ phase, tasks: phaseTasks }) => {
        const unlocked = isPhaseUnlocked(tasks, phase);
        return (
          <PhaseSection
            key={phase}
            phase={phase}
            unlocked={unlocked}
            tasks={phaseTasks}
            orgId={orgId!}
            projectId={projectId!}
            maxPhase={maxPhase}
            onChanged={load}
          />
        );
      })}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              The project will be removed. Any tasks inside it will <strong>not</strong> be deleted —
              they go back into the org's task pool (unassigned to any project) so you can re-bundle
              them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProject}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ───────────────── Phase Section ───────────────── */

function PhaseSection({
  phase, unlocked, tasks, orgId, projectId, maxPhase, onChanged,
}: {
  phase: number; unlocked: boolean; tasks: OrgTask[];
  orgId: string; projectId: string; maxPhase: number; onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const addTask = async () => {
    if (!newTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("org_tasks").insert({
      org_id: orgId, project_id: projectId, title: newTitle.trim(),
      description: "", engine: "Platform", task_type: "Execute",
      source: "custom", phase, display_order: tasks.length,
      assigned_by: user?.id ?? null,
    } as any);
    if (error) { toast.error(error.message); return; }
    setNewTitle(""); setAdding(false); onChanged();
  };

  return (
    <div className={cn(
      "curve-card p-4 space-y-3",
      !unlocked && "bg-muted/30",
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base">Phase {phase}</h2>
          {!unlocked && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full">
              <Lock className="h-3 w-3" /> Locked — complete Phase {phase - 1} first
            </span>
          )}
          {unlocked && phase > 1 && (
            <span className="text-[11px] text-accent">Unlocked</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {tasks.filter((t) => t.status === "completed").length}/{tasks.length} complete
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            orgId={orgId}
            unlocked={unlocked}
            maxPhase={maxPhase}
            onChanged={onChanged}
          />
        ))}
      </div>

      {adding ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="New task title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") { setAdding(false); setNewTitle(""); } }}
          />
          <Button size="sm" onClick={addTask}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewTitle(""); }}>Cancel</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="border-dashed" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3 mr-1" /> Add task to Phase {phase}
        </Button>
      )}
    </div>
  );
}

/* ───────────────── Task Row ───────────────── */

function TaskRow({
  task, orgId, unlocked, maxPhase, onChanged,
}: {
  task: OrgTask; orgId: string; unlocked: boolean; maxPhase: number; onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const update = async (patch: Partial<OrgTask>) => {
    setSaving(true);
    const { error } = await supabase.from("org_tasks").update(patch as any).eq("id", task.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };

  const toggleComplete = async () => {
    if (task.status === "completed") {
      await update({ status: "not_started", completed_at: null, completed_by: null } as any);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: user?.id ?? null,
      } as any);
    }
  };

  const phaseOptions = Array.from({ length: Math.max(maxPhase, task.phase) + 1 }, (_, i) => i + 1);

  return (
    <div className={cn(
      "rounded-md border border-border bg-card p-3 space-y-2",
      task.status === "completed" && "opacity-70",
    )}>
      <div className="flex items-start gap-2">
        <button
          onClick={toggleComplete}
          disabled={saving || (!unlocked && task.status !== "completed")}
          title={!unlocked && task.status !== "completed" ? "Locked: complete earlier phase first" : ""}
          className={cn(
            "mt-0.5 flex-shrink-0",
            (!unlocked && task.status !== "completed") && "cursor-not-allowed",
          )}
        >
          {task.status === "completed"
            ? <CheckCircle2 className="h-5 w-5 text-accent" />
            : !unlocked
              ? <Lock className="h-5 w-5 text-muted-foreground" />
              : <Circle className="h-5 w-5 text-muted-foreground hover:text-accent" />}
        </button>
        <Input
          defaultValue={task.title}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== task.title) update({ title: v });
          }}
          className="h-8 text-sm font-medium"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-7">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Phase</label>
          <Select value={String(task.phase)} onValueChange={(v) => update({ phase: parseInt(v, 10) } as any)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {phaseOptions.map((p) => (
                <SelectItem key={p} value={String(p)}>Phase {p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Due date</label>
          <Input
            type="date"
            defaultValue={task.due_date ?? ""}
            onBlur={(e) => {
              const v = e.target.value || null;
              if (v !== task.due_date) update({ due_date: v } as any);
            }}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Priority</label>
          <Select value={task.priority} onValueChange={(v) => update({ priority: v as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</label>
          <Select value={task.status} onValueChange={(v) => update({ status: v as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pl-7 flex items-center justify-between gap-3 flex-wrap">
        <TaskAssigneePicker taskId={task.id} orgId={orgId} />
        {task.due_date && (
          <span className="text-[11px] text-muted-foreground">
            Due {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
}
