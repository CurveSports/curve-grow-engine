import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { toast } from "sonner";
import { ArrowLeft, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function AdminOrgTasks() {
  const { orgId } = useParams<{ orgId: string }>();
  const [orgName, setOrgName] = useState("");
  const [planActivatedAt, setPlanActivatedAt] = useState<string | null>(null);
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selected, setSelected] = useState<OrgTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = async () => {
    if (!orgId) return;
    const [{ data: org }, { data: t }, { data: m }, { data: tpl }] = await Promise.all([
      supabase.from("organizations").select("name, plan_activated_at").eq("id", orgId).maybeSingle(),
      supabase.from("org_tasks").select("*").eq("org_id", orgId).order("priority").order("due_date"),
      supabase.from("derived_metrics").select("*").eq("org_id", orgId).maybeSingle(),
      supabase.from("task_templates").select("*").order("engine"),
    ]);
    setOrgName((org as any)?.name ?? "");
    setPlanActivatedAt((org as any)?.plan_activated_at ?? null);
    setTasks((t as OrgTask[]) ?? []);
    setTemplates((tpl as TaskTemplate[]) ?? []);
    if (m) {
      const s: Record<string, number | null> = {};
      for (const [eng, field] of Object.entries(ENGINE_SCORE_FIELD)) s[eng] = (m as any)[field];
      setScores(s);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

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
    setActivating(true);
    const { data, error } = await supabase.functions.invoke("activate-action-plan", { body: { org_id: orgId } });
    setActivating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Activation failed");
    } else {
      const d = data as any;
      toast.success(`Plan activated · ${d?.tasks_activated ?? 0} tasks now live`);
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

  return (
    <AppShell>
      <div className="mb-2">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Organizations</Link>
      </div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">{isReviewMode ? "Plan Review" : "Action Plan"}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{orgName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {planActivatedAt
              ? `Plan activated ${formatDate(planActivatedAt)}`
              : draftCount > 0
                ? `${draftCount} draft task${draftCount === 1 ? "" : "s"} awaiting review`
                : "Plan not activated yet"}
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

      {isReviewMode && (
        <>
          {/* Amber draft mode banner */}
          <div className="mb-6 p-4 rounded-lg border border-warning/40 bg-warning-soft">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">Draft Plan — Not visible to org until activated</p>
                <p className="text-sm text-muted-foreground">Tasks are in draft mode and only visible to Curve admins. Org users will see nothing until you activate the plan.</p>
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
              Review, edit, or remove tasks below. New tasks added manually will join the draft plan. Click <strong>Activate Plan</strong> when ready to publish.
            </p>
          </div>
        </>
      )}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        tasks.length === 0 ? (
          <div className="curve-card text-center py-16">
            <p className="text-muted-foreground mb-4">{planActivatedAt ? "No tasks yet — add one to get started." : "No tasks yet. They'll be auto-generated when this org completes intake."}</p>
          </div>
        ) : (
          <TaskList tasks={tasks} scores={scores} onSelect={setSelected} showPlanStatus />
        )
      )}

          {/* Full-width Activate Plan button at bottom for review mode */}
          <div className="mt-8 pt-6 border-t">
            <Button
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => setConfirmOpen(true)}
              disabled={activating}
            >
              {activating ? "Activating…" : `Activate Plan for ${orgName}`}
            </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            {draftCount} task{draftCount === 1 ? "" : "s"} will become visible to {orgName} immediately
          </p>
        </div>
      )}

      <TaskDetailPanel task={selected} open={!!selected} onClose={() => setSelected(null)} isAdmin={true} onChanged={load} />

      {/* Confirmation modal */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate this plan for {orgName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be notified immediately and tasks will become visible. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm Activation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
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
    // If plan is already active, manually-added tasks go straight to active.
    // While in draft review, manually-added tasks join the draft plan.
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
      <Button onClick={save} disabled={busy}>Add task</Button>
    </div>
  );
}
