import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import TaskList from "@/components/tasks/TaskList";
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrgTask, TaskTemplate, ENGINES, TASK_TYPES, ENGINE_SCORE_FIELD } from "@/lib/tasks";
import type { OrgProject } from "@/lib/projects";
import AdminTasksByProject from "@/components/admin/AdminTasksByProject";
import { toast } from "sonner";
import { ArrowLeft, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import BaselineModal from "@/components/sponsorship/BaselineModal";
import { formatDate } from "@/lib/format";

export default function AdminOrgTasks({ bare = false, orgIdProp }: { bare?: boolean; orgIdProp?: string } = {}) {
  const params = useParams<{ orgId: string }>();
  const orgId = orgIdProp ?? params.orgId;
  const [orgName, setOrgName] = useState("");
  const [planActivatedAt, setPlanActivatedAt] = useState<string | null>(null);
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [selected, setSelected] = useState<OrgTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [baselineOpen, setBaselineOpen] = useState(false);

  const load = async () => {
    if (!orgId) return;
    const [{ data: org }, { data: t }, { data: m }, { data: tpl }, { data: pj }] = await Promise.all([
      supabase.from("organizations").select("name, plan_activated_at").eq("id", orgId).maybeSingle(),
      supabase.from("org_tasks").select("*").eq("org_id", orgId).order("priority").order("due_date"),
      supabase.from("derived_metrics").select("*").eq("org_id", orgId).maybeSingle(),
      supabase.from("task_templates").select("*").order("engine"),
      supabase.from("org_projects").select("*").eq("org_id", orgId).order("display_order").order("created_at"),
    ]);
    setOrgName((org as any)?.name ?? "");
    setPlanActivatedAt((org as any)?.plan_activated_at ?? null);
    setTasks((t as OrgTask[]) ?? []);
    setTemplates((tpl as TaskTemplate[]) ?? []);
    setProjects((pj as OrgProject[]) ?? []);
    if (m) {
      const s: Record<string, number | null> = {};
      for (const [eng, field] of Object.entries(ENGINE_SCORE_FIELD)) s[eng] = (m as any)[field];
      setScores(s);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const [searchParams] = useSearchParams();
  // Legacy support: if URL still has ?engine=, scroll to that engine block within the project view.
  const engineParam = searchParams.get("engine");
  useEffect(() => {
    if (loading || !engineParam) return;
    const el = document.getElementById(`engine-${engineParam}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-accent");
      setTimeout(() => el.classList.remove("ring-2", "ring-accent"), 2000);
    }
  }, [loading, engineParam, tasks]);

  const draftCount = useMemo(() => tasks.filter(t => t.plan_status === "draft").length, [tasks]);

  // Per-engine summary (used while reviewing draft plan)
  const draftByEngine = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of tasks) {
      if (t.plan_status !== "draft") continue;
      out[t.engine] = (out[t.engine] ?? 0) + 1;
    }
    return out;
  }, [tasks]);

  const handleActivate = async () => {
    setConfirmOpen(false);
    // First-time activation requires baseline confirmation.
    if (!planActivatedAt) { setBaselineOpen(true); return; }
    await runActivation();
  };

  const runActivation = async (baseline?: number, reason?: string | null) => {
    setActivating(true);
    if (baseline !== undefined && orgId) {
      // Persist baseline first
      const { data: metrics } = await supabase.from("derived_metrics").select("calculated_total_revenue").eq("org_id", orgId).maybeSingle();
      const calc = (metrics?.calculated_total_revenue ?? null) as number | null;
      const wasAdjusted = calc !== null && Math.abs(baseline - calc) > 0.5;
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (uid) {
        await supabase.from("org_engagement_baselines").upsert({
          org_id: orgId,
          baseline_revenue: baseline,
          baseline_set_by: uid,
          original_calculated_revenue: calc,
          was_manually_adjusted: wasAdjusted,
          adjustment_reason: reason,
        }, { onConflict: "org_id" });
        await supabase.from("organizations").update({
          plan_activated_revenue: baseline,
          engagement_baseline_set: true,
        }).eq("id", orgId);
      }
    }
    const { data, error } = await supabase.functions.invoke("activate-action-plan", { body: { org_id: orgId } });
    setActivating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Approval failed");
    } else {
      const d = data as any;
      toast.success(`Plan approved · ${d?.draft_count ?? 0} tasks ready to organize into projects`);
      load();
    }
  };

  const handleTopUp = async () => {
    setToppingUp(true);
    const { data, error } = await supabase.functions.invoke("activate-action-plan", { body: { org_id: orgId, mode: "topup" } });
    setToppingUp(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Top-up failed");
    } else {
      const d = data as any;
      if ((d?.added ?? 0) === 0) toast.info("No new template tasks to add");
      else toast.success(`Added ${d.added} draft task${d.added === 1 ? "" : "s"} for review`);
      load();
    }
  };

  const isReviewMode = !planActivatedAt && draftCount > 0;

  // Get score badge color based on score
  const getScoreBadgeClasses = (score: number | null) => {
    if (score === null) return "bg-muted text-muted-foreground border-transparent";
    if (score <= 3) return "bg-destructive/15 text-destructive border-destructive/30";
    if (score <= 6) return "bg-warning/15 text-warning border-warning/30";
    if (score <= 7) return "bg-accent/15 text-accent border-accent/30";
    return "bg-muted text-muted-foreground border-transparent";
  };

  const Wrap = ({ children }: { children: any }) => bare ? <>{children}</> : <AppShell>{children}</AppShell>;
  return (
    <Wrap>
      {!bare && (
        <div className="mb-2">
          <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Organizations</Link>
        </div>
      )}
      {!bare && (
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">{isReviewMode ? "Plan Review" : "Action Plan"}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{orgName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {planActivatedAt
              ? `Recommended plan approved ${formatDate(planActivatedAt)} · release work in waves from the Projects tab`
              : draftCount > 0
                ? `${draftCount} draft task${draftCount === 1 ? "" : "s"} awaiting your review`
                : "Plan not approved yet"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={`/admin/org/${orgId}`}><Button variant="outline" size="sm">View Report</Button></Link>
          {planActivatedAt && (
            <Button variant="outline" size="sm" onClick={handleTopUp} disabled={toppingUp}>
              <RefreshCw className="h-4 w-4 mr-1" /> {toppingUp ? "Checking…" : "Re-run templates"}
            </Button>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm" variant={planActivatedAt ? "default" : "outline"}><Plus className="h-4 w-4 mr-1" /> Add task</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Add task to {orgName}</DialogTitle></DialogHeader>
              <AddTaskForm orgId={orgId!} templates={templates} planActive={!!planActivatedAt} onSaved={() => { setAddOpen(false); load(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      )}

      {isReviewMode && (
        <>
          {/* Amber draft mode banner */}
          <div className="mb-6 p-4 rounded-lg border border-warning/40 bg-warning-soft">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">Recommended Plan — Admin review</p>
                <p className="text-sm text-muted-foreground">These are the auto-generated recommendations. Review, edit, or remove tasks. Approving the plan unlocks the Projects tab so you can release work to the org in waves.</p>
              </div>
            </div>
          </div>

          {/* Engine summary cards */}
          <div className="mb-6">
            <p className="curve-eyebrow mb-4">Plan coverage by engine</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Object.entries(draftByEngine).map(([engine, count]) => (
                <div key={engine} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{engine}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getScoreBadgeClasses(scores[engine])}`}>
                      {scores[engine] ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tabular-nums">{count}</span>
                    <span className="text-xs text-muted-foreground">task{count === 1 ? "" : "s"}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Approving the plan does <strong>not</strong> send work to the org. Tasks become visible only when you release a project that contains them.
            </p>
          </div>
        </>
      )}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        tasks.length === 0 ? (
          <div className="curve-card text-center py-16">
            <p className="text-muted-foreground mb-4">{planActivatedAt ? "No tasks yet — add one to get started." : "No tasks yet. They'll be auto-generated when this org completes intake."}</p>
          </div>
        ) : (isReviewMode || projects.length === 0) ? (
          <TaskList tasks={tasks} scores={scores} onSelect={setSelected} showPlanStatus />
        ) : (
          <AdminTasksByProject
            projects={projects}
            tasks={tasks}
            scores={scores}
            orgId={orgId!}
            onSelect={setSelected}
            onChanged={load}
          />
        )
      )}

      {/* Full-width Approve Plan button at bottom for review mode */}
      {isReviewMode && (
        <div className="mt-8 pt-6 border-t">
          <Button
            size="lg"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => setConfirmOpen(true)}
            disabled={activating}
          >
            {activating ? "Approving…" : `Approve Recommended Plan for ${orgName}`}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Approving unlocks the Projects tab. Org users won't see anything until you release a project.
          </p>
        </div>
      )}

      <TaskDetailPanel task={selected} open={!!selected} onClose={() => setSelected(null)} isAdmin={true} onChanged={load} />

      {/* Confirmation modal */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve recommended plan for {orgName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the {draftCount} draft task{draftCount === 1 ? "" : "s"} as the approved recommendation and unlocks project releases. Nothing is sent to the org yet — release work in waves from the Projects tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Approve Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BaselineModal
        open={baselineOpen}
        onOpenChange={setBaselineOpen}
        orgId={orgId!}
        orgName={orgName}
        onConfirm={async (baseline, reason) => { await runActivation(baseline, reason); }}
      />
    </Wrap>
  );
}

function AddTaskForm({ orgId, templates, planActive, onSaved }: { orgId: string; templates: TaskTemplate[]; planActive: boolean; onSaved: () => void }) {
  const [templateId, setTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [engine, setEngine] = useState<string>("Operations");
  const [taskType, setTaskType] = useState<string>("Execute");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [admins, setAdmins] = useState<{ user_id: string; name: string }[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (!ids.length) { setAdmins([]); return; }
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      const list = ((profs ?? []) as any[])
        .map((p) => ({ user_id: p.user_id, name: p.full_name || p.email }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setAdmins(list);
    })();
  }, []);

  const toggleAssignee = (uid: string) => {
    setAssigneeIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find(x => x.id === id);
    if (t) {
      setTitle(t.title); setDescription(t.description);
      setEngine(t.engine); setTaskType(t.task_type);
      const d = new Date(); d.setDate(d.getDate() + t.suggested_days_to_complete);
      setDueDate(d.toISOString().slice(0, 10));
    }
  };

  const save = async () => {
    if (!title.trim() || !description.trim()) { toast.error("Title and description required"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const plan_status = planActive ? "active" : "draft";
    const { data: t, error } = await supabase.from("org_tasks").insert({
      org_id: orgId, template_id: templateId || null,
      title: title.trim(), description: description.trim(),
      engine: engine as any, task_type: taskType as any,
      priority: priority as any, due_date: dueDate || null, suggested_due_date: dueDate || null,
      plan_status: plan_status as any,
      assigned_by: user?.id,
    }).select("id").single();
    if (!error && t) {
      await supabase.from("task_activity_log").insert({ task_id: t.id, org_id: orgId, action: "created", performed_by: user?.id, new_value: `manually added (${plan_status})` });
      if (assigneeIds.size > 0) {
        const rows = Array.from(assigneeIds).map((uid) => ({
          task_id: t.id, user_id: uid, org_id: orgId, assigned_by: user?.id,
        }));
        const { error: aErr } = await supabase.from("org_task_assignees" as any).insert(rows as any);
        if (aErr) toast.error(`Task created, but assigning admins failed: ${aErr.message}`);
      }
    }
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Task added"); onSaved(); }
  };

  return (
    <div className="grid gap-3">
      <div>
        <label className="curve-eyebrow block mb-1.5">Use template (optional)</label>
        <Select value={templateId} onValueChange={applyTemplate}>
          <SelectTrigger><SelectValue placeholder="Select template…" /></SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.engine} · {t.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <Textarea placeholder="Description" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Select value={engine} onValueChange={setEngine}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ENGINES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
        <Select value={taskType} onValueChange={setTaskType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">high</SelectItem><SelectItem value="medium">medium</SelectItem><SelectItem value="low">low</SelectItem></SelectContent></Select>
        <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>

      <div>
        <label className="curve-eyebrow block mb-1.5">Curve admin assignees (optional)</label>
        {admins.length === 0 ? (
          <p className="text-xs text-muted-foreground">No Curve admins available.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-md border border-border bg-secondary/30 p-2">
            {admins.map((a) => {
              const active = assigneeIds.has(a.user_id);
              return (
                <button
                  key={a.user_id}
                  type="button"
                  onClick={() => toggleAssignee(a.user_id)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    active
                      ? "bg-accent/15 border-accent/40 text-foreground"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {active ? "✓ " : ""}{a.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Button onClick={save} disabled={busy}>Add task</Button>
    </div>
  );
}

